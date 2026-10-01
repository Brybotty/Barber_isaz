/**
 * Pagos en línea con Wompi (Bancolombia). Usan secretos, por eso se cargan solo con
 * ACTIVAR_PAGOS_EN_LINEA=true en functions/.env.<proyecto> (ver index.ts).
 * - iniciarPagoWompi (callable): firma el monto del pedido y devuelve el enlace del checkout.
 * - confirmarPagoWompi (callable): al volver del checkout consulta la transacción en Wompi
 *   (por si el webhook tarda).
 * - webhookWompi (HTTP): recibe los eventos de Wompi. Es la fuente de verdad del estado del pago.
 * - simularPagoWompi (callable): SOLO en los emuladores, para la demo sin llaves reales.
 *
 * Configuración (ver README): WOMPI_PUBLIC_KEY en functions/.env.<proyecto> y los secretos
 * WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET con `firebase functions:secrets:set`.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import {
  ESTADO_WOMPI, EstadoPago, EventoWompi, TransaccionWompi, eventoValido, firmaIntegridad, pedidoDeReferencia, urlApi,
  urlCheckout,
} from './wompi';
import { conDefectos } from './pedidos';
import { ID_VALIDO, Pedido, ahora, db, esAdmin } from './comun';

// Mientras no sea una llave real (pub_test_... o pub_prod_...), el pago en línea responde "aún no está configurado".
const WOMPI_PUBLIC_KEY = defineString('WOMPI_PUBLIC_KEY', { description: 'Llave pública de Wompi (pub_test_... o pub_prod_...)', default: '' });
const WOMPI_INTEGRITY_SECRET = defineSecret('WOMPI_INTEGRITY_SECRET');
const WOMPI_EVENTS_SECRET = defineSecret('WOMPI_EVENTS_SECRET');

/** Pago simulado: solo con los emuladores y WOMPI_SIMULADO=true (functions/.env.demo-isaza). */
const pagoSimulado = () => process.env.FUNCTIONS_EMULATOR === 'true' && process.env.WOMPI_SIMULADO === 'true';

export const iniciarPagoWompi = onCall({ secrets: [WOMPI_INTEGRITY_SECRET] }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión para pagar.');

  const { pedidoId, origen } = (request.data ?? {}) as { pedidoId?: string; origen?: string };
  if (!pedidoId || !ID_VALIDO.test(pedidoId)) throw new HttpsError('invalid-argument', 'Pedido no válido.');
  if (!origen || !/^https?:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(origen)) throw new HttpsError('invalid-argument', 'Origen no válido.');

  const llavePublica = WOMPI_PUBLIC_KEY.value();
  if (!llavePublica.startsWith('pub_')) throw new HttpsError('failed-precondition', 'El pago en línea aún no está configurado.');

  const pedidoRef = db.doc(`pedidos/${pedidoId}`);
  const datos = await db.runTransaction(async tx => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) throw new HttpsError('not-found', 'No encontramos el pedido.');
    const pedido = snap.data() as Pedido;
    if (pedido.userId !== uid) throw new HttpsError('permission-denied', 'Este pedido no es tuyo.');
    if (pedido.pago.metodo !== 'en-linea') throw new HttpsError('failed-precondition', 'Este pedido no se paga en línea.');
    if (pedido.estado === 'cancelado') throw new HttpsError('failed-precondition', 'El pedido está cancelado.');
    if (pedido.pago.estado === 'aprobado') throw new HttpsError('failed-precondition', 'Este pedido ya está pagado.');

    const tienda = conDefectos((await tx.get(db.doc('ajustes/sitio'))).get('tienda'));
    if (!tienda.pagos.enLinea) throw new HttpsError('failed-precondition', 'El pago en línea está desactivado.');

    // Cada intento lleva su referencia: Wompi no admite repetirla.
    const intentos = (pedido.pago.intentos ?? 0) + 1;
    const referencia = `${pedidoId}-${intentos}`;
    tx.update(pedidoRef, {
      'pago.estado': 'pendiente',
      'pago.referencia': referencia,
      'pago.intentos': intentos,
      'pago.actualizadoEn': ahora(),
    });
    return { referencia, total: pedido.total, cliente: pedido.cliente };
  });

  if (pagoSimulado()) {
    return { url: `${origen}/tienda/pago-simulado/${pedidoId}` };
  }

  // El total lo calculó crearPedido con el catálogo: el navegador no puede cambiarlo.
  const montoCentavos = Math.round(datos.total * 100);
  return {
    url: urlCheckout({
      llavePublica,
      referencia: datos.referencia,
      montoCentavos,
      firma: firmaIntegridad(datos.referencia, montoCentavos, 'COP', WOMPI_INTEGRITY_SECRET.value()),
      redirectUrl: `${origen}/tienda/pedido/${pedidoId}`,
      cliente: {
        email: datos.cliente.email,
        nombre: datos.cliente.nombre,
        telefono: datos.cliente.telefono,
        documento: datos.cliente.documento,
      },
    }),
  };
});

