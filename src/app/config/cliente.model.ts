import { FirebaseOptions } from '@angular/fire/app';
import { Servicio } from '../core/models/servicio.model';

/** Escala de color como canales RGB separados por espacio ('245 158 11'), para usar con opacidad en Tailwind. */
export type Paleta = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

/** Color de detalle (toques sutiles: etiquetas, líneas, insignias). Mismo formato RGB que Paleta. */
export type PaletaDetalle = Record<200 | 300 | 400 | 500 | 600, string>;

export interface MiembroEquipo {
  nombre: string;
  apodo?: string;
  rol: string;
  /** Usuario de Instagram, sin '@'. */
  instagram?: string;
  /** Ruta en /public. */
  foto?: string;
  /** Punto de la foto que se mantiene a la vista (CSS object-position / transform-origin), p. ej. '40% center'. */
  fotoPosicion?: string;
  /** Acercamiento de la foto (1 = sin zoom), útil si la persona sale pequeña. */
  fotoZoom?: number;
}

export interface Resena {
  autor: string;
  texto: string;
  /** Clase de Tailwind para el círculo con la inicial. */
  color: string;
}

/** Fundador o dueño, destacado en el inicio. */
export interface Fundador {
  /** Sin nombre se muestra solo el rol y el usuario de Instagram. */
  nombre?: string;
  rol: string;
  /** Usuario de Instagram, sin '@'. */
  instagram: string;
  frase?: string;
}

/** Tatuajes: no se reservan en línea, se cotizan por WhatsApp (cada diseño es distinto). */
export interface SeccionTatuajes {
  titulo: string;
  descripcion: string;
  /** Pasos para cotizar, en orden. */
  pasos: { titulo: string; texto: string }[];
  /** Mensaje con el que se abre el chat de WhatsApp. */
  mensajeWhatsApp: string;
}

export interface HorarioAtencion {
  /** Minutos desde medianoche (10:00 -> 600). */
  apertura: number;
  cierre: number;
  /** 0 = domingo ... 6 = sábado. */
  diasCerrados: number[];
}

/** Todo lo que cambia de una barbería a otra. */
export interface ConfigCliente {
  id: string;
  nombre: string;
  /** Nombre en el header: `texto` normal y `destacado` en color de acento; `subtitulo` debajo, en itálica. */
  marca: { texto: string; destacado: string; subtitulo?: string };
  /** Ruta en /public. Si no hay, se muestra solo el nombre. */
  logo?: string;
  favicon: string;
  descripcion: string;
  hero: {
    /** Foto de respaldo del inicio cuando no hay mapa. */
    imagen?: string;
    titulo: string;
    /** Segunda línea del título, resaltada. */
    tituloDestacado: string;
    subtitulo: string;
    /** Logo grande del inicio (PNG transparente en /public). Si existe, reemplaza al título. */
    logo?: string;
    /** Frase bajo el logo del inicio (ej. '¡Energía, experiencia y calidad!'). */
    lema?: string;
  };
  instagram: { usuario: string; url: string };
  /** Número con indicativo y sin '+' (ej. 573001234567). Sin número se oculta el botón de WhatsApp. */
  whatsapp?: string;
  /** URLs de publicaciones o reels de Instagram para la galería del inicio. */
  reels: string[];
  equipo: MiembroEquipo[];
  fundador?: Fundador;
  tatuajes?: SeccionTatuajes;
  ubicacion?: {
    nombre: string;
    direccion: string;
    /** Barrio y ciudad, para textos cortos (ej. 'Granada, Cali'). */
    zona: string;
    mapaEmbedUrl: string;
    mapaUrl: string;
  };
  horario: HorarioAtencion;
  /** Catálogo inicial. El admin lo carga en Firestore desde "Servicios & Precios" cuando la colección está vacía. */
  catalogo: Servicio[];
  resenas?: { calificacion: string; items: Resena[] };
  /**
   * Tienda de productos. Arranca oculta hasta que el admin la activa en Admin → Ajustes
   * (los pedidos necesitan las Cloud Functions desplegadas, que requieren el plan Blaze).
   */
  tienda?: {
    /** Ciudad y departamento del domicilio local ('Cali', 'Valle del Cauca'). */
    ciudad: string;
    departamento: string;
    /** Muestra la tienda sin que el admin la active (solo si las funciones ya están desplegadas). */
    visiblePorDefecto?: boolean;
    /** Marca de la que el negocio es embajador o distribuidor. */
    aliada?: { nombre: string; instagram: string; descripcion: string };
  };
  /** Datos del responsable del tratamiento de datos (página /politica-de-datos). */
  legal: {
    /** Razón social o nombre del titular del negocio. Sin ella se usa `nombre`. */
    razonSocial?: string;
    /** NIT o cédula del responsable. */
    nit?: string;
    /** Correo para consultas y reclamos sobre datos personales. */
    correo?: string;
    /** Fecha desde la que rige la política (texto, ej. '30 de septiembre de 2026'). */
    vigenteDesde: string;
  };
  /** Valores iniciales de la sección de cursos. El admin los cambia en Admin → Ajustes. */
  cursos?: {
    url: string;
    titulo: string;
    descripcion: string;
    textoBoton: string;
    /** Foto de fondo del banner (ruta en /public). */
    imagen?: string;
  };
  tema: {
    acento: Paleta;
    /** Color de detalle; si falta se usa el de acento. Isaza: champaña. */
    detalle?: PaletaDetalle;
    /** Color del texto sobre botones de acento (RGB). */
    sobreAcento: string;
    fuenteDisplay: string;
    /** Fuente de acento (palabras sueltas en itálica). Si falta se usa fuenteDisplay. */
    fuenteAcento?: string;
    /** Hoja de Google Fonts para fuenteDisplay y fuenteAcento, si no son la fuente base. */
    fuenteUrl?: string;
  };
  /** Cada cliente debería tener su propio proyecto de Firebase. */
  firebase: FirebaseOptions;
  /** Cuenta que recibe el rol 'admin'. Debe coincidir con esEmailAdmin() en firestore.rules y storage.rules. */
  adminEmail: string;
  /**
   * Formas de entrar además de Google (cada una debe estar habilitada en Firebase → Authentication).
   * - apple: necesita el Services ID, el Team ID y la llave de Apple Developer cargados en Firebase.
   * - telefono: código por SMS (cada SMS se cobra en el plan Blaze; solo celulares de Colombia).
   * - correo: enlace de acceso al correo, sin contraseña (Firebase lo envía).
   */
  acceso?: { apple?: boolean; telefono?: boolean; correo?: boolean };
  /** Firma del desarrollador en el pie de página. */
  firma?: { texto: string; url?: string };
}
