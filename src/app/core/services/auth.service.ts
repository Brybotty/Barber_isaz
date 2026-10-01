import { Injectable, inject, NgZone } from '@angular/core';
import { Auth, GoogleAuthProvider, User, authState, signInWithPopup, signOut } from '@angular/fire/auth';
import { Firestore, doc, onSnapshot, setDoc, getDoc } from '@angular/fire/firestore';
import { Observable, distinctUntilChanged, of, shareReplay, switchMap } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { CLIENTE } from '../../config/cliente';
import { esCelularValido, limpiarCelular } from '../utils/colombia';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  readonly user$ = authState(this.auth);

  /** Perfil del usuario en `usuarios/{uid}`. Compartido: un solo listener para toda la app. */
  readonly currentUserProfile$: Observable<Usuario | null> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      const userRef = doc(this.firestore, `usuarios/${user.uid}`);

      return new Observable<Usuario | null>(subscriber =>
        onSnapshot(userRef, { includeMetadataChanges: true }, (snapshot) => {
          // Solo el perfil que ya confirmó el servidor: en el primer inicio de sesión la copia local
          // llega antes, y las consultas del staff (cuyas reglas leen el rol) fallarían por un instante.
          if (snapshot.metadata.hasPendingWrites) return;
          this.ngZone.run(() => subscriber.next(snapshot.exists() ? snapshot.data() as Usuario : null));
        }, (error) => {
          this.ngZone.run(() => {
            console.error('Error leyendo el perfil de usuario:', error);
            subscriber.next(null);
          });
        })
      );
    }),
    // Con includeMetadataChanges llegan repeticiones sin cambios (caché → servidor): se descartan.
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Devuelve true si al perfil le falta el nombre. Apple, correo y celular están en AccesoService (solo el login). */
  async loginConGoogle(): Promise<boolean> {
    const { user } = await signInWithPopup(this.auth, new GoogleAuthProvider());
    return this.guardarPerfil(user);
  }

  /** Crea o actualiza `usuarios/{uid}` después de entrar con cualquier método. Devuelve true si falta el nombre. */
  async guardarPerfil(user: User): Promise<boolean> {
    const userRef = doc(this.firestore, `usuarios/${user.uid}`);
    const docSnap = await getDoc(userRef);
    const email = (user.email ?? '').toLowerCase();

    const datos: Partial<Usuario> = { uid: user.uid };
    // Las cuentas de celular no tienen correo: el campo se omite (las reglas solo aceptan el de la cuenta).
    if (email) datos.email = email;
    if (user.displayName) datos.nombre = user.displayName.slice(0, 80);

    if (!docSnap.exists()) {
      // Usuario nuevo: rol por defecto. Las reglas de Firestore solo permiten 'admin' al email configurado.
      datos.rol = email === CLIENTE.adminEmail ? 'admin' : 'cliente';
      datos.nombre ??= '';
      if (user.phoneNumber && esCelularValido(user.phoneNumber)) datos.telefono = limpiarCelular(user.phoneNumber);
    }
    // Prueba de la autorización de datos (el login muestra el aviso con la política).
    if (!docSnap.get('politicaAceptadaEn')) datos.politicaAceptadaEn = new Date().toISOString();
    // Si ya existe no se envía el rol: las reglas impiden que un usuario cambie el suyo.

    await setDoc(userRef, datos, { merge: true });
    return !(datos.nombre ?? docSnap.get('nombre'));
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
