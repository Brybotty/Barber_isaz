import { Component, input } from '@angular/core';
import { CLIENTE } from '../../../config/cliente';

/**
 * Sello circular: el logo al centro y un texto que gira a su alrededor.
 * Es decorativo (aria-hidden); el texto real está en la página.
 */
@Component({
  selector: 'app-sello',
  standalone: true,
  host: { class: 'block aspect-square relative', 'aria-hidden': 'true' },
  template: `
    <!-- Halo -->
    <div class="absolute inset-[12%] rounded-full bg-acento-500/20 blur-3xl"></div>
    <!-- Texto en círculo -->
    <svg viewBox="0 0 200 200" class="absolute inset-0 w-full h-full animate-girar">
      <defs>
        <path id="sello-circulo" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
      </defs>
      <circle cx="100" cy="100" r="97" fill="none" stroke="rgb(var(--detalle-400) / 0.25)" stroke-width="0.6" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="rgb(var(--detalle-400) / 0.18)" stroke-width="0.6" />
      <text fill="rgb(var(--detalle-300))" style="font-family: var(--fuente-display); font-weight: 800; font-size: 13.2px; letter-spacing: 3.6px;">
        <!-- textLength reparte el texto justo en la vuelta completa (2π·82 ≈ 515) -->
        <textPath href="#sello-circulo" textLength="512" lengthAdjust="spacing">{{ texto() }}</textPath>
      </text>
    </svg>
    <!-- Logo -->
    @if (cliente.logo) {
      <img [src]="cliente.logo" alt="" class="absolute inset-[24%] w-[52%] h-[52%] drop-shadow-[0_0_40px_rgb(var(--acento-500)/0.35)]">
    }
  `,
})
export class SelloComponent {
  readonly cliente = CLIENTE;
  texto = input('BARBERÍA · TATTOO · GRANADA · CALI · RESERVA EN LÍNEA · ');
}
