import { Component, input } from '@angular/core';
import { IconoComponent } from '../icono/icono.component';

/**
 * Cinta de palabras que se desplaza sin fin (se pausa al pasar el mouse).
 * La lista va duplicada para que el bucle no tenga salto; la copia queda oculta para lectores de pantalla.
 */
@Component({
  selector: 'app-marquesina',
  standalone: true,
  imports: [IconoComponent],
  host: { class: 'block overflow-hidden desvanecer-lados' },
  template: `
    <div class="group flex w-max animate-desfile hover:[animation-play-state:paused]" [style.--duracion]="duracion() + 's'">
      @for (copia of [0, 1]; track copia) {
        <ul class="flex shrink-0 items-center" [attr.aria-hidden]="copia === 1 ? 'true' : null">
          @for (item of items(); track item) {
            <li class="flex items-center gap-6 px-6 font-display font-extrabold uppercase tracking-[0.04em] whitespace-nowrap" [class]="claseTexto()">
              {{ item }}
              <app-icono nombre="destello" [relleno]="true" class="w-4 h-4 text-acento-500/80" />
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class MarquesinaComponent {
  items = input.required<string[]>();
  /** Segundos que tarda una vuelta completa. */
  duracion = input(40);
  claseTexto = input('text-2xl sm:text-3xl text-white/85');
}
