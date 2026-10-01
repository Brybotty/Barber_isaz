import { Injectable, inject } from '@angular/core';
import {
  Auth, ConfirmationResult, OAuthProvider, RecaptchaVerifier, isSignInWithEmailLink, sendSignInLinkToEmail,
  signInWithEmailLink, signInWithPhoneNumber, signInWithPopup, updateProfile,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { celularInternacional } from '../utils/colombia';

/** Correo al que se pidió el enlace de acceso (para no volver a pedirlo al abrirlo en este navegador). */
const CLAVE_CORREO = 'acceso-correo';

/**
 * Formas de entrar además de Google: Apple, enlace al correo y código por SMS.
 * Solo la usa la página de ingreso, así su código no pesa en el resto de la app.
 * Cada método devuelve true si al perfil le falta el nombre (el login lo pide antes de seguir).
 */
@Injectable({ providedIn: 'root' })
export class AccesoService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  /** Apple comparte el nombre solo la primera vez y deja ocultar el correo (llega uno de privaterelay.appleid.com). */
  async loginConApple(): Promise<boolean> {
    const proveedor = new OAuthProvider('apple.com');
    proveedor.addScope('email');
    proveedor.addScope('name');
    proveedor.setCustomParameters({ locale: 'es_ES' });
    const { user } = await signInWithPopup(this.auth, proveedor);
    return this.authService.guardarPerfil(user);
  }

  /** Firebase envía al correo un enlace de acceso que vuelve a /login (y de ahí a `volver`). */
  async enviarEnlace(correo: string, volver: string | null): Promise<void> {
    const destino = new URL('/login', location.origin);
    if (volver) destino.searchParams.set('volver', volver);
    await sendSignInLinkToEmail(this.auth, correo, { url: destino.toString(), handleCodeInApp: true });
    try { localStorage.setItem(CLAVE_CORREO, correo); } catch { /* sin almacenamiento: se pedirá el correo al volver */ }
  }

  esEnlaceDeAcceso(url = location.href): boolean {
    return isSignInWithEmailLink(this.auth, url);
  }

  /** Correo al que se pidió el enlace desde este navegador. Si lo abren en otro, hay que preguntarlo. */
  correoDelEnlace(): string | null {
    try { return localStorage.getItem(CLAVE_CORREO); } catch { return null; }
  }

  async entrarConEnlace(correo: string, url = location.href): Promise<boolean> {
    const { user } = await signInWithEmailLink(this.auth, correo, url);
    try { localStorage.removeItem(CLAVE_CORREO); } catch { /* nada que limpiar */ }
    return this.authService.guardarPerfil(user);
  }

  /** Verificador reCAPTCHA invisible: Firebase lo exige antes de enviar un SMS (frena los envíos automáticos). */
  crearVerificador(elemento: HTMLElement): RecaptchaVerifier {
    return new RecaptchaVerifier(this.auth, elemento, { size: 'invisible' });
  }

  /** Envía el código por SMS a un celular de Colombia (10 dígitos). */
  enviarCodigo(celular: string, verificador: RecaptchaVerifier): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(this.auth, celularInternacional(celular), verificador);
  }

  async confirmarCodigo(confirmacion: ConfirmationResult, codigo: string): Promise<boolean> {
    const { user } = await confirmacion.confirm(codigo);
    return this.authService.guardarPerfil(user);
  }

  /** Nombre de las cuentas que no lo traen (celular, correo y a veces Apple). */
  async guardarNombre(nombre: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No hay una sesión iniciada.');
    // También en la cuenta: Reservar y la tienda precargan el nombre desde ahí.
    await updateProfile(user, { displayName: nombre });
    await setDoc(doc(this.firestore, `usuarios/${user.uid}`), { nombre }, { merge: true });
  }
}
