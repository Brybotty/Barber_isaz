export interface Usuario {
  uid: string;
  /** Vacío mientras quien entró con celular o correo no lo ha escrito (el login lo pide). */
  nombre: string;
  /** Correo de la cuenta. Las cuentas de celular no tienen. */
  email?: string;
  rol: 'admin' | 'barbero' | 'cliente';
  telefono?: string;
  /** Cuándo autorizó el tratamiento de datos (al iniciar sesión por primera vez). */
  politicaAceptadaEn?: string;
}
