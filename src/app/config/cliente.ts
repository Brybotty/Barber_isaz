import { ConfigCliente } from './cliente.model';
import { ISAZA } from './clientes/isaza';

/** Cliente activo de este build. Para otra barbería, crea su archivo en clientes/ y cambia esta línea. */
export const CLIENTE: ConfigCliente = ISAZA;

const TIPOS_ICONO: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon' };

/** Aplica el tema del cliente al documento. Se llama antes de arrancar Angular. */
export function aplicarCliente(cliente: ConfigCliente = CLIENTE): void {
  const raiz = document.documentElement;
  for (const [tono, rgb] of Object.entries(cliente.tema.acento)) {
    raiz.style.setProperty(`--acento-${tono}`, rgb);
  }
  for (const tono of [200, 300, 400, 500, 600] as const) {
    raiz.style.setProperty(`--detalle-${tono}`, cliente.tema.detalle?.[tono] ?? cliente.tema.acento[tono]);
  }
  raiz.style.setProperty('--sobre-acento', cliente.tema.sobreAcento);
  raiz.style.setProperty('--fuente-display', cliente.tema.fuenteDisplay);
  raiz.style.setProperty('--fuente-acento', cliente.tema.fuenteAcento ?? cliente.tema.fuenteDisplay);

  if (cliente.tema.fuenteUrl && !document.querySelector(`link[href="${cliente.tema.fuenteUrl}"]`)) {
    const fuente = document.createElement('link');
    fuente.rel = 'stylesheet';
    fuente.href = cliente.tema.fuenteUrl;
    document.head.appendChild(fuente);
  }

  document.title = `${cliente.nombre} · ${cliente.ubicacion?.zona ?? cliente.descripcion}`;
  const icono = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icono) {
    icono.href = cliente.favicon;
    icono.type = TIPOS_ICONO[cliente.favicon.split('.').pop() ?? ''] ?? 'image/jpeg';
  }
}