export const confirmarPagoWompi = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const { pedidoId, transaccionId } = (request.data ?? {}) as { pedidoId?: string; transaccionId?: string };
  if (!pedidoId || !ID_VALIDO.test(pedidoId) || !transaccionId || !/^[\w-]{5,60}$/.test(transaccionId)) {
    throw new HttpsError('invalid-argument', 'Datos no válidos.');
  }

  const pedido = await db.doc(`pedidos/${pedidoId}`).get();
  if (!pedido.exists) throw new HttpsError('not-found', 'No encontramos el pedido.');
  if (pedido.get('userId') !== uid && !(await esAdmin(uid))) throw new HttpsError('permission-denied', 'Este pedido no es tuyo.');

  // Los pagos simulados ya quedaron aplicados; no existen en Wompi.
  if (pagoSimulado() && transaccionId.startsWith('SIM-')) return { estado: pedido.get('pago.estado') };

  // La consulta de una transacción en Wompi es pública (no usa llaves privadas).
  const respuesta = await fetch(`${urlApi(WOMPI_PUBLIC_KEY.value())}/transactions/${encodeURIComponent(transaccionId)}`);
  if (!respuesta.ok) throw new HttpsError('unavailable', 'No pudimos consultar el pago en Wompi.');
  const { data } = (await respuesta.json()) as { data: TransaccionWompi };
  if (pedidoDeReferencia(data?.reference) !== pedidoId) throw new HttpsError('invalid-argument', 'La transacción no es de este pedido.');

  return { estado: await aplicarTransaccion(data) };
});

export const webhookWompi = onRequest({ secrets: [WOMPI_EVENTS_SECRET] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Método no permitido');
    return;
  }
  const evento = req.body as EventoWompi;
  if (!eventoValido(evento, WOMPI_EVENTS_SECRET.value())) {
    logger.warn('Evento de Wompi con firma inválida', { event: evento?.event });
    res.status(401).send('Firma inválida');
    return;
  }
  if (evento.event !== 'transaction.updated') {
    res.status(200).send('Ignorado');
    return;
  }
  try {
    const estado = await aplicarTransaccion(evento.data['transaction'] as TransaccionWompi);
    res.status(200).json({ estado });
  } catch (error) {
    // Un 500 hace que Wompi reintente más tarde.
    logger.error('Error procesando el evento de Wompi', error);
    res.status(500).send('Error');
  }
});

/** Demo sin llaves reales: aprueba o rechaza el pago como lo haría Wompi. Solo en los emuladores. */
export const simularPagoWompi = onCall(async request => {
  if (!pagoSimulado()) throw new HttpsError('failed-precondition', 'El pago simulado solo existe en los emuladores.');
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const { pedidoId, aprobar, medio } = (request.data ?? {}) as { pedidoId?: string; aprobar?: boolean; medio?: string };
  if (!pedidoId || !ID_VALIDO.test(pedidoId)) throw new HttpsError('invalid-argument', 'Pedido no válido.');

  const snap = await db.doc(`pedidos/${pedidoId}`).get();
  const pedido = snap.data() as Pedido | undefined;
  if (!pedido || pedido.userId !== uid) throw new HttpsError('permission-denied', 'Este pedido no es tuyo.');
  if (!pedido.pago.referencia) throw new HttpsError('failed-precondition', 'Primero inicia el pago.');

  const transaccion: TransaccionWompi = {
    id: `SIM-${Date.now()}`,
    status: aprobar ? 'APPROVED' : 'DECLINED',
    reference: pedido.pago.referencia,
    amount_in_cents: Math.round(pedido.total * 100),
    currency: 'COP',
    payment_method_type: ['CARD', 'NEQUI', 'PSE', 'BANCOLOMBIA_TRANSFER'].includes(medio ?? '') ? medio : 'CARD',
  };
  return { transaccionId: transaccion.id, estado: await aplicarTransaccion(transaccion) };
});

/**
 * Lleva el estado de una transacción de Wompi al pedido. Es idempotente: el webhook y la
 * consulta al volver del checkout pueden aplicar la misma transacción sin problema.
 */
async function aplicarTransaccion(transaccion: TransaccionWompi): Promise<EstadoPago | null> {
  const pedidoId = pedidoDeReferencia(transaccion?.reference);
  if (!pedidoId) {
    logger.warn('Transacción con referencia desconocida', { referencia: transaccion?.reference });
    return null;
  }
  const pedidoRef = db.doc(`pedidos/${pedidoId}`);

  return db.runTransaction(async tx => {
    const snap = await tx.get(pedidoRef);
    if (!snap.exists) {
      logger.warn('Transacción de un pedido que no existe', { pedidoId, transaccion: transaccion.id });
      return null;
    }
    const pedido = snap.data() as Pedido;

    // Ya pagado con otra transacción: no dejar que un intento viejo lo cambie.
    if (pedido.pago.estado === 'aprobado' && pedido.pago.transaccionId && pedido.pago.transaccionId !== transaccion.id) {
      return pedido.pago.estado;
    }

    let estado = ESTADO_WOMPI[transaccion.status] ?? 'error';
    // Un rechazo de un intento anterior no debe pisar el intento en curso.
    if (estado !== 'aprobado' && pedido.pago.referencia && pedido.pago.referencia !== transaccion.reference) {
      return pedido.pago.estado;
    }
    const montoEsperado = Math.round(pedido.total * 100);
    if (estado === 'aprobado' && (transaccion.currency !== 'COP' || transaccion.amount_in_cents !== montoEsperado)) {
      logger.error('El monto pagado no coincide con el pedido', { pedidoId, pagado: transaccion.amount_in_cents, esperado: montoEsperado });
      estado = 'error';
    }

    tx.update(pedidoRef, {
      'pago.estado': estado,
      'pago.transaccionId': transaccion.id,
      'pago.medio': transaccion.payment_method_type ?? FieldValue.delete(),
      'pago.actualizadoEn': ahora(),
      // Pagado = confirmado; el admin lo ve listo para preparar.
      ...(estado === 'aprobado' && pedido.estado === 'pendiente' ? { estado: 'confirmado' } : {}),
    });
    return estado;
  });
}
