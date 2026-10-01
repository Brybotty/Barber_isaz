/**
 * Cloud Functions de la barbería.
 *
 * - Tienda (tienda.ts): crearPedido y cancelarPedido. No usan secretos: siempre se despliegan.
 * - Correos de citas (avisos.ts): confirmación, cambio de horario, cancelación y recordatorio.
 *   Necesitan el secreto RESEND_API_KEY. Se cargan con ACTIVAR_CORREOS=true.
 * - Pago en línea con Wompi (pagos.ts). Necesitan WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET.
 *   Se cargan con ACTIVAR_PAGOS_EN_LINEA=true.
 *
 * Los interruptores van en functions/.env.<proyecto>. Existen porque la CLI de Firebase exige que
 * estén creados todos los secretos que declara el código, aunque se despliegue una sola función:
 * así la tienda funciona mientras no haya llaves de Resend ni de Wompi.
 */
import './opciones';

export { crearPedido, cancelarPedido } from './tienda';

if (process.env.ACTIVAR_CORREOS === 'true') Object.assign(module.exports, require('./avisos'));
if (process.env.ACTIVAR_PAGOS_EN_LINEA === 'true') Object.assign(module.exports, require('./pagos'));
