import { Component, input } from '@angular/core';
import { CLIENTE } from '../../../config/cliente';

/** Logo y nombre del cliente activo. El tamaño y color del texto los hereda del contenedor. */
@Component({
  selector: 'app-marca',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-3 align-middle">
      @if (cliente.logo && conLogo()) {
        <img [src]="cliente.logo" [alt]="cliente.nombre" class="object-contain shrink-0" [class]="claseLogo()">
      }
      <span class="marca-texto flex flex-col leading-none">
        <span class="font-display font-black uppercase tracking-[0.06em]">{{ cliente.marca.texto }}<span class="text-acento-500">{{ cliente.marca.destacado }}</span></span>
        @if (conSubtitulo() && cliente.marca.subtitulo) {
          <span class="font-acento italic font-normal normal-case tracking-normal text-detalle-300 text-[0.42em] mt-1">{{ cliente.marca.subtitulo }}</span>
        }
      </span>
    </span>
  `
})
export class MarcaComponent {
  readonly cliente = CLIENTE;
  conLogo = input(true);
  conSubtitulo = input(false);
  claseLogo = input('w-10 h-10');
}
