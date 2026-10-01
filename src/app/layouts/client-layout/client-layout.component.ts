import { Component, HostListener, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CLIENTE } from '../../config/cliente';
import { MarcaComponent } from '../../shared/components/marca/marca.component';
import { IconoComponent } from '../../shared/components/icono/icono.component';
import { RedSocialComponent } from '../../shared/components/red-social/red-social.component';
import { resumenHorario } from '../../core/utils/horario';
import { enlaceWhatsApp } from '../../core/utils/colombia';
import { DesplazamientoService } from '../../core/services/desplazamiento.service';
import { CarritoService } from '../../core/services/carrito.service';
import { AjustesService } from '../../core/services/ajustes.service';
import { CarritoPanelComponent } from '../../features/tienda/components/carrito-panel.component';

interface EnlaceNav {
  texto: string;
  ruta?: string;
  fragmento?: string;
  /** Enlace a otra página (se abre en una pestaña nueva). */
  externo?: string;
}

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, MarcaComponent, IconoComponent, RedSocialComponent, CarritoPanelComponent],
  template: `
    <a href="#contenido" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-acento-500 focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-sobre-acento">Saltar al contenido</a>

    @let perfil = auth.currentUserProfile$ | async;

    <!-- Barra flotante -->
    <header class="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div class="pointer-events-auto mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 rounded-full border pl-2 pr-2 xl:gap-3 transition-all duration-500"
           [ngClass]="conScroll || menuAbierto ? 'border-white/10 bg-neutral-950/85 shadow-2xl shadow-black/50 backdrop-blur-xl' : 'border-white/[0.06] bg-neutral-950/35 backdrop-blur-md'">

        <a routerLink="/" (click)="alNavegar({ texto: 'Inicio', ruta: '/' })" class="flex shrink-0 items-center rounded-full pl-1 pr-3 text-[1.6rem] text-white transition-opacity hover:opacity-85" aria-label="Inicio"
           [class.marca-compacta]="!!perfil">
          <app-marca claseLogo="w-10 h-10" />
        </a>

        <nav class="hidden items-center gap-0.5 lg:flex xl:gap-1" aria-label="Principal">
          @for (link of links(); track link.texto) {
            @if (link.externo) {
              <a [href]="link.externo" target="_blank" rel="noopener" class="inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-[13px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white xl:px-3.5">
                {{ link.texto }} <app-icono nombre="externo" class="h-3 w-3" [grosor]="2.2" />
              </a>
            } @else {
              <a [routerLink]="link.ruta" [fragment]="link.fragmento" (click)="alNavegar(link)" class="rounded-full px-2.5 py-2 text-[13px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white xl:px-3.5">{{ link.texto }}</a>
            }
          }
        </nav>

        <div class="flex items-center gap-1.5">
          @if (perfil; as user) {
            <div class="hidden items-center gap-1 md:flex">
              @if (user.rol === 'admin' || user.rol === 'barbero') {
                <a [routerLink]="user.rol === 'admin' ? '/admin' : '/barbero'" class="rounded-full border border-acento-500/30 px-3.5 py-2 text-xs font-bold text-acento-400 transition-colors hover:bg-acento-500/10">{{ user.rol === 'admin' ? 'Panel' : 'Mi panel' }}</a>
              }
              <a routerLink="/mis-citas" class="flex items-center gap-2.5 rounded-full border border-white/10 py-1 pl-1 pr-4 transition-colors hover:border-acento-500/40 hover:bg-white/[0.06]"
                 [attr.aria-label]="'Mis reservas (' + (user.nombre || 'mi cuenta') + ')'">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-acento-400 to-acento-700 text-xs font-black text-sobre-acento">{{ inicial(user.nombre) }}</span>
                <span class="flex flex-col text-left leading-tight">
                  <span class="max-w-[7rem] truncate text-[11px] font-semibold text-neutral-400">{{ (user.nombre || 'Mi cuenta').split(' ')[0] }}</span>
                  <span class="flex items-center gap-1 whitespace-nowrap text-[13px] font-bold text-white">
                    <app-icono nombre="calendario" class="h-3.5 w-3.5 text-acento-400" [grosor]="2" />
                    Mis reservas
                  </span>
                </span>
              </a>
              <button (click)="logout()" title="Cerrar sesión" aria-label="Cerrar sesión" class="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-white">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
            <a routerLink="/mis-citas" class="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 px-3 text-xs font-bold text-white transition-colors hover:border-acento-500/40 md:hidden">
              <app-icono nombre="calendario" class="h-4 w-4 text-acento-400" [grosor]="2" />
              Mis reservas
            </a>
          } @else {
            <a routerLink="/login" class="hidden rounded-full px-3.5 py-2 text-[13px] font-semibold text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white md:inline-block">Ingresar</a>
          }

          @if (tiendaActiva()) {
            <button type="button" (click)="carrito.abierto.set(true)" class="relative flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95" [attr.aria-label]="'Carrito (' + carrito.cantidad() + ')'">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              @if (carrito.cantidad() > 0) {
                <span class="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-acento-500 px-1 text-[11px] font-black text-sobre-acento ring-2 ring-neutral-950">{{ carrito.cantidad() }}</span>
              }
            </button>
          }

          <a routerLink="/reservar" class="boton-oro !hidden !px-5 !py-2.5 sm:!inline-flex">
            Reservar
            <app-icono nombre="calendario" class="h-4 w-4" [grosor]="2" />
          </a>

          <button (click)="menuAbierto = !menuAbierto" class="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95 lg:hidden"
                  [attr.aria-expanded]="menuAbierto" aria-controls="menu-movil" [attr.aria-label]="menuAbierto ? 'Cerrar menú' : 'Abrir menú'">
            <span class="relative block h-4 w-5">
              <span class="absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300" [ngClass]="menuAbierto ? 'top-[7px] rotate-45' : 'top-0.5'"></span>
              <span class="absolute left-0 top-[7px] h-0.5 w-5 rounded bg-current transition-opacity duration-200" [class.opacity-0]="menuAbierto"></span>
              <span class="absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300" [ngClass]="menuAbierto ? 'top-[7px] -rotate-45' : 'top-[13px]'"></span>
            </span>
          </button>
        </div>
      </div>

      <!-- Menú móvil -->
      @if (menuAbierto) {
        <div (click)="menuAbierto = false" aria-hidden="true" class="pointer-events-auto fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"></div>
        <div id="menu-movil" class="pointer-events-auto mx-auto mt-2 max-h-[calc(100svh-6rem)] max-w-6xl overflow-y-auto overscroll-contain rounded-[1.75rem] border border-white/10 bg-neutral-950/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 lg:hidden">
          @if (perfil; as user) {
            <div class="mb-4 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-4">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-acento-400 to-acento-700 font-black text-sobre-acento">{{ inicial(user.nombre) }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-white">{{ user.nombre || 'Mi cuenta' }}</p>
                <p class="truncate text-xs text-neutral-500">{{ user.email || user.telefono }}</p>
              </div>
              <button (click)="logout(); menuAbierto = false" class="min-h-10 rounded-full border border-red-500/25 px-4 text-xs font-bold text-red-400">Salir</button>
            </div>
            <div class="mb-4 flex flex-wrap gap-2">
              <a routerLink="/mis-citas" (click)="menuAbierto = false" class="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-acento-500/40 bg-acento-500/10 px-4 text-xs font-bold text-white">
                <app-icono nombre="calendario" class="h-4 w-4 text-acento-400" [grosor]="2" />
                Mis reservas
              </a>
              @if (tiendaActiva()) {
                <a routerLink="/mis-pedidos" (click)="menuAbierto = false" class="inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 text-xs font-bold text-neutral-200">Mis pedidos</a>
              }
              @if (user.rol === 'admin' || user.rol === 'barbero') {
                <a [routerLink]="user.rol === 'admin' ? '/admin' : '/barbero'" (click)="menuAbierto = false" class="inline-flex min-h-10 items-center rounded-full border border-acento-500/30 px-4 text-xs font-bold text-acento-400">{{ user.rol === 'admin' ? 'Panel' : 'Mi panel' }}</a>
              }
            </div>
          }
          <nav class="flex flex-col" aria-label="Menú">
            @for (link of links(); track link.texto; let i = $index) {
              @if (link.externo) {
                <a [href]="link.externo" target="_blank" rel="noopener" (click)="menuAbierto = false" class="flex items-center justify-between border-b border-white/[0.06] py-3.5 font-display text-3xl font-extrabold uppercase tracking-wide text-white animate-in fade-in slide-in-from-left-2 fill-mode-both" [style.animation-delay.ms]="i * 50">
                  {{ link.texto }} <app-icono nombre="externo" class="h-5 w-5 text-neutral-500" />
                </a>
              } @else {
                <a [routerLink]="link.ruta" [fragment]="link.fragmento" (click)="alNavegar(link)" class="flex items-center justify-between border-b border-white/[0.06] py-3.5 font-display text-3xl font-extrabold uppercase tracking-wide text-white animate-in fade-in slide-in-from-left-2 fill-mode-both" [style.animation-delay.ms]="i * 50">
                  {{ link.texto }} <app-icono nombre="flecha" class="h-5 w-5 text-acento-500" />
                </a>
              }
            }
          </nav>
          @if (!perfil) {
            <a routerLink="/login" (click)="menuAbierto = false" class="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-neutral-300">Ingresar a mi cuenta</a>
          }
          <a routerLink="/reservar" (click)="menuAbierto = false" class="boton-oro mt-4 w-full !py-4">Reservar turno</a>
        </div>
      }
    </header>

    <main id="contenido" class="flex-grow pt-[5.5rem]">
      <router-outlet></router-outlet>
    </main>

    <footer class="relative mt-auto overflow-hidden border-t border-white/10 bg-black">
      <div class="grano absolute inset-0"></div>
      <div class="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pb-8 pt-12 sm:grid-cols-2 sm:gap-12 sm:px-8 sm:pb-10 sm:pt-16 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <span class="text-4xl text-white"><app-marca claseLogo="w-14 h-14" [conSubtitulo]="true" /></span>
          <p class="mt-5 max-w-xs text-sm leading-relaxed text-neutral-400">{{ cliente.hero.subtitulo }}</p>
          <div class="mt-6 flex gap-2">
            <a [href]="cliente.instagram.url" target="_blank" rel="noopener" [attr.aria-label]="'Instagram de ' + cliente.nombre" class="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition-colors hover:border-detalle-400/50 hover:text-white">
              <app-red-social red="instagram" class="h-[18px] w-[18px]" />
            </a>
            @if (cliente.whatsapp) {
              <a [href]="whatsapp" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp" class="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition-colors hover:border-detalle-400/50 hover:text-white">
                <app-red-social red="whatsapp" class="h-[18px] w-[18px]" />
              </a>
            }
          </div>
        </div>
        <div>
          <h4 class="mb-4 text-[11px] font-extrabold uppercase tracking-[0.28em] text-detalle-400">Explora</h4>
          <ul class="grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-1 sm:gap-y-2.5">
            @for (link of links(); track link.texto) {
              @if (link.externo) {
                <li><a [href]="link.externo" target="_blank" rel="noopener" class="flex min-h-10 items-center text-neutral-300 transition-colors hover:text-white sm:inline sm:min-h-0">{{ link.texto }}</a></li>
              } @else {
                <li><a [routerLink]="link.ruta" [fragment]="link.fragmento" (click)="alNavegar(link)" class="flex min-h-10 items-center text-neutral-300 transition-colors hover:text-white sm:inline sm:min-h-0">{{ link.texto }}</a></li>
              }
            }
            <li><a routerLink="/reservar" class="flex min-h-10 items-center text-neutral-300 transition-colors hover:text-white sm:inline sm:min-h-0">Reservar turno</a></li>
            <li><a routerLink="/mis-citas" class="flex min-h-10 items-center text-neutral-300 transition-colors hover:text-white sm:inline sm:min-h-0">Mis reservas</a></li>
          </ul>
        </div>
        <div>
          <h4 class="mb-4 text-[11px] font-extrabold uppercase tracking-[0.28em] text-detalle-400">Horario</h4>
          <ul class="space-y-2.5 text-sm text-neutral-300">
            @for (fila of horario; track fila.dias) {
              <li class="flex justify-between gap-4 whitespace-nowrap sm:max-w-[15rem]"><span class="text-neutral-500">{{ fila.dias }}</span><span [class.text-neutral-500]="!fila.abierto">{{ fila.horas }}</span></li>
            }
          </ul>
        </div>
        <div>
          <h4 class="mb-4 text-[11px] font-extrabold uppercase tracking-[0.28em] text-detalle-400">Visítanos</h4>
          <ul class="space-y-2.5 text-sm text-neutral-300">
            @if (cliente.ubicacion; as ubicacion) {
              <li><a [href]="ubicacion.mapaUrl" target="_blank" rel="noopener" class="block py-1 transition-colors hover:text-white sm:py-0">{{ ubicacion.nombre }}<br><span class="text-neutral-500">{{ ubicacion.zona }}</span></a></li>
            }
            <li><a [href]="cliente.instagram.url" target="_blank" rel="noopener" class="flex min-h-10 items-center transition-colors hover:text-white sm:inline sm:min-h-0">&#64;{{ cliente.instagram.usuario }}</a></li>
            @if (cliente.fundador; as fundador) {
              <li><a [href]="'https://www.instagram.com/' + fundador.instagram" target="_blank" rel="noopener" class="flex min-h-10 flex-wrap items-center gap-x-1 transition-colors hover:text-white sm:inline sm:min-h-0">&#64;{{ fundador.instagram }} <span class="text-neutral-500">· {{ fundador.rol }}</span></a></li>
            }
          </ul>
        </div>
      </div>

      <!-- Nombre gigante en contorno -->
      <div aria-hidden="true" class="relative -mb-[2.2vw] select-none text-center font-display text-[27vw] font-black uppercase leading-[0.78] tracking-[0.02em] texto-contorno">{{ cliente.marca.texto }}</div>

      <div class="relative border-t border-white/10 bg-black/60">
        <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-6 text-center text-xs text-neutral-500 sm:flex-row sm:gap-3 sm:px-8 sm:text-left">
          <span>&copy; {{ anio }} {{ cliente.nombre }}. Todos los derechos reservados.</span>
          <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a routerLink="/politica-de-datos" class="flex min-h-10 items-center transition-colors hover:text-neutral-300 sm:min-h-0">Política de tratamiento de datos</a>
            @if (cliente.firma; as firma) {
              <span class="inline-flex items-center gap-1.5">Diseño y desarrollo
                @if (firma.url) {
                  <a [href]="firma.url" target="_blank" rel="noopener" class="font-bold text-neutral-300 transition-colors hover:text-acento-400">{{ firma.texto }}</a>
                } @else {
                  <span class="font-bold text-neutral-300">{{ firma.texto }}</span>
                }
              </span>
            }
          </div>
        </div>
      </div>
    </footer>

    <app-carrito-panel />
  `,
  host: {
    class: 'flex flex-col min-h-screen bg-neutral-950'
  }
})
export class ClientLayoutComponent {
  readonly cliente = CLIENTE;
  readonly anio = new Date().getFullYear();
  readonly horario = resumenHorario();
  readonly whatsapp = CLIENTE.whatsapp ? enlaceWhatsApp(CLIENTE.whatsapp) : '';
  readonly carrito = inject(CarritoService);
  private ajustes = inject(AjustesService).ajustes;
  readonly tiendaActiva = computed(() => this.ajustes().tienda.activa);

