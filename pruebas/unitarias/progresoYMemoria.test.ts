// Progreso lee los objetivos del piso que recibe (ya no de una constante global) y MemoriaMundo es
// la dueña de las estadísticas de la partida (se guardan, se restauran y salen en la pantalla final).
import { describe, expect, it } from 'vitest';
import { MemoriaMundo } from '../../src/director/MemoriaMundo';
import { BusEventos } from '../../src/nucleo/BusEventos';
import type { MapaEventos } from '../../src/nucleo/Eventos';
import { Progreso, RECORDAR_OBJETIVO_CADA } from '../../src/narrativa/Progreso';
import type { Objetivo } from '../../src/narrativa/TiposNarrativa';
import { PISO_INICIAL } from '../../src/pisos/catalogo';

const OBJETIVOS_FALSOS: Objetivo[] = [
  { id: 'a', texto: 'Primero', bandera: 'hizo:a' },
  { id: 'b', texto: 'Segundo', bandera: 'hizo:b' },
];

const REGLAS_FALSAS = { directorDesde: 'hizo:a', despiertaCon: 'hizo:a', imitacionCompletaCon: 'hizo:b' };

describe('Progreso con las reglas de un piso', () => {
  it('la criatura despierta y la imitación se completa con las banderas que declara el piso, no con unas fijas', () => {
    const p = new Progreso(new BusEventos<MapaEventos>(), OBJETIVOS_FALSOS, REGLAS_FALSAS);
    expect([p.criaturaDespierta, p.imitacionCompleta]).toEqual([false, false]);
    p.marcar('hizo:a');
    expect([p.criaturaDespierta, p.imitacionCompleta]).toEqual([true, false]);
    p.marcar('hizo:b');
    expect([p.criaturaDespierta, p.imitacionCompleta]).toEqual([true, true]);
  });

  it('una bandera de otro piso no la despierta (medido:401 no significa nada fuera del Piso 4)', () => {
    const p = new Progreso(new BusEventos<MapaEventos>(), OBJETIVOS_FALSOS, REGLAS_FALSAS);
    p.marcar('medido:401');
    expect(p.criaturaDespierta).toBe(false);
  });
});

describe('Progreso con los objetivos de un piso', () => {
  it('avanza por los objetivos del piso que recibe, en orden', () => {
    const p = new Progreso(new BusEventos<MapaEventos>(), OBJETIVOS_FALSOS, REGLAS_FALSAS);
    expect(p.objetivoActual()?.id).toBe('a');
    p.marcar('hizo:a');
    expect(p.objetivoActual()?.id).toBe('b');
    p.marcar('hizo:b');
    expect(p.objetivoActual()).toBeNull();
  });

  it('recuerda solo el objetivo tras 90 s de juego sin mostrarlo; un objetivo nuevo reinicia la cuenta', () => {
    const bus = new BusEventos<MapaEventos>();
    const avisos: Array<{ texto: string; nuevo: boolean }> = [];
    bus.on('objetivo', (o) => avisos.push(o));
    const p = new Progreso(bus, OBJETIVOS_FALSOS, REGLAS_FALSAS);
    p.actualizar(RECORDAR_OBJETIVO_CADA - 1);
    expect(avisos, 'todavía no').toEqual([]);
    p.actualizar(1);
    expect(avisos).toEqual([{ texto: 'Primero', nuevo: false }]);
    p.actualizar(RECORDAR_OBJETIVO_CADA - 10);
    p.marcar('hizo:a');
    expect(avisos.at(-1)).toEqual({ texto: 'Segundo', nuevo: true });
    p.actualizar(RECORDAR_OBJETIVO_CADA - 1);
    expect(avisos, 'el nuevo reinició la cuenta').toHaveLength(2);
    p.actualizar(1);
    expect(avisos.at(-1)).toEqual({ texto: 'Segundo', nuevo: false });
    // Sin objetivos (el piso terminó) no recuerda nada.
    p.marcar('hizo:b');
    p.actualizar(RECORDAR_OBJETIVO_CADA * 2);
    expect(avisos).toHaveLength(3);
  });

  it('con los objetivos del piso inicial, empieza por leer la orden de trabajo', () => {
    const p = new Progreso(new BusEventos<MapaEventos>(), PISO_INICIAL.objetivos, PISO_INICIAL.reglas);
    expect(p.objetivoActual()?.bandera).toBe('leyo:orden_trabajo');
  });
});

