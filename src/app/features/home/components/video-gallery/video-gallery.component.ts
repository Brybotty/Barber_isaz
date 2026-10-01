import { Component, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLIENTE } from '../../../../config/cliente';
import { RevelarDirective } from '../../../../shared/directives/revelar.directive';
import { IconoComponent } from '../../../../shared/components/icono/icono.component';
import { RedSocialComponent } from '../../../../shared/components/red-social/red-social.component';

const SCRIPT_INSTAGRAM = 'https://www.instagram.com/embed.js';

interface VentanaConInstagram extends Window {
  instgrm?: { Embeds: { process(): void } };
}

@Component({
  selector: 'app-video-gallery',
  standalone: true,
  imports: [RouterLink, RevelarDirective, IconoComponent, RedSocialComponent],
  template: `
    <section class="overflow-hidden py-16 sm:py-24 lg:py-32">
      <div class="mx-auto mb-8 grid max-w-7xl sm:mb-12 items-end gap-6 px-5 sm:px-8 lg:grid-cols-2" appRevelar>
        <div>
          <p class="rotulo" data-num="04">Galería</p>
          <h2 class="mt-4 font-display text-5xl font-black uppercase leading-[0.9] text-white sm:text-7xl">
            Trabajos <span class="font-acento text-[0.9em] font-normal normal-case italic text-detalle-300">recientes</span>
          </h2>
        </div>
        <div class="flex flex-col items-start gap-4 lg:items-end">
          <p class="max-w-md text-neutral-400 lg:text-right">Cortes y tatuajes publicados en Instagram. Dale play sin salir de la página.</p>
          <a [href]="cliente.instagram.url" target="_blank" rel="noopener" class="enlace-toque group text-sm font-bold text-neutral-200 transition-colors hover:text-white">
            <app-red-social red="instagram" class="h-4 w-4 text-pink-400" />
            Ver más en &#64;{{ cliente.instagram.usuario }}
            <app-icono nombre="externo" class="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" [grosor]="2" />
          </a>
        </div>
      </div>

      <!-- Carrusel en celular, cuadrícula en escritorio -->
      <div class="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 pt-4 scrollbar-hide sm:px-8 lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-3 lg:overflow-visible">
        @for (reel of cliente.reels; track reel; let i = $index) {
          <figure class="w-[max(328px,84vw)] max-w-[380px] shrink-0 snap-center sm:w-[370px] lg:w-auto lg:max-w-none" appRevelar [retraso]="i * 120">
            <div class="relative rounded-[1.5rem] border border-white/10 bg-neutral-900/80 p-px shadow-2xl sm:rounded-[1.75rem] sm:p-2 shadow-black/50 transition-transform duration-500 hover:-translate-y-1">
              <span class="absolute -top-3 left-6 z-10 rounded-full bg-acento-500 px-3 py-1 font-display text-xs font-bold tracking-wider text-sobre-acento">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <!-- Altura fija: el embed de Instagram crece al cargar y desplazaría el resto de la página -->
              <div class="relative h-[620px] overflow-hidden rounded-[1.45rem] bg-neutral-950 sm:h-[690px] sm:rounded-[1.25rem]">
                <!-- Mientras carga Instagram -->
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-600">
                  <app-red-social red="instagram" class="h-10 w-10 animate-pulse" />
                  <span class="text-xs font-semibold">Cargando publicación…</span>
                </div>
                <blockquote class="instagram-media relative" [attr.data-instgrm-permalink]="reel + '?utm_source=ig_embed&utm_campaign=loading'" data-instgrm-version="14"
                            style="background:transparent; border:0; margin:0; max-width:540px; min-width:280px; padding:0; width:100%;">
                  <a [href]="reel" target="_blank" rel="noopener" class="sr-only">Ver esta publicación en Instagram</a>
                </blockquote>
              </div>
            </div>
          </figure>
        }
      </div>

      @if (cliente.reels.length > 1) {
        <p class="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 lg:hidden">
          Desliza para ver las {{ cliente.reels.length }} publicaciones
          <app-icono nombre="flecha" class="h-3.5 w-3.5 animate-pulse text-acento-500" [grosor]="2" />
        </p>
      }

      <div class="mt-10 flex flex-col items-stretch justify-center gap-3 px-5 sm:mt-12 sm:flex-row sm:items-center" appRevelar>
        <a routerLink="/reservar" class="boton-oro !px-8 !py-4">
          Quiero este estilo <app-icono nombre="flecha" class="h-4 w-4" [grosor]="2" />
        </a>
        <a [href]="cliente.instagram.url" target="_blank" rel="noopener" class="boton-linea !px-8 !py-4">
          <app-red-social red="instagram" class="h-4 w-4" /> Seguir en Instagram
        </a>
      </div>
    </section>
  `
})
export class VideoGalleryComponent implements OnInit, OnDestroy {
  readonly cliente = CLIENTE;
  private el = inject(ElementRef<HTMLElement>);
  private zona = inject(NgZone);
  private observador?: IntersectionObserver;

  ngOnInit() {
    // El script de Instagram pesa: se pide solo cuando la galería está por aparecer.
    if (!('IntersectionObserver' in window)) {
      this.cargarInstagram();
      return;
    }
    this.zona.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(entradas => {
        if (entradas.some(e => e.isIntersecting)) {
          this.observador?.disconnect();
          this.cargarInstagram();
        }
      }, { rootMargin: '600px 0px' });
      this.observador.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy() {
    this.observador?.disconnect();
  }

  private cargarInstagram() {
    const ventana = window as VentanaConInstagram;
    // Si ya estaba cargado (p. ej. al volver al inicio), solo procesa los nuevos embeds.
    if (ventana.instgrm) {
      ventana.instgrm.Embeds.process();
      return;
    }
    if (document.querySelector(`script[src="${SCRIPT_INSTAGRAM}"]`)) return;
    const script = document.createElement('script');
    script.src = SCRIPT_INSTAGRAM;
    script.async = true;
    script.onload = () => ventana.instgrm?.Embeds.process();
    document.body.appendChild(script);
  }
}
