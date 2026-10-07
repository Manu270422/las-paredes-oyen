// La dificultad de la partida en curso (nucleo/DificultadPartida.ts): la actual, la inicial y la más baja
// jugada; qué se guarda al cambiarla en plena partida, y qué pasa al bajar desde la que no guarda (Pesadilla).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TABLA_DIFICULTAD } from '../../src/config/Dificultad';
import { SistemaGuardado, VERSION_PARTIDA, type DatosPartida } from '../../src/guardado/SistemaGuardado';
import { BusEventos } from '../../src/nucleo/BusEventos';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { DificultadPartida } from '../../src/nucleo/DificultadPartida';
import type { MapaEventos } from '../../src/nucleo/Eventos';

let memoria: Map<string, string>;
beforeEach(() => {
  memoria = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, v),
      removeItem: (k: string) => void memoria.delete(k),
    },
  });
});

/** Solo lo que DificultadPartida toca del contexto: los valores y el bus (para el subtítulo). */
function contexto() {
  const bus = new BusEventos<MapaEventos>();
  const subtitulos: string[] = [];
  bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  const ctx = { bus, dificultad: TABLA_DIFICULTAD.normal } as unknown as ContextoJuego;
  return { ctx, subtitulos };
}

const partida = (d: Partial<DatosPartida> = {}): Omit<DatosPartida, 'version' | 'fecha'> => ({
  piso: 'piso4',
  dificultad: 'normal',
  dificultadInicial: 'normal',
  dificultadMasBaja: 'normal',
  puntoControl: 'escalera',
  progreso: { banderas: ['leyo:orden_trabajo'], inventario: [], documentos: [] },
  otrosPisos: {},
  pisosCompletados: [],
  bateria: 1,
  tiempoJugado: 10,
  estadisticas: { persecuciones: 0, muertes: 0, sustos: 0, cambiosMundo: 0 },
  ...d,
});

describe('La dificultad de la partida en curso', () => {
  it('al empezar: sus valores van al contexto; la que no guarda deja el guardado sin escribir ni borrar', () => {
    const g = new SistemaGuardado();
    const d = new DificultadPartida(g);
    const { ctx } = contexto();
    d.empezar('dificil', ctx, false);
    expect(ctx.dificultad).toBe(TABLA_DIFICULTAD.dificil);
    expect(g.sinGuardado).toBe(false);
    d.empezar('pesadilla', ctx, false);
    expect(g.sinGuardado).toBe(true);
    expect(d.texto).toBe('Pesadilla');
  });

  it('bajar en plena partida se aplica al instante, actualiza la partida guardada y el final dice "Difícil → Normal"', () => {
    const g = new SistemaGuardado();
    const d = new DificultadPartida(g);
    const { ctx, subtitulos } = contexto();
    const cambios: MapaEventos['dificultad-cambiada'][] = [];
    ctx.bus.on('dificultad-cambiada', (c) => cambios.push(c));
    d.empezar('dificil', ctx, false);
    g.guardar(partida({ ...d.campos }));
    d.cambiar('normal', ctx, 'ajustes');
    expect(ctx.dificultad).toBe(TABLA_DIFICULTAD.normal);
    expect(g.cargar(), 'morir o "Continuar" no me devuelven a Difícil').toMatchObject({ dificultad: 'normal', dificultadInicial: 'dificil', dificultadMasBaja: 'normal' });
    expect(d.texto).toBe('Difícil → Normal');
    expect(d.masBaja, 'el perfil cuenta la más baja').toBe('normal');
    expect(subtitulos).toEqual(['Ahora juegas en Normal.']);
    expect(cambios, 'la telemetría se entera, con el motivo').toEqual([{ de: 'dificil', a: 'normal', motivo: 'ajustes' }]);
    // Volver a subir no borra que se jugó en Normal.
    d.cambiar('dificil', ctx, 'ajustes');
    expect(d.masBaja).toBe('normal');
    expect(d.texto).toBe('Difícil → Normal');
  });

  it('bajar desde Pesadilla: no toca la partida guardada (es de otra) hasta el próximo punto de control', () => {
    const g = new SistemaGuardado();
    g.guardar(partida({ puntoControl: 'sala401' }));
    const antes = memoria.get('las-paredes-oyen:partida');
    const d = new DificultadPartida(g);
    const { ctx, subtitulos } = contexto();
    d.empezar('pesadilla', ctx, false);
    d.cambiar('normal', ctx, 'ajustes');
    expect(ctx.dificultad).toBe(TABLA_DIFICULTAD.normal);
    expect(g.sinGuardado, 'sigue sin guardado propio: morir es empezar de cero').toBe(true);
    expect(memoria.get('las-paredes-oyen:partida'), 'la otra partida sigue intacta').toBe(antes);
    expect(subtitulos[0]).toBe('Ahora juegas en Normal. La partida se guarda desde el próximo punto de control.');
    expect(d.texto).toBe('Pesadilla → Normal');
  });

  it('empezar de cero tras morir sin guardado propio conserva ese estado (no borra la otra partida)', () => {
    const g = new SistemaGuardado();
    const d = new DificultadPartida(g);
    const { ctx } = contexto();
    d.empezar('pesadilla', ctx, false);
    d.cambiar('normal', ctx, 'ajustes');
    d.empezar('normal', ctx, true);
    expect(g.sinGuardado).toBe(true);
    expect(d.texto, 'una partida nueva en Normal').toBe('Normal');
  });

  it('retomar una partida guardada recupera su dificultad y su historia', () => {
    const g = new SistemaGuardado();
    g.fijarSinGuardado(true);
    const d = new DificultadPartida(g);
    const { ctx } = contexto();
    d.retomar({ ...partida({ dificultad: 'normal', dificultadInicial: 'dificil', dificultadMasBaja: 'historia' }), version: VERSION_PARTIDA, fecha: 1 }, ctx);
    expect(d.actual).toBe('normal');
    expect(d.texto).toBe('Difícil → Historia');
    expect(g.sinGuardado, 'una partida guardada guarda').toBe(false);
  });
});