  readonly links = computed<EnlaceNav[]>(() => {
    const { tienda, cursos } = this.ajustes();
    return [
      { texto: 'Servicios', ruta: '/servicios' },
      ...(CLIENTE.tatuajes ? [{ texto: 'Tattoo', ruta: '/', fragmento: 'tattoo' }] : []),
      ...(tienda.activa ? [{ texto: 'Tienda', ruta: '/tienda' }] : []),
      { texto: 'Galería', ruta: '/', fragmento: 'galeria' },
      ...(CLIENTE.equipo.length > 0 ? [{ texto: 'Equipo', ruta: '/', fragmento: 'equipo' }] : []),
      { texto: 'Visítanos', ruta: '/', fragmento: 'contacto' },
      ...(cursos.activo && cursos.url ? [{ texto: 'Cursos', externo: cursos.url }] : []),
    ];
  });

  menuAbierto = false;
  conScroll = false;
  auth = inject(AuthService);
  router = inject(Router);
  private desplazamiento = inject(DesplazamientoService);

  @HostListener('window:scroll')
  alDesplazar() {
    this.conScroll = window.scrollY > 24;
  }

  @HostListener('document:keydown.escape')
  cerrarMenu() {
    this.menuAbierto = false;
  }

  inicial(nombre: string): string {
    return (nombre.trim()[0] ?? '?').toUpperCase();
  }

  /**
   * El routerLink navega; si ya estamos en el inicio y el enlace apunta a él, la URL
   * puede no cambiar (mismo #fragmento), así que el desplazamiento se hace aquí.
   */
  alNavegar(link: EnlaceNav) {
    this.menuAbierto = false;
    const enInicio = this.router.url.split(/[?#]/)[0] === '/';
    if (!enInicio || link.ruta !== '/') return;
    if (link.fragmento) this.desplazamiento.irASeccion(link.fragmento);
    else this.desplazamiento.irArriba();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
