import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ConfirmationResult, RecaptchaVerifier } from '@angular/fire/auth';
import { AccesoService } from '../../../core/services/acceso.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CLIENTE } from '../../../config/cliente';
import { esCelularValido, formatoCelular } from '../../../core/utils/colombia';
import { IconoComponent } from '../../../shared/components/icono/icono.component';
import { MarcaComponent } from '../../../shared/components/marca/marca.component';
import { SelloComponent } from '../../../shared/components/sello/sello.component';
import { LuzDirective } from '../../../shared/directives/luz.directive';

type Paso = 'metodos' | 'codigo' | 'enlace-enviado' | 'confirmar-correo' | 'nombre';
type Accion = '' | 'google' | 'apple' | 'sms' | 'codigo' | 'enlace' | 'nombre';

const NO_DISPONIBLE = 'Esta forma de entrar no está disponible por ahora. Prueba con otra o avísale a la barbería.';
const SIN_ROBOT = 'No pudimos comprobar que no eres un robot. Recarga la página e inténtalo de nuevo.';
const ENLACE_USADO = 'Este enlace ya se usó o venció. Pide uno nuevo.';
const ERRORES_LOGIN: Record<string, string> = {
  'auth/popup-blocked': 'Tu navegador bloqueó la ventana para iniciar sesión. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.',
  'auth/network-request-failed': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  'auth/unauthorized-domain': 'Este dominio aún no está autorizado para iniciar sesión. Avísale a la barbería.',
  'auth/unauthorized-continue-uri': 'Este dominio aún no está autorizado para iniciar sesión. Avísale a la barbería.',
  'auth/operation-not-allowed': NO_DISPONIBLE,
  'auth/admin-restricted-operation': NO_DISPONIBLE,
  'auth/too-many-requests': 'Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.',
  'auth/quota-exceeded': 'Por hoy se alcanzó el límite de mensajes. Entra con Google o con tu correo.',
  'auth/invalid-phone-number': 'Ese número no es válido. Escribe tu celular de 10 dígitos.',
  'auth/captcha-check-failed': SIN_ROBOT,
  'auth/invalid-app-credential': SIN_ROBOT,
  'auth/invalid-verification-code': 'El código no es correcto. Revísalo e inténtalo de nuevo.',
  'auth/code-expired': 'El código venció. Pide uno nuevo.',
  'auth/invalid-email': 'Ese correo no coincide o no es válido. Revísalo.',
  'auth/invalid-action-code': ENLACE_USADO,
  'auth/expired-action-code': ENLACE_USADO,
  'auth/account-exists-with-different-credential': 'Ya tienes una cuenta con ese correo. Entra de la forma que usaste la primera vez (por ejemplo, con Google).',
  'auth/invalid-credential': 'No pudimos verificar tu cuenta. Inténtalo de nuevo o entra de otra forma.',
  'auth/user-disabled': 'Esta cuenta está desactivada. Escríbele a la barbería.',
  'auth/web-storage-unsupported': 'Tu navegador bloquea lo que necesita el inicio de sesión. Prueba fuera del modo privado.',
};
/** Cerró la ventana de Google o Apple: no es un error que haya que mostrar. */
const CANCELADO = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconoComponent, MarcaComponent, RouterLink, SelloComponent, LuzDirective],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly cliente = CLIENTE;
  readonly acceso = CLIENTE.acceso ?? {};
  readonly formatoCelular = formatoCelular;
  authService = inject(AuthService);
  private accesos = inject(AccesoService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  paso: Paso = 'metodos';
  metodo: 'telefono' | 'correo' = this.acceso.telefono ? 'telefono' : 'correo';
  /** Acción en curso (deshabilita los botones y cambia su texto). */
  ocupado: Accion = '';
  /** Error o indicación para la persona, debajo del paso actual. */
  aviso = '';
  celular = '';
  codigo = '';
  correo = '';
  nombre = '';
  /** Segundos que faltan para poder pedir otro SMS o enlace. */
  esperaReenvio = 0;

  @ViewChild('recaptcha', { static: true }) private recaptcha!: ElementRef<HTMLElement>;
  private verificador?: RecaptchaVerifier;
  private confirmacion?: ConfirmationResult;
  private reloj?: ReturnType<typeof setInterval>;

  /** A dónde seguir después de entrar. Solo rutas internas ('/x', no '//dominio.com' ni '/\dominio.com'). */
  get volver(): string | null {
    const volver = this.route.snapshot.queryParamMap.get('volver');
    return volver && /^\/(?![/\\])/.test(volver) ? volver : null;
  }

  ngOnInit() {
    // Volvió desde el enlace del correo.
    if (this.accesos.esEnlaceDeAcceso()) {
      const correo = this.accesos.correoDelEnlace();
      if (correo) this.entrarConEnlace(correo);
      else this.paso = 'confirmar-correo';
    }
  }

  ngOnDestroy() {
    this.limpiarVerificador();
    clearInterval(this.reloj);
  }

  cambiarMetodo(metodo: 'telefono' | 'correo') {
    this.metodo = metodo;
    this.aviso = '';
  }

  volverAMetodos() {
    this.paso = 'metodos';
    this.aviso = '';
    this.codigo = '';
  }

  conGoogle() {
    return this.entrar('google', () => this.authService.loginConGoogle());
  }

  conApple() {
    return this.entrar('apple', () => this.accesos.loginConApple());
  }

  async enviarSms() {
    if (this.ocupado) return;
    if (!esCelularValido(this.celular)) {
      this.aviso = 'Escribe tu celular de 10 dígitos (empieza por 3).';
      return;
    }
    this.ocupado = 'sms';
    this.aviso = '';
    try {
      this.confirmacion = await this.accesos.enviarCodigo(this.celular, this.nuevoVerificador());
      this.codigo = '';
      this.paso = 'codigo';
      this.iniciarEspera();
      setTimeout(() => document.getElementById('codigo-sms')?.focus());
    } catch (error) {
      // Un verificador usado o fallido no sirve para otro intento: se crea uno nuevo la próxima vez.
      this.limpiarVerificador();
      this.mostrarError(error);
    } finally {
      this.ocupado = '';
    }
  }

  verificarCodigo() {
    this.codigo = this.codigo.replace(/\D/g, '');
    if (!/^\d{6}$/.test(this.codigo)) {
      this.aviso = 'Escribe los 6 dígitos del código.';
      return;
    }
    return this.entrar('codigo', () => this.accesos.confirmarCodigo(this.confirmacion!, this.codigo));
  }

  async enviarEnlace() {
    if (this.ocupado) return;
    const correo = this.correo.trim().toLowerCase();
    if (!CORREO_VALIDO.test(correo)) {
      this.aviso = 'Escribe un correo válido.';
      return;
    }
    this.ocupado = 'enlace';
    this.aviso = '';
    try {
      await this.accesos.enviarEnlace(correo, this.volver);
      this.correo = correo;
      this.paso = 'enlace-enviado';
      this.iniciarEspera();
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.ocupado = '';
    }
  }

  entrarConEnlace(correo = this.correo.trim().toLowerCase()) {
    if (!CORREO_VALIDO.test(correo)) {
      this.aviso = 'Escribe el correo al que pediste el enlace.';
      return;
    }
    return this.entrar('enlace', () => this.accesos.entrarConEnlace(correo));
  }

  async guardarNombre() {
    if (this.ocupado) return;
    const nombre = this.nombre.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (nombre.length < 2) {
      this.aviso = 'Escribe tu nombre.';
      return;
    }
    this.ocupado = 'nombre';
    this.aviso = '';
    try {
      await this.accesos.guardarNombre(nombre);
      await this.irAlDestino();
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.ocupado = '';
    }
  }

  /** Corre una forma de entrar y sigue: pide el nombre si la cuenta no lo trae, o va a donde iba. */
  private async entrar(accion: Accion, ingresar: () => Promise<boolean>) {
    if (this.ocupado) return;
    this.ocupado = accion;
    this.aviso = '';
    try {
      const faltaNombre = await ingresar();
      this.limpiarVerificador();
      if (faltaNombre) {
        // El enlace del correo es de un solo uso: se quita de la barra de direcciones (al recargar fallaría).
        if (accion === 'enlace') await this.router.navigate([], { queryParams: { volver: this.volver }, replaceUrl: true });
        this.paso = 'nombre';
        setTimeout(() => document.getElementById('nombre-perfil')?.focus());
        return;
      }
      await this.irAlDestino();
    } catch (error: any) {
      if (CANCELADO.includes(error?.code)) return;
      console.error('Error al iniciar sesión:', error);
      this.mostrarError(error);
      if (accion === 'enlace' && ['auth/invalid-action-code', 'auth/expired-action-code'].includes(error?.code)) {
        this.paso = 'metodos';
        this.metodo = 'correo';
        await this.router.navigate([], { queryParams: { volver: this.volver }, replaceUrl: true });
      }
    } finally {
      this.ocupado = '';
    }
  }

  private irAlDestino() {
    return this.router.navigateByUrl(this.volver ?? '/reservar', { replaceUrl: true });
  }

  private mostrarError(error: any) {
    this.aviso = ERRORES_LOGIN[error?.code] ?? 'No pudimos iniciar sesión. Inténtalo de nuevo en un momento.';
  }

  private iniciarEspera(segundos = 60) {
    clearInterval(this.reloj);
    this.esperaReenvio = segundos;
    this.reloj = setInterval(() => {
      if (--this.esperaReenvio <= 0) clearInterval(this.reloj);
    }, 1000);
  }

  /** reCAPTCHA no se puede volver a dibujar en el mismo elemento: cada intento usa uno nuevo. */
  private nuevoVerificador(): RecaptchaVerifier {
    this.limpiarVerificador();
    const elemento = document.createElement('div');
    this.recaptcha.nativeElement.appendChild(elemento);
    this.verificador = this.accesos.crearVerificador(elemento);
    return this.verificador;
  }

  private limpiarVerificador() {
    try { this.verificador?.clear(); } catch { /* ya estaba limpio */ }
    this.verificador = undefined;
    this.recaptcha?.nativeElement.replaceChildren();
  }
}
