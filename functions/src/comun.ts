/** Lo que comparten la tienda y los pagos: base de datos, forma del pedido y utilidades. */
import './opciones';
import { getFirestore } from 'firebase-admin/firestore';
import { Descuento, ItemPedido } from './pedidos';
import { EstadoPago } from './wompi';

export const db = getFirestore();

export interface Pedido {
  userId: string;
  cliente: { nombre: string; telefono: string; email: string; documento?: string };
  entrega: { tipo: 'recoger' | 'local' | 'nacional' };
  items: ItemPedido[];
  total: number;
  estado: string;
  stockDescontado?: Descuento[];
  stockDevuelto?: boolean;
  pago: { metodo: string; estado: EstadoPago; referencia?: string; intentos?: number; transaccionId?: string };
}

export const ID_VALIDO = /^[A-Za-z0-9]{10,40}$/;
export const ahora = () => new Date().toISOString();

export async function esAdmin(uid: string): Promise<boolean> {
  const perfil = await db.doc(`usuarios/${uid}`).get();
  return perfil.get('rol') === 'admin';
}