describe('Progreso por piso (cada piso recuerda lo suyo; el inventario viaja conmigo)', () => {
  const ARRIBA = { id: 'arriba', objetivos: OBJETIVOS_FALSOS, reglas: REGLAS_FALSAS };
  const ABAJO = {
    id: 'abajo',
    objetivos: [{ id: 'c', texto: 'Abajo', bandera: 'hizo:c' }],
    reglas: { directorDesde: 'hizo:c', despiertaCon: 'hizo:c', imitacionCompletaCon: 'nunca' },
  };

  /** Juego un rato arriba: dos banderas, un documento y una llave. */
  function jugarArriba(): { p: Progreso; bus: BusEventos<MapaEventos> } {
    const bus = new BusEventos<MapaEventos>();
    const p = new Progreso(bus, ARRIBA.objetivos, ARRIBA.reglas);
    p.marcar('hizo:a');
    p.registrarDocumento('nota');
    p.agregarObjeto('llave');
    return { p, bus };
  }

  it('al bajar, las banderas, documentos, objetivos y reglas son los del piso nuevo; la llave sigue en el bolsillo', () => {
    const { p } = jugarArriba();
    p.cambiarPiso('arriba', ABAJO);
    expect(p.tiene('hizo:a')).toBe(false);
    expect(p.documentosLeidos).toEqual([]);
    expect(p.objetivoActual()?.id).toBe('c');
    expect(p.criaturaDespierta, 'despierta con las reglas de abajo, no con las de arriba').toBe(false);
    expect(p.tieneObjeto('llave')).toBe(true);
    p.marcar('hizo:c');
    expect(p.criaturaDespierta).toBe(true);
  });

  it('al volver, el piso sigue como lo dejé; y el que dejo queda recordado para la partida guardada', () => {
    const { p } = jugarArriba();
    p.cambiarPiso('arriba', ABAJO);
    p.marcar('hizo:c');
    p.cambiarPiso('abajo', ARRIBA);
    expect(p.tiene('hizo:a')).toBe(true);
    expect(p.tiene('objeto:llave')).toBe(true);
    expect(p.tiene('hizo:c')).toBe(false);
    expect(p.documentosLeidos).toEqual(['nota']);
    expect(p.objetivoActual()?.id).toBe('b');
    expect(p.exportarOtros(), 'el piso en el que estoy no está entre los otros').toEqual({ abajo: { banderas: ['hizo:c'], documentos: [] } });
  });

  it('cambiar de piso no avisa banderas ni objetivo nuevo: el piso no las marca, solo las recuerda', () => {
    const { p, bus } = jugarArriba();
    const avisos: string[] = [];
    bus.on('bandera', ({ nombre }) => avisos.push(nombre));
    bus.on('objetivo', ({ nuevo }) => avisos.push(nuevo ? 'objetivo-nuevo' : 'objetivo'));
    p.cambiarPiso('arriba', ABAJO);
    p.cambiarPiso('abajo', ARRIBA);
    expect(avisos).toEqual([]);
    p.anunciarObjetivo();
    expect(avisos).toEqual(['objetivo']);
  });

  it('lo de los otros pisos sale y entra como copia (la partida guardada no se cambia por debajo)', () => {
    const { p } = jugarArriba();
    p.cambiarPiso('arriba', ABAJO);
    const otros = p.exportarOtros();
    otros.arriba.banderas.push('trampa');
    expect(p.exportarOtros().arriba.banderas).not.toContain('trampa');

    const cargado = new Progreso(new BusEventos<MapaEventos>(), ABAJO.objetivos, ABAJO.reglas);
    cargado.importar(p.exportar(), p.exportarOtros());
    cargado.cambiarPiso('abajo', ARRIBA);
    expect(cargado.tiene('hizo:a')).toBe(true);
    expect(cargado.documentosLeidos).toEqual(['nota']);
  });

  it('una partida nueva (importar sin datos) olvida también los otros pisos', () => {
    const { p } = jugarArriba();
    p.cambiarPiso('arriba', ABAJO);
    p.importar(null);
    expect(p.exportarOtros()).toEqual({});
    expect(p.tieneObjeto('llave')).toBe(false);
  });
});

describe('MemoriaMundo.estadisticas', () => {
  it('se restauran tal cual y viajan completas (sustos, cosas que cambiaron, cazas y muertes)', () => {
    const origen = new MemoriaMundo();
    origen.sustos = 5;
    origen.cambiosMundo = 7;
    origen.persecuciones = 2;
    origen.muertes = 4;
    const destino = new MemoriaMundo();
    destino.restaurarEstadisticas(origen.estadisticas);
    expect(destino.estadisticas).toEqual({ sustos: 5, persecuciones: 2, muertes: 4, cambiosMundo: 7 });
  });

  it('una partida nueva las pone en cero', () => {
    const m = new MemoriaMundo();
    m.restaurarEstadisticas({ sustos: 3, persecuciones: 1, muertes: 2, cambiosMundo: 6 });
    m.reiniciarEstadisticas();
    expect(m.estadisticas).toEqual({ sustos: 0, persecuciones: 0, muertes: 0, cambiosMundo: 0 });
  });
});
