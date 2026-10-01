export interface Barbero {
  id?: string;
  nombre: string;
  especialidad: string;
  avatar: string;
  /** Email (en minúsculas) de la cuenta de Google del barbero. Enlaza este perfil con su usuario. */
  emailAsociado: string;
  /** Porcentaje de cada servicio que gana el barbero (0 a 100). Sin definir: 100 (p. ej. el dueño). */
  comision?: number | null;
}

const ESCAPE_XML: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };

/**
 * Foto del barbero o, si no tiene, sus iniciales en un círculo del color de la marca.
 * Se dibuja aquí mismo: un servicio externo de avatares recibiría el nombre de cada barbero.
 */
export function avatarDe(barbero: Pick<Barbero, 'avatar' | 'nombre'>): string {
  if (barbero.avatar) return barbero.avatar;
  const iniciales = barbero.nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
  const texto = iniciales.replace(/[<>&"']/g, c => ESCAPE_XML[c]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#d99a2b"/>`
    + `<text x="48" y="50" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#0e0b07" text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
