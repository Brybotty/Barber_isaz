import { Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe, CurrencyPipe, NgClass } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, interval, map, of, startWith } from 'rxjs';
import { RevelarDirective } from '../../shared/directives/revelar.directive';
import { LuzDirective } from '../../shared/directives/luz.directive';
import { Servicio } from '../../core/models/servicio.model';
import { Producto, sinExistencias, tieneOpciones } from '../../core/models/producto.model';
import { ServiciosService } from '../../core/services/servicios.service';
import { ProductosService } from '../../core/services/productos.service';
import { AjustesService } from '../../core/services/ajustes.service';
import { CarritoService } from '../../core/services/carrito.service';
import { estadoDelNegocio, formatearHora12, HORARIO } from '../../core/utils/horario';
import { enlaceWhatsApp } from '../../core/utils/colombia';
import { CLIENTE } from '../../config/cliente';
import { VideoGalleryComponent } from './components/video-gallery/video-gallery.component';
import { ProductoCardComponent } from '../tienda/components/producto-card.component';
import { ProductoDetalleComponent } from '../tienda/components/producto-detalle.component';
import { IconoComponent } from '../../shared/components/icono/icono.component';
import { RedSocialComponent } from '../../shared/components/red-social/red-social.component';
import { MarquesinaComponent } from '../../shared/components/marquesina/marquesina.component';
import { SelloComponent } from '../../shared/components/sello/sello.component';
import { DuracionPipe } from '../../shared/pipes/duracion.pipe';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RevelarDirective, LuzDirective, RouterLink, VideoGalleryComponent, AsyncPipe, NgClass, CurrencyPipe, DuracionPipe,
    ProductoCardComponent, ProductoDetalleComponent, IconoComponent, RedSocialComponent, MarquesinaComponent, SelloComponent,
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  private router = inject(Router);
  private carrito = inject(CarritoService);
  readonly ajustes = inject(AjustesService).ajustes;

  readonly cliente = CLIENTE;
  readonly estrellas = [1, 2, 3, 4, 5];
  readonly cinta = ['Corte', 'Barba', 'Limpieza facial', 'Tattoo', 'Diagnóstico técnico', 'Asesoría de imagen', CLIENTE.ubicacion?.zona ?? ''].filter(Boolean);

  /** "Abierto ahora…" o "Cerrado · abre…", actualizado cada minuto. */
  readonly estado = toSignal(interval(60_000).pipe(startWith(0), map(() => estadoDelNegocio())), { initialValue: estadoDelNegocio() });
  /** La semana completa, para resaltar el día de hoy. */
  readonly semana = [1, 2, 3, 4, 5, 6, 0].map(dia => ({
    dia,
    nombre: DIAS[dia],
    horas: HORARIO.diasCerrados.includes(dia) ? 'Cerrado' : `${formatearHora12(HORARIO.apertura)} – ${formatearHora12(HORARIO.cierre)}`,
    abierto: !HORARIO.diasCerrados.includes(dia),
  }));

  readonly whatsapp = CLIENTE.whatsapp ? enlaceWhatsApp(CLIENTE.whatsapp, `Hola, vengo de la página de ${CLIENTE.nombre}.`) : '';
  readonly whatsappTattoo = CLIENTE.whatsapp && CLIENTE.tatuajes ? enlaceWhatsApp(CLIENTE.whatsapp, CLIENTE.tatuajes.mensajeWhatsApp) : '';

  // URL fija de la configuración del cliente, no viene de usuarios.
  readonly mapaEmbed = CLIENTE.ubicacion
    ? inject(DomSanitizer).bypassSecurityTrustResourceUrl(CLIENTE.ubicacion.mapaEmbedUrl)
    : null;

  // Si falla la carga se oculta la sección en vez de dejar el esqueleto para siempre.
  serviciosDestacados$ = inject(ServiciosService).destacados().pipe(
    catchError(error => {
      console.error('Error cargando servicios destacados', error);
      return of([]);
    }),
  );

  private servicios = toSignal(inject(ServiciosService).listar().pipe(catchError(() => of([] as Servicio[]))), { initialValue: [] as Servicio[] });
  /** "5 servicios · desde $55.000" para la tarjeta de barbería. */
  readonly resumenServicios = computed(() => {
    const lista = this.servicios();
    return lista.length ? { cantidad: lista.length, desde: Math.min(...lista.map(s => s.precio)) } : null;
  });

  private productos = toSignal(
    inject(ProductosService).visibles().pipe(catchError(() => of([] as Producto[]))),
    { initialValue: [] as Producto[] },
  );
  /** Vitrina de la tienda: primero los destacados y lo que hay en existencia. */
  readonly vitrina = computed(() =>
    [...this.productos()]
      .sort((a, b) => Number(sinExistencias(a)) - Number(sinExistencias(b)) || Number(b.destacado) - Number(a.destacado))
      .slice(0, 4),
  );
  readonly seleccionado = signal<Producto | null>(null);

  irAReservar(servicio: Servicio) {
    this.router.navigate(['/reservar'], { state: { servicio } });
  }

  agregar(producto: Producto) {
    if (tieneOpciones(producto)) {
      this.seleccionado.set(producto);
      return;
    }
    this.carrito.agregar(producto, null);
    this.carrito.abierto.set(true);
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
}
