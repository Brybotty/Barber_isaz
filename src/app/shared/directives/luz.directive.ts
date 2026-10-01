import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Pone la posición del mouse en --luz-x / --luz-y (en px, relativas al elemento) para que el CSS
 * dibuje una luz que lo sigue (clases .luz y .borde-luz). Solo con mouse: en celulares no hace nada.
 * Uso: <section appLuz> … <div class="luz absolute inset-0"></div> … </section>
 */
@Directive({ selector: '[appLuz]', standalone: true })
export class LuzDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private zona = inject(NgZone);
  private cuadro = 0;
  private quitar?: () => void;

  ngOnInit() {
    const el = this.el.nativeElement as HTMLElement;
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    // Fuera de Angular: mover el mouse no debe disparar la detección de cambios.
    this.zona.runOutsideAngular(() => {
      const mover = (evento: PointerEvent) => {
        cancelAnimationFrame(this.cuadro);
        this.cuadro = requestAnimationFrame(() => {
          const caja = el.getBoundingClientRect();
          el.style.setProperty('--luz-x', `${evento.clientX - caja.left}px`);
          el.style.setProperty('--luz-y', `${evento.clientY - caja.top}px`);
        });
      };
      el.addEventListener('pointermove', mover, { passive: true });
      this.quitar = () => el.removeEventListener('pointermove', mover);
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.cuadro);
    this.quitar?.();
  }
}
