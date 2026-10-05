// Progreso lee los objetivos del piso que recibe (ya no de una constante global) y MemoriaMundo es
// la dueña de las estadísticas de la partida (se guardan, se restauran y salen en la pantalla final).
import { describe, expect, it } from 'vitest';
import { MemoriaMundo } from '../../src/director/MemoriaMundo';
import { BusEventos } from '../../src/nucleo/BusEventos';
import type { MapaEventos } from '../../src/nucleo/Eventos';
import { Progreso } from '../../src/narrativa/Progreso';
import type { Objetivo } from '../../src/narrativa/Objetivos';
import { PISO_INICIAL } from '../../src/pisos/catalogo';

const OBJETIVOS_FALSOS: Objetivo[] = [
  { id: 'a', texto: 'Primero', bandera: 'hizo:a' },
  { id: 'b', texto: 'Segundo', bandera: 'hizo:b' },
];

describe('Progreso con los objetivos de un piso', () => {
  it('avanza por los objetivos del piso que recibe, en orden', () => {
    const p = new Progreso(new BusEventos<MapaEventos>(), OBJETIVOS_FALSOS);
    expect(p.objetivoActual()?.id).toBe('a');
    p.marcar('hizo:a');
    expect(p.objetivoActual()?.id).toBe('b');
    p.marcar('hizo:b');
    expect(p.objetivoActual()).toBeNull();
  });

  it('con los objetivos del piso inicial, empieza por leer la orden de trabajo', () => {
    const p = new Progreso(new BusEventos<MapaEventos>(), PISO_INICIAL.objetivos);
    expect(p.objetivoActual()?.bandera).toBe('leyo:orden_trabajo');
  });
});

describe('MemoriaMundo.estadisticas', () => {
  it('se restauran tal cual y viajan completas (cosas que cambiaron, cazas y muertes)', () => {
    const origen = new MemoriaMundo();
    origen.sustos = 5;
    origen.persecuciones = 2;
    origen.muertes = 4;
    const destino = new MemoriaMundo();
    destino.restaurarEstadisticas(origen.estadisticas);
    expect(destino.estadisticas).toEqual({ sustos: 5, persecuciones: 2, muertes: 4 });
  });

  it('una partida nueva las pone en cero', () => {
    const m = new MemoriaMundo();
    m.restaurarEstadisticas({ sustos: 3, persecuciones: 1, muertes: 2 });
    m.reiniciarEstadisticas();
    expect(m.estadisticas).toEqual({ sustos: 0, persecuciones: 0, muertes: 0 });
  });
});
