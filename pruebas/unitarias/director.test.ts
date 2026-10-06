// Memoria de tensión y alivio del director: las reglas que evitan apilar sustos
// y que un jugador que muere seguido abandone de frustración.
import { describe, expect, it } from 'vitest';
import { CATALOGO_EVENTOS } from '../../src/director/eventos/Catalogo';
import { PresupuestoTension } from '../../src/director/PresupuestoTension';
import { DirectorTerror } from '../../src/director/DirectorTerror';
import { BusEventos } from '../../src/nucleo/BusEventos';
import type { MapaEventos } from '../../src/nucleo/Eventos';

describe('PresupuestoTension', () => {
  it('la carga se reduce a la mitad cada 40 s de juego', () => {
    const p = new PresupuestoTension();
    p.sumar(8);
    p.actualizar(40);
    expect(p.carga).toBeCloseTo(4, 5);
    p.actualizar(40);
    expect(p.carga).toBeCloseTo(2, 5);
  });

  it('un encuentro suma carga y, al terminar, obliga a un respiro', () => {
    const bus = new BusEventos<MapaEventos>();
    const p = new PresupuestoTension();
    p.conectar(bus);
    bus.emit('encuentro', { estado: 'inicio', distancia: 2 });
    expect(p.carga).toBe(4);
    bus.emit('encuentro', { estado: 'superado', distancia: 2 });
    expect(p.cabe(1, 'pico', 0)).toBe(false);
    p.actualizar(8.1);
    expect(p.cabe(1, 'pico', 0)).toBe(true);
  });

  it('una caza pesa más que cualquier evento del director', () => {
    const bus = new BusEventos<MapaEventos>();
    const p = new PresupuestoTension();
    p.conectar(bus);
    bus.emit('entidad-estado', { estado: 'cazando', fisica: true });
    expect(p.carga).toBeGreaterThan(PresupuestoTension.costo(3));
  });

  it('respeta el límite de cada fase', () => {
    const p = new PresupuestoTension();
    p.carga = 5.5;
    expect(p.cabe(PresupuestoTension.costo(1), 'acumulacion', 0)).toBe(false);
    expect(p.cabe(PresupuestoTension.costo(1), 'pico', 0)).toBe(true);
    // Con alivio, el mismo evento deja de caber en el pico.
    expect(p.cabe(PresupuestoTension.costo(3), 'pico', 0.45)).toBe(false);
  });

  it('un evento sutil siempre cabe cuando la carga ya se evaporó', () => {
    const p = new PresupuestoTension();
    expect(p.cabe(PresupuestoTension.costo(1), 'calma', 0.45)).toBe(true);
  });
});

describe('Eventos que cambian el mundo ("Cosas que cambiaron" del final)', () => {
  it('son los que dejan algo distinto que el jugador puede notar: la luz, la puerta, el objeto movido y la radio', () => {
    const cambian = Object.fromEntries(CATALOGO_EVENTOS.filter((e) => e.cambia).map((e) => [e.id, e.cambia]));
    expect(cambian).toEqual({ luz_falla: 'luz', objeto_movido: 'objeto', puerta_cambiada: 'puerta', radio_encendida: 'objeto' });
  });
});

describe('Alivio del director tras muertes seguidas sin progreso', () => {
  it('1 muerte no cambia nada; después baja 15 % por muerte, con tope de 45 %', () => {
    const d = new DirectorTerror();
    const alivio = (muertes: number) => {
      d.reiniciar(muertes);
      return Math.round(d['alivio'] * 100) / 100;
    };
    expect([0, 1, 2, 3, 4, 10].map(alivio)).toEqual([0, 0, 0.15, 0.3, 0.45, 0.45]);
  });
});
