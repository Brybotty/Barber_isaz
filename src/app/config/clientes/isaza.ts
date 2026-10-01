import { ConfigCliente } from '../cliente.model';

export const ISAZA: ConfigCliente = {
  id: 'isaza',
  nombre: 'Barbería & Tattoo Isaza',
  marca: { texto: 'ISAZA', destacado: '', subtitulo: 'Barbería & Tattoo' },
  logo: 'isaza-marca.svg',
  favicon: 'favicon.svg',
  descripcion: 'Barbería y estudio de tatuajes',
  hero: {
    // TODO: confirmar la frase con el cliente (es una propuesta).
    titulo: 'Cortes con carácter,',
    tituloDestacado: 'tinta con intención.',
    subtitulo: 'Barbería y tatuajes en Granada, Cali. Diagnóstico técnico, asesoría de imagen y un equipo que cuida cada detalle.',
  },
  instagram: { usuario: 'isazabarber', url: 'https://www.instagram.com/isazabarber' },
  // TODO: confirmar que este es el WhatsApp de la barbería (venía en la configuración original).
  whatsapp: '573217141454',
  reels: [
    'https://www.instagram.com/reel/DLSJAg4gi5o/',
    'https://www.instagram.com/p/DVrCxTkkTS-/',
    'https://www.instagram.com/reel/DQhhuK9EdC6/',
  ],
  equipo: [],
  // TODO: pedir el nombre del fundador y, si quiere, una frase suya y una foto.
  fundador: { rol: 'CEO y Fundador', instagram: 'isaza_barber_tattoo' },
  // TODO: confirmar con el cliente cómo cotiza los tatuajes.
  tatuajes: {
    titulo: 'Tatuajes a tu medida',
    descripcion: 'Cada diseño es único, por eso los tatuajes no se reservan en línea: se conversan. Cuéntanos tu idea y te asesoramos.',
    pasos: [
      { titulo: 'Envía tu idea', texto: 'Una referencia, la zona del cuerpo y el tamaño aproximado.' },
      { titulo: 'Te asesoramos', texto: 'Ajustamos el diseño contigo y te damos el valor.' },
      { titulo: 'Agendamos tu sesión', texto: 'Separamos el tiempo que necesita tu tatuaje.' },
    ],
    mensajeWhatsApp: 'Hola, quiero cotizar un tatuaje. Mi idea es: ',
  },
  ubicacion: {
    nombre: 'Barbería y Tatuajes Isaza',
    // TODO: pedir la dirección exacta (calle y número).
    direccion: 'Barrio Granada, Cali, Valle del Cauca',
    zona: 'Granada, Cali',
    mapaEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63720.89209895867!2d-76.61233815136724!3d3.4575778000000086!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e30a7ccf037662f%3A0x69f52b66c9c95e30!2sBARBERIA%20Y%20TATUAJES%20ISAZA%20Granada%20cali!5e0!3m2!1ses-419!2sco!4v1790838987346!5m2!1ses-419!2sco',
    // Mismo lugar del mapa (el cid sale del identificador 0x69f52b66c9c95e30 del embed).
    mapaUrl: 'https://www.google.com/maps?cid=7635056463748619824',
  },
  // TODO: confirmar el horario con el cliente.
  horario: { apertura: 10 * 60, cierre: 20 * 60, diasCerrados: [0] },
  // Precios y duraciones de su plataforma de reservas actual.
  catalogo: [
    { nombre: 'Corte + Barba', descripcion: 'Corte de cabello y arreglo de barba, con diagnóstico técnico y asesoría personalizada.', duracionMinutos: 90, precio: 110000, categoria: 'Combos', destacado: true, icono: 'poste' },
    { nombre: 'Corte + Barba + Limpieza facial', descripcion: 'Corte de cabello, arreglo de barba y limpieza facial profunda.', duracionMinutos: 120, precio: 150000, categoria: 'Combos', destacado: true, icono: 'corona' },
    { nombre: 'Corte', descripcion: 'Corte de cabello con diagnóstico técnico y asesoría personalizada para encontrar tu estilo.', duracionMinutos: 60, precio: 57000, categoria: 'Cabello', destacado: true, icono: 'tijeras' },
    { nombre: 'Corte niño', descripcion: 'Corte de cabello para niños, adaptado a su edad y personalidad.', duracionMinutos: 60, precio: 57000, categoria: 'Cabello', destacado: false, icono: 'peine' },
    { nombre: 'Barba', descripcion: 'Arreglo de barba con diagnóstico técnico y asesoría para el mejor perfilado.', duracionMinutos: 40, precio: 55000, categoria: 'Barba', destacado: true, icono: 'barba' },
  ],
  // Sin reseñas hasta tener reseñas reales del negocio (las de la plantilla eran de ejemplo).
  resenas: undefined,
  // Oculta hasta que el admin la active (necesita las Cloud Functions y el plan Blaze).
  tienda: { ciudad: 'Cali', departamento: 'Valle del Cauca' },
  // TODO: pedir al cliente razón social, NIT y un correo para datos personales.
  legal: { vigenteDesde: '1 de octubre de 2026' },
  tema: {
    // Dorado de Isaza, un poco más profundo que el ámbar original para que se vea más sobrio.
    acento: {
      50: '253 248 236', 100: '250 237 204', 200: '244 217 149', 300: '237 195 98', 400: '231 176 70',
      500: '217 154 43', 600: '185 123 30', 700: '147 93 26', 800: '119 74 27', 900: '98 61 26',
    },
    // Champaña para líneas, etiquetas y detalles finos.
    detalle: { 200: '246 229 190', 300: '238 210 150', 400: '228 190 115', 500: '210 166 88', 600: '176 134 62' },
    // Texto oscuro sobre el dorado (el blanco no tenía contraste suficiente).
    sobreAcento: '14 11 7',
    // Se cargan en src/index.html (antes que la app, para que el titular no cambie de letra al cargar).
    fuenteDisplay: '"Big Shoulders Display", "Arial Narrow", sans-serif',
    fuenteAcento: '"Instrument Serif", Georgia, serif',
  },
  firebase: {
    apiKey: 'AIzaSyDopbsvkpX2q_JH0TeRsOzZQAkhzzMN3Bo',
    authDomain: 'isaza-barber.firebaseapp.com',
    projectId: 'isaza-barber',
    storageBucket: 'isaza-barber.firebasestorage.app',
    messagingSenderId: '557007077868',
    appId: '1:557007077868:web:ca14449c81786ce9d900c9',
    measurementId: 'G-V2JPK1ZRH5',
  },
  adminEmail: 'ortizgonzalesbryanalexander1@gmail.com',
  // Apple está habilitado en Firebase, pero sin las credenciales de Apple Developer (Services ID, Team ID, Key ID
  // y llave .p8) el botón falla: se enciende cuando estén cargadas en Authentication → Apple.
  acceso: { apple: false, telefono: true, correo: true },
  firma: { texto: 'ProjectRyann' },
};
