import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconoServicio, Servicio, iconoDe } from '../../core/models/servicio.model';
import { IconoComponent } from '../../shared/components/icono/icono.component';
import { ServiciosService } from '../../core/services/servicios.service';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';
import { RevelarDirective } from '../../shared/directives/revelar.directive';
import { CLIENTE } from '../../config/cliente';
import { enlaceWhatsApp } from '../../core/utils/colombia';

interface CategoriaServicios {
  nombre: string;
  icono: IconoServicio;
  servicios: Servicio[];
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CurrencyPipe, DuracionPipe, RevelarDirective, IconoComponent],
  templateUrl: './servicios.component.html'
})
export class ServiciosComponent {
  private router = inject(Router);
  private serviciosService = inject(ServiciosService);

  readonly cliente = CLIENTE;
  readonly whatsappTattoo = CLIENTE.whatsapp && CLIENTE.tatuajes ? enlaceWhatsApp(CLIENTE.whatsapp, CLIENTE.tatuajes.mensajeWhatsApp) : '';
  /** null mientras carga. */
  categorias: CategoriaServicios[] | null = null;

  constructor() {
    this.serviciosService.listar().pipe(takeUntilDestroyed()).subscribe({
      next: servicios => this.agruparCategorias(servicios),
      error: error => {
        console.error('Error cargando el catálogo de servicios', error);
        this.categorias = [];
      },
    });
  }

  private agruparCategorias(servicios: Servicio[]) {
    const porCategoria = new Map<string, Servicio[]>();
    // Dentro de cada categoría, de mayor a menor precio (como en el inicio).
    for (const s of [...servicios].sort((a, b) => b.precio - a.precio)) {
      const categoria = s.categoria || 'Otros';
      porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), s]);
    }
    this.categorias = [...porCategoria].map(([nombre, lista]) => ({
      nombre,
      // El ícono de la categoría es el de su primer servicio.
      icono: iconoDe(lista[0]),
      servicios: lista,
    }));
  }

  agendarServicio(servicio: Servicio) {
    this.router.navigate(['/reservar'], { state: { servicio } });
  }
}
