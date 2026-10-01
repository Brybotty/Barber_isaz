import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { Barbero, avatarDe } from '../../../core/models/barbero.model';
import { BarberosService } from '../../../core/services/barberos.service';
import { FotoStaff, FotosStaffService } from '../../../core/services/fotos-staff.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CLIENTE } from '../../../config/cliente';

@Component({
  selector: 'app-admin-barberos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="animate-in fade-in duration-500">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 class="text-3xl md:text-4xl font-black text-white">Staff de Barberos</h2>
          <p class="text-neutral-400 mt-2 text-lg">Registra y administra a los profesionales de tu barbería.</p>
        </div>
        <button (click)="toggleFormulario()" class="bg-acento-600 hover:bg-acento-500 text-sobre-acento font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-acento-500/20 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          {{ mostrarFormulario ? 'Cancelar' : 'Registrar Barbero' }}
        </button>
      </div>

      <!-- Formulario de Nuevo Barbero -->
      @if (mostrarFormulario) {
        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8 shadow-xl animate-in slide-in-from-top-4">
          <h3 class="text-xl font-black text-white mb-6">{{ editando ? 'Editar Barbero' : 'Datos del Barbero' }}</h3>
          <form (ngSubmit)="guardarBarbero()" class="space-y-4">

            <!-- Foto de perfil: se sube a Firebase Storage (carpeta Staff Barberos) y su enlace queda como avatar -->
            <div class="flex flex-col sm:flex-row gap-5 pb-4 border-b border-neutral-800">
              <div class="relative w-28 h-36 shrink-0 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950">
                <img [src]="avatarDe(nuevoBarbero)" alt="Vista previa de la foto" class="w-full h-full object-cover">
                @if (subiendoFoto) {
                  <div class="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2" role="status">
                    <span class="w-7 h-7 rounded-full border-2 border-acento-500 border-t-transparent animate-spin"></span>
                    <span class="text-[11px] font-bold text-neutral-300">Subiendo…</span>
                  </div>
                }
              </div>
              <div class="flex-1 min-w-0 space-y-3">
                <span class="etiqueta">Foto de perfil</span>
                <div class="flex flex-wrap gap-2">
                  <label class="cursor-pointer bg-acento-500 hover:bg-acento-400 text-sobre-acento text-sm font-black px-4 py-2.5 rounded-xl transition-colors focus-within:ring-2 focus-within:ring-acento-300"
                         [class.opacity-50]="subiendoFoto" [class.pointer-events-none]="subiendoFoto">
                    {{ subiendoFoto ? 'Subiendo…' : nuevoBarbero.avatar ? 'Cambiar foto' : 'Subir foto' }}
                    <input type="file" accept="image/*" class="sr-only" (change)="subirFoto($event)" [disabled]="subiendoFoto">
                  </label>
                  <button type="button" (click)="abrirGaleria()" [disabled]="cargandoGaleria || subiendoFoto"
                          class="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
                    {{ cargandoGaleria ? 'Cargando fotos…' : galeria ? 'Ocultar fotos' : 'Elegir de Staff Barberos' }}
                  </button>
                  @if (nuevoBarbero.avatar && !subiendoFoto) {
                    <button type="button" (click)="nuevoBarbero.avatar = ''" class="text-sm font-bold text-red-400 hover:bg-red-500/10 px-4 py-2.5 rounded-xl transition-colors">Quitar</button>
                  }
                </div>
                <p class="text-xs text-neutral-500">Se reduce, se comprime y se guarda en Firebase Storage (carpeta <span class="text-neutral-300">Staff Barberos</span>); el enlace se llena solo. Mejor vertical y con la cara centrada: así se ve en "Reservar".</p>
                <input type="url" [(ngModel)]="nuevoBarbero.avatar" name="avatar" class="campo text-xs" placeholder="…o pega el enlace de una foto" aria-label="Enlace de la foto">
              </div>
            </div>

            @if (galeria) {
              <div class="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 animate-in fade-in duration-300">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <span class="etiqueta mb-0">Fotos en Staff Barberos</span>
                  <span class="text-xs font-bold text-neutral-500">{{ galeria.length }} {{ galeria.length === 1 ? 'foto' : 'fotos' }}</span>
                </div>
                @if (galeria.length) {
                  <div class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
                    @for (foto of galeria; track foto.url) {
                      <button type="button" (click)="elegirFoto(foto)" [title]="foto.nombre" [attr.aria-label]="'Usar ' + foto.nombre"
                              class="relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all"
                              [ngClass]="nuevoBarbero.avatar === foto.url ? 'border-acento-500' : 'border-transparent hover:border-white/30'">
                        <img [src]="foto.url" [alt]="foto.nombre" loading="lazy" class="w-full h-full object-cover">
                        @if (nuevoBarbero.avatar === foto.url) {
                          <span class="absolute inset-x-0 bottom-0 bg-acento-500 text-sobre-acento text-[11px] font-black py-0.5">En uso</span>
                        }
                      </button>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-neutral-500">La carpeta está vacía. Sube la primera con "Subir foto".</p>
                }
              </div>
            }

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre Completo</label>
                <input type="text" [(ngModel)]="nuevoBarbero.nombre" name="nombre" required class="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-acento-500 transition-colors" placeholder="Ej. Anderson Garzón">
              </div>
              <div>
                <label class="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Especialidad (Bio corta)</label>
                <input type="text" [(ngModel)]="nuevoBarbero.especialidad" name="especialidad" class="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-acento-500 transition-colors" placeholder="Ej. Master en Hair Tattoo">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Email del usuario (Opcional)</label>
                <input type="email" [(ngModel)]="nuevoBarbero.emailAsociado" name="email" class="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-acento-500 transition-colors" placeholder="email@gmail.com">
                <p class="text-[11px] text-neutral-500 mt-1">Con su email de Google, su cuenta recibe el rol 'barbero' y ve sus citas en "Mi Panel". Si aún no ha iniciado sesión, el rol se asigna la próxima vez que abras esta pestaña.</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Comisión del barbero (%)</label>
                <input type="number" min="0" max="100" step="1" [(ngModel)]="nuevoBarbero.comision" name="comision" class="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-acento-500 transition-colors" placeholder="100">
                <p class="text-[11px] text-neutral-500 mt-1">Qué parte de cada servicio gana el barbero (ej. 60). Vacío = 100 %, como el dueño que también corta. Se usa en "Cortes y ganancias".</p>
              </div>
            </div>

            <div class="flex justify-end pt-4 border-t border-neutral-800">
              <button type="submit" [disabled]="isSubmitting || subiendoFoto" class="bg-acento-500 hover:bg-acento-400 disabled:opacity-50 text-sobre-acento font-black py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95">
                {{ isSubmitting ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Registrar Barbero' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Lista de Barberos -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (b of barberos$ | async; track b.id) {
          <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col items-center text-center relative group hover:border-neutral-700 transition-all">
            <div class="absolute top-4 right-4 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-all">
              <button (click)="editarBarbero(b)" title="Editar" class="text-neutral-500 hover:text-blue-400 p-2 bg-neutral-950 rounded-full hover:scale-110 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button (click)="eliminarBarbero(b)" title="Eliminar" class="text-neutral-500 hover:text-red-500 p-2 bg-neutral-950 rounded-full hover:scale-110 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
            
            <img [src]="avatarDe(b)" [alt]="b.nombre" class="w-24 h-24 rounded-full object-cover mb-4 border-4 border-neutral-950 shadow-xl">
            <h4 class="text-xl font-black text-white mb-1">{{ b.nombre }}</h4>
            <span class="text-xs font-bold text-acento-500 uppercase tracking-widest mb-1">{{ b.especialidad || 'Barbero' }}</span>
            <span class="text-[11px] font-bold text-detalle-300 mb-3">Comisión {{ b.comision ?? 100 }} %</span>
            
            @if (!b.emailAsociado) {
              <button (click)="editarBarbero(b)" class="mt-auto w-full text-xs font-bold text-acento-500 border border-dashed border-acento-500/30 hover:bg-acento-500/10 rounded-xl py-2 transition-colors">
                + Vincular email de Google
              </button>
            } @else {
              <div class="bg-neutral-950 w-full rounded-xl py-2 px-3 flex items-center justify-center gap-2 mt-auto border border-neutral-800">
                <svg class="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span class="text-xs text-neutral-400 font-medium truncate">{{ b.emailAsociado }}</span>
              </div>
            }
          </div>
        } @empty {
          <div class="col-span-full text-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
            <p class="mb-4">Aún no hay barberos registrados.</p>
            @if (cliente.equipo.length > 0) {
              <button (click)="cargarEquipo()" [disabled]="isSubmitting" class="bg-acento-500 hover:bg-acento-400 disabled:opacity-50 text-sobre-acento font-black py-3 px-6 rounded-xl transition-all">
                Cargar equipo de {{ cliente.nombre }} ({{ cliente.equipo.length }})
              </button>
              <p class="text-xs text-neutral-600 mt-3">Después agrega el email de Google de cada barbero para que vea sus citas.</p>
            }
          </div>
        }
      </div>

    </div>
  `
})
export class AdminBarberosComponent implements OnDestroy {
  private barberosService = inject(BarberosService);
  private fotos = inject(FotosStaffService);
  private notificaciones = inject(NotificationService);

  readonly avatarDe = avatarDe;
  readonly cliente = CLIENTE;

  mostrarFormulario = false;
  isSubmitting = false;
  /** Barbero que se está editando; null al registrar uno nuevo. */
  editando: Barbero | null = null;

  nuevoBarbero: Barbero = this.barberoVacio();

  subiendoFoto = false;
  cargandoGaleria = false;
  /** Fotos de la carpeta Staff Barberos; null mientras el selector está cerrado. */
  galeria: FotoStaff[] | null = null;
  /** Fotos subidas en este formulario y aún sin guardar: las que no queden como avatar se borran. */
  private subidasSinGuardar: string[] = [];

  barberos$ = this.barberosService.listar();

  constructor() {
    // Asigna el rol a barberos enlazados que iniciaron sesión después de ser registrados.
    this.barberos$.pipe(take(1)).subscribe({
      next: barberos => this.barberosService.sincronizarRoles(barberos)
        .catch(error => console.error('No se pudieron sincronizar los roles de barbero', error)),
      error: error => console.error('Error cargando barberos', error),
    });
  }

  private barberoVacio(): Barbero {
    return { nombre: '', especialidad: '', avatar: '', emailAsociado: '' };
  }

  ngOnDestroy() {
    this.limpiarSubidas();
  }

  toggleFormulario() {
    this.limpiarSubidas();
    this.galeria = null;
    this.mostrarFormulario = !this.mostrarFormulario;
    this.editando = null;
    this.nuevoBarbero = this.barberoVacio();
  }

  editarBarbero(barbero: Barbero) {
    this.limpiarSubidas();
    this.galeria = null;
    this.editando = barbero;
    this.nuevoBarbero = { ...barbero };
    this.mostrarFormulario = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async guardarBarbero() {
    if (!this.nuevoBarbero.nombre.trim()) return;
    // Vacío = sin comisión definida (100 %). Firestore no acepta undefined.
    const comision = Number(this.nuevoBarbero.comision);
    this.nuevoBarbero.comision = (this.nuevoBarbero.comision as unknown) === '' || this.nuevoBarbero.comision == null || !Number.isFinite(comision)
      ? null
      : Math.min(100, Math.max(0, Math.round(comision)));
    try {
      this.isSubmitting = true;
      if (this.editando) {
        await this.barberosService.actualizar(this.editando, this.nuevoBarbero);
      } else {
        await this.barberosService.crear(this.nuevoBarbero);
      }
      this.notificaciones.exito(this.editando ? 'Barbero actualizado' : 'Barbero registrado');
      this.limpiarSubidas(this.nuevoBarbero.avatar);
      this.galeria = null;
      this.mostrarFormulario = false;
      this.editando = null;
      this.nuevoBarbero = this.barberoVacio();
    } catch (e) {
      console.error(e);
      this.notificaciones.error('Error al guardar barbero');
    } finally {
      this.isSubmitting = false;
    }
  }

  /** Sube la foto elegida a Storage y deja su enlace como avatar (se guarda al pulsar "Guardar"). */
  async subirFoto(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.subiendoFoto = true;
    const formulario = this.nuevoBarbero;
    try {
      const url = await this.fotos.subir(archivo, formulario.nombre);
      // Si cerraron o cambiaron de formulario mientras subía, la foto ya no tiene dueño.
      if (formulario !== this.nuevoBarbero || !this.mostrarFormulario) {
        this.fotos.borrar(url).catch(error => console.warn('No se pudo borrar una foto sin usar', error));
        return;
      }
      this.subidasSinGuardar.push(url);
      this.nuevoBarbero.avatar = url;
      this.galeria = null;
    } catch (error) {
      console.error(error);
      this.notificaciones.error('No se pudo subir la foto', mensajeDeFoto(error));
    } finally {
      this.subiendoFoto = false;
    }
  }

  async abrirGaleria() {
    if (this.galeria) {
      this.galeria = null;
      return;
    }
    this.cargandoGaleria = true;
    try {
      this.galeria = await this.fotos.listar();
    } catch (error) {
      console.error(error);
      this.notificaciones.error('No se pudieron cargar las fotos', mensajeDeFoto(error));
    } finally {
      this.cargandoGaleria = false;
    }
  }

  elegirFoto(foto: FotoStaff) {
    this.nuevoBarbero.avatar = foto.url;
    this.galeria = null;
  }

  /** Borra de Storage las fotos subidas en este formulario que no quedaron como avatar (las de antes no se tocan). */
  private limpiarSubidas(conservar = '') {
    const sobrantes = this.subidasSinGuardar.filter(url => url !== conservar);
    this.subidasSinGuardar = [];
    for (const url of sobrantes) {
      this.fotos.borrar(url).catch(error => console.warn('No se pudo borrar una foto sin usar', error));
    }
  }

  /** Registra en el staff al equipo definido en la configuración del cliente. */
  async cargarEquipo() {
    try {
      this.isSubmitting = true;
      for (const miembro of this.cliente.equipo) {
        await this.barberosService.crear({
          nombre: miembro.apodo ? `${miembro.nombre} "${miembro.apodo}"` : miembro.nombre,
          especialidad: miembro.rol,
          avatar: miembro.foto ?? '',
          emailAsociado: '',
        });
      }
      this.notificaciones.exito('Equipo cargado', 'Agrega el email de cada barbero cuando lo tengas.');
    } catch (e) {
      console.error(e);
      this.notificaciones.error('No se pudo cargar el equipo');
    } finally {
      this.isSubmitting = false;
    }
  }

  async eliminarBarbero(barbero: Barbero) {
    if (!confirm('¿Estás seguro de eliminar a este profesional del equipo?')) return;
    try {
      await this.barberosService.eliminar(barbero);
    } catch (e) {
      console.error(e);
      this.notificaciones.error('Error al eliminar barbero');
    }
  }
}

/** Mensaje claro para los errores al subir o listar fotos (los de Storage traen un código "storage/..."). */
function mensajeDeFoto(error: unknown): string {
  const { code = '', message = '' } = (error ?? {}) as { code?: string; message?: string };
  if (code === 'storage/unauthorized') return 'Tu cuenta no tiene permiso para manejar fotos. Entra con la cuenta de administrador.';
  if (!navigator.onLine || code === 'storage/retry-limit-exceeded') return 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.';
  if (code === 'storage/quota-exceeded') return 'Se llenó el espacio de Storage del proyecto. Revisa el plan en la consola de Firebase.';
  if (!code.startsWith('storage/') && message) return message;
  return 'Inténtalo de nuevo en unos minutos.';
}
