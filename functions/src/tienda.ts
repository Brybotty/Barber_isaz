/**
 * Pedidos e inventario de la tienda (no usan secretos):
 * - crearPedido (callable): arma el pedido con los precios del catálogo, calcula el envío y
 *   descuenta el inventario, todo en una transacción (no se vende lo que no hay).
 * - cancelarPedido (callable): cancela y devuelve las unidades al inventario.
 */
import { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import {
  Descuento, ErrorPedido, MAX_PEDIDOS_PENDIENTES, Producto, conDefectos, costoEnvio, entregaActiva, metodosPara, moverStock,
  prepararItems, revisarCupo, validarSolicitud,
} from './pedidos';
import { ID_VALIDO, Pedido, ahora, db, esAdmin } from './comun';

/** Convierte los errores de negocio en mensajes para el cliente. */
function comoHttps(error: unknown): never {
  if (error instanceof ErrorPedido) throw new HttpsError('failed-precondition', error.message);
  throw error;
}

/** Mueve el stock de varios productos dentro de una transacción y registra los movimientos. */
function aplicarInventario(
  tx: Transaction,
  productos: Map<string, { ref: DocumentReference; datos?: Producto }>,
  cambios: Descuento[],
  signo: 1 | -1,
  movimiento: { tipo: 'venta' | 'cancelacion'; pedidoId: string },
) {
  const porProducto = new Map<string, Descuento[]>();
  for (const c of cambios) porProducto.set(c.productoId, [...(porProducto.get(c.productoId) ?? []), c]);

  for (const [productoId, lista] of porProducto) {
    const producto = productos.get(productoId);
    if (!producto?.datos?.controlStock) continue;
    const { campos, resultados } = moverStock(producto.datos, lista.map(c => ({ opcion: c.opcion, delta: signo * c.cantidad })));
    tx.update(producto.ref, campos);
    for (const r of resultados) {
      tx.set(db.collection('movimientosInventario').doc(), {
        productoId, producto: producto.datos.nombre, opcion: r.opcion, cantidad: r.delta, stockResultante: r.stockResultante,
        tipo: movimiento.tipo, pedidoId: movimiento.pedidoId, usuario: 'Tienda en línea', fecha: ahora(),
      });
    }
  }
}

async function leerProductos(tx: Transaction, ids: string[]) {
  const refs = [...new Set(ids)].filter(id => /^[A-Za-z0-9]{1,40}$/.test(id)).map(id => db.doc(`productos/${id}`));
  const snaps = refs.length ? await tx.getAll(...refs) : [];
  return new Map(snaps.map(s => [s.id, { ref: s.ref, datos: s.exists ? (s.data() as Producto) : undefined }]));
}

export const crearPedido = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión para hacer tu pedido.');

  try {
    const solicitud = validarSolicitud(request.data);
    const pedidoRef = db.collection('pedidos').doc();

    await db.runTransaction(async tx => {
      const pendientes = await tx.get(
        db.collection('pedidos').where('userId', '==', uid).where('estado', '==', 'pendiente').limit(MAX_PEDIDOS_PENDIENTES),
      );
      revisarCupo(pendientes.size);
      const ajustes = await tx.get(db.doc('ajustes/sitio'));
      const productos = await leerProductos(tx, solicitud.items.map(i => i.productoId));

      const tienda = conDefectos(ajustes.get('tienda'));
      if (!tienda.activa) throw new ErrorPedido('La tienda está cerrada en este momento.');
      if (!entregaActiva(solicitud.entrega.tipo, tienda)) throw new ErrorPedido('Esa forma de entrega ya no está disponible.');
      if (!metodosPara(solicitud.entrega.tipo, tienda).includes(solicitud.metodo)) {
        throw new ErrorPedido('Ese método de pago no está disponible para esta forma de entrega.');
      }

      const { items, subtotal, descuentos } = prepararItems(solicitud.items, new Map([...productos].map(([id, p]) => [id, p.datos])));
      const envio = costoEnvio(solicitud.entrega.tipo, subtotal, tienda);

      aplicarInventario(tx, productos, descuentos, -1, { tipo: 'venta', pedidoId: pedidoRef.id });
      tx.set(pedidoRef, {
        userId: uid,
        cliente: solicitud.cliente,
        entrega: solicitud.entrega,
        items,
        subtotal,
        envio,
        total: subtotal + envio,
        pago: { metodo: solicitud.metodo, estado: 'pendiente' },
        estado: 'pendiente',
        stockDescontado: descuentos,
        creadoEn: ahora(),
        autorizacionDatos: ahora(),
      });
    });

    logger.info('Pedido creado', { pedidoId: pedidoRef.id });
    return { pedidoId: pedidoRef.id };
  } catch (error) {
    comoHttps(error);
  }
});

export const cancelarPedido = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const { pedidoId } = (request.data ?? {}) as { pedidoId?: string };
  if (!pedidoId || !ID_VALIDO.test(pedidoId)) throw new HttpsError('invalid-argument', 'Pedido no válido.');
  const admin = await esAdmin(uid);
  const pedidoRef = db.doc(`pedidos/${pedidoId}`);

  await db.runTransaction(async tx => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) throw new HttpsError('not-found', 'No encontramos el pedido.');
    const pedido = snap.data() as Pedido;
    if (pedido.estado === 'cancelado') return;
    if (!admin) {
      if (pedido.userId !== uid) throw new HttpsError('permission-denied', 'Este pedido no es tuyo.');
      if (pedido.estado !== 'pendiente' || pedido.pago.estado === 'aprobado') {
        throw new HttpsError('failed-precondition', 'Ya estamos preparando tu pedido. Escríbenos para cancelarlo.');
      }
    }
    if (pedido.estado === 'entregado') throw new HttpsError('failed-precondition', 'Un pedido entregado no se puede cancelar.');

    const devolver = pedido.stockDevuelto ? [] : pedido.stockDescontado ?? [];
    const productos = await leerProductos(tx, devolver.map(d => d.productoId));
    aplicarInventario(tx, productos, devolver, 1, { tipo: 'cancelacion', pedidoId });
    tx.update(pedidoRef, { estado: 'cancelado', stockDevuelto: true, canceladoEn: ahora(), canceladoPor: admin ? 'admin' : 'cliente' });
  });
  return { ok: true };
});
