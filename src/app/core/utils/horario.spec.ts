import { Cita } from '../models/cita.model';
import {
  Horario, claveDia, compararCitas, diaDeCita, diasReservables, estadoDelNegocio, formatearHora12, horariosDisponibles,
  minutosDeCita, normalizarEstado, parsearHora, relojDelNegocio, resumenHorario, slotsDeCita,
} from './horario';

// Horario fijo para que los tests no dependan del cliente activo.
const horario: Horario = { apertura: 600, cierre: 1200, intervalo: 30, diasCerrados: [0], diasReservables: 14 };

describe('horario', () => {
  describe('parsearHora', () => {
    it('acepta formato de 12 horas', () => {
      expect(parsearHora('10:00 AM')).toBe(600);
      expect(parsearHora('2:30 PM')).toBe(870);
      expect(parsearHora('12:00 PM')).toBe(720);
      expect(parsearHora('12:30 AM')).toBe(30);
      expect(parsearHora('7:30pm')).toBe(1170);
    });

    it('acepta formato de 24 horas', () => {
      expect(parsearHora('14:30')).toBe(870);
      expect(parsearHora('09:00')).toBe(540);
    });

    it('rechaza valores inválidos', () => {
      expect(parsearHora('')).toBeNull();
      expect(parsearHora(undefined)).toBeNull();
      expect(parsearHora('25:00')).toBeNull();
      expect(parsearHora('13:00 PM')).toBeNull();
      expect(parsearHora('10:75')).toBeNull();
    });
  });

  it('formatearHora12 usa el mismo formato que las citas guardadas', () => {
    expect(formatearHora12(600)).toBe('10:00 AM');
    expect(formatearHora12(720)).toBe('12:00 PM');
    expect(formatearHora12(810)).toBe('1:30 PM');
  });

  it('ordena por hora real y no alfabéticamente ("1:00 PM" va después de "11:00 AM")', () => {
    const cita = (horaStr: string) => ({ fecha: '2026-10-01T15:00:00.000Z', dia: '2026-10-01', horaStr } as Cita);
    const ordenadas = [cita('2:00 PM'), cita('1:00 PM'), cita('10:00 AM'), cita('12:00 PM')].sort(compararCitas);
    expect(ordenadas.map(c => c.horaStr)).toEqual(['10:00 AM', '12:00 PM', '1:00 PM', '2:00 PM']);
  });

  it('lee el día y la hora de citas antiguas sin los campos dia/hora', () => {
    const antigua = { fecha: new Date(2026, 9, 1, 18, 45).toISOString(), horaStr: '3:30 PM' } as Cita;
    expect(diaDeCita(antigua)).toBe('2026-10-01');
    expect(minutosDeCita(antigua)).toBe(930);
  });

  it('normaliza el estado antiguo "completado"', () => {
    expect(normalizarEstado('completado')).toBe('completada');
    expect(normalizarEstado('pendiente')).toBe('pendiente');
  });

  it('slotsDeCita ocupa todos los bloques de 30 min que dura el servicio', () => {
    expect(slotsDeCita('b1', '2026-10-01', 600, 90).map(s => s.id)).toEqual([
      'b1_2026-10-01_1000', 'b1_2026-10-01_1030', 'b1_2026-10-01_1100',
    ]);
    expect(slotsDeCita('b1', '2026-10-01', 600, 40)).toHaveSize(2);
  });

  describe('horariosDisponibles', () => {
    const manana = new Date(2026, 9, 1, 8, 0);
    const dia = '2026-10-02';

    it('no ofrece horas en las que el servicio terminaría después del cierre', () => {
      const horas = horariosDisponibles({ dia, duracion: 120, barberos: ['b1'], ocupados: new Set(), ahora: manana, horario });
      expect(horas[0].etiqueta).toBe('10:00 AM');
      expect(horas[horas.length - 1].etiqueta).toBe('6:00 PM');
    });

    it('bloquea las horas que se solapan con cualquier bloque ocupado', () => {
      const ocupados = new Set(['b1_2026-10-02_1100']);
      const horas = horariosDisponibles({ dia, duracion: 90, barberos: ['b1'], ocupados, ahora: manana, horario });
      const etiquetas = horas.map(h => h.etiqueta);
      // Un servicio de 90 min que empieza a las 10:00 terminaría 11:30 y pisa el bloque de las 11:00.
      expect(etiquetas).not.toContain('10:00 AM');
      expect(etiquetas).not.toContain('10:30 AM');
      expect(etiquetas).not.toContain('11:00 AM');
      expect(etiquetas).toContain('11:30 AM');
    });

    it('con varios barberos, la hora sigue disponible mientras alguno esté libre', () => {
      const ocupados = new Set(['b1_2026-10-02_1000']);
      const horas = horariosDisponibles({ dia, duracion: 30, barberos: ['b1', 'b2'], ocupados, ahora: manana, horario });
      expect(horas[0]).toEqual({ minutos: 600, etiqueta: '10:00 AM', barberosLibres: ['b2'] });
    });

    it('hoy solo ofrece horas futuras', () => {
      const ahora = new Date(2026, 9, 2, 14, 10);
      const horas = horariosDisponibles({ dia, duracion: 30, barberos: ['b1'], ocupados: new Set(), ahora, horario });
      expect(horas[0].etiqueta).toBe('2:30 PM');
    });

    it('no ofrece días pasados', () => {
      const despues = new Date(2026, 9, 5, 8, 0);
      expect(horariosDisponibles({ dia, duracion: 30, barberos: ['b1'], ocupados: new Set(), ahora: despues, horario })).toEqual([]);
    });
  });

  it('diasReservables excluye los domingos', () => {
    const dias = diasReservables(new Date(2026, 9, 1), horario);
    expect(dias.some(d => d.getDay() === 0)).toBeFalse();
    expect(claveDia(dias[0])).toBe('2026-10-01');
  });

  it('resumenHorario agrupa los días abiertos consecutivos', () => {
    expect(resumenHorario(horario)).toEqual([
      { dias: 'Lun – Sáb', horas: '10:00 AM – 8:00 PM', abierto: true },
      { dias: 'Dom', horas: 'Cerrado', abierto: false },
    ]);
    expect(resumenHorario({ ...horario, diasCerrados: [0, 1] })[0]).toEqual({ dias: 'Lun', horas: 'Cerrado', abierto: false });
  });

  describe('estadoDelNegocio (hora de Colombia, UTC-5)', () => {
    // 1 de octubre de 2026 es jueves.
    const utc = (iso: string) => new Date(iso);

    it('usa la hora de Colombia aunque el navegador esté en otra zona', () => {
      expect(relojDelNegocio(utc('2026-10-01T15:30:00Z'))).toEqual({ dia: 4, minutos: 630 });
      // 1:30 a. m. UTC del viernes = 8:30 p. m. del jueves en Colombia
      expect(relojDelNegocio(utc('2026-10-02T01:30:00Z'))).toEqual({ dia: 4, minutos: 1230 });
    });

    it('abierto dentro del horario', () => {
      expect(estadoDelNegocio(utc('2026-10-01T15:00:00Z'), horario)).toEqual(
        { abierto: true, dia: 4, texto: 'Abierto ahora · cierra a las 8:00 PM' });
    });

    it('antes de abrir y después de cerrar', () => {
      expect(estadoDelNegocio(utc('2026-10-01T14:00:00Z'), horario).texto).toBe('Cerrado · abre hoy a las 10:00 AM');
      expect(estadoDelNegocio(utc('2026-10-02T02:00:00Z'), horario).texto).toBe('Cerrado · abre mañana a las 10:00 AM');
      // A las 8:00 p. m. en punto ya cerró
      expect(estadoDelNegocio(utc('2026-10-02T01:00:00Z'), horario).abierto).toBeFalse();
    });

    it('salta los días cerrados', () => {
      // Sábado 9:00 p. m.: el domingo no abre, así que abre el lunes
      expect(estadoDelNegocio(utc('2026-10-04T02:00:00Z'), horario).texto).toBe('Cerrado · abre el lunes a las 10:00 AM');
      // Domingo al mediodía: abre mañana (lunes)
      expect(estadoDelNegocio(utc('2026-10-04T17:00:00Z'), horario)).toEqual(
        { abierto: false, dia: 0, texto: 'Cerrado · abre mañana a las 10:00 AM' });
    });
  });
});
