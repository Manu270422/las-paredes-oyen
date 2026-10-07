// El fin de un piso: lo que deja cada piso completado (solo lo suyo, no lo de toda la partida), su tarjeta al
// bajar (una sola vez) y la pantalla final con una línea por piso.
import { describe, expect, it, vi } from 'vitest';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { FinDePiso, type PiezasFin, type SalidaFin } from '../../src/nucleo/FinDePiso';
import type { EstadisticasFin } from '../../src/ui/pantallas/PantallaFin';
import { crearContextoFalso } from './contextoFalso';

function armar() {
  const falso = crearContextoFalso();
  const reloj = { tiempo: 0 };
  const memoria = { muertes: 0, cambiosMundo: 0, persecuciones: 0 };
  const eventos: string[] = [];
  falso.bus.on('piso-completado', (p) => eventos.push(`completado:${p.piso}:${p.tiempo}:${p.muertes}`));
  falso.bus.on('fin-partida', () => eventos.push('fin-partida'));
  const piso4 = { id: 'piso4', nombre: 'Piso 4', despertar: { objeto: 'llave', punto: 'escalera' } };
  const piso3 = { id: 'piso3', nombre: 'Piso 3' };
  const ctx = {
    ...falso.ctx,
    piso: piso4,
    memoria,
    progreso: { agregarObjeto: vi.fn() },
    entrada: { fijarEnJuego: vi.fn() },
    audio: { ...falso.ctx.audio, detenerTodo: vi.fn() },
    ambiente: { olvidarFuentes: vi.fn() },
  } as unknown as ContextoJuego & { piso: { id: string } };
  const piezas = {
    perfil: { registrarFinal: vi.fn(() => ({ mejorTiempo: 1, nuevoMejorTiempo: false, finales: 1 })) },
    dificultad: { masBaja: 'normal', texto: 'Normal' },
    guardado: { borrar: vi.fn() },
    telemetria: { cerrarSesion: vi.fn(() => eventos.push('sesion-cerrada')) },
    viaje: { viajar: vi.fn() },
  };
  let fin: EstadisticasFin | null = null;
  const salida: SalidaFin = { tiempoJugado: () => reloj.tiempo, terminar: vi.fn(), mostrarFin: (d) => (fin = d), fundir: vi.fn() };
  const f = new FinDePiso(piezas as unknown as PiezasFin, salida);
  return { f, ctx, reloj, memoria, eventos, piezas, piso3, fin: () => fin };
}

describe('El fin de un piso', () => {
  it('despertar anota lo que dejó el piso, lo avisa y despierta en el punto del paquete sin pasos de escalera', () => {
    const { f, ctx, reloj, memoria, eventos, piezas } = armar();
    reloj.tiempo = 600;
    Object.assign(memoria, { muertes: 2, cambiosMundo: 5 });
    f.despertar(ctx);
    expect(f.exportar()).toEqual([{ piso: 'piso4', nombre: 'Piso 4', tiempo: 600, muertes: 2, cambiosMundo: 5, tarjetaVista: false }]);
    expect(eventos).toEqual(['completado:piso4:600:2']);
    expect(piezas.viaje.viajar).toHaveBeenCalledWith(ctx.piso, 'escalera', ctx, true);
  });

  it('la tarjeta de un piso completado sale una sola vez, y solo para ese piso', () => {
    const { f, ctx, reloj, memoria } = armar();
    reloj.tiempo = 600;
    Object.assign(memoria, { muertes: 2, cambiosMundo: 5 });
    f.despertar(ctx);
    expect(f.tomarResumen('piso3')).toBeNull();
    expect(f.tomarResumen('piso4')).toEqual({ titulo: 'Piso 4 superado', subtitulo: '10:00 · te oyó 2 veces · 5 cosas cambiaron' });
    expect(f.tomarResumen('piso4'), 'ya la vi').toBeNull();
    expect(f.exportar()[0].tarjetaVista, 'y queda anotado para la partida guardada').toBe(true);
  });

  it('la pantalla final trae una línea por piso con solo lo de cada uno, y el piso se completa antes de cerrar la sesión', () => {
    const { f, ctx, reloj, memoria, eventos, piso3, fin, piezas } = armar();
    reloj.tiempo = 600;
    Object.assign(memoria, { muertes: 2, cambiosMundo: 5 });
    f.despertar(ctx);
    (ctx as { piso: unknown }).piso = piso3;
    reloj.tiempo = 900;
    Object.assign(memoria, { muertes: 3, cambiosMundo: 9 });
    f.terminarPartida(ctx);
    expect(fin()?.pisos).toEqual([
      { nombre: 'Piso 4', tiempo: 600, muertes: 2 },
      { nombre: 'Piso 3', tiempo: 300, muertes: 1 },
    ]);
    expect(fin()).toMatchObject({ piso: 'Piso 3', tiempo: 900, muertes: 3 });
    expect(eventos).toEqual(['completado:piso4:600:2', 'completado:piso3:300:1', 'fin-partida', 'sesion-cerrada']);
    expect(piezas.guardado.borrar).toHaveBeenCalled();
  });

  it('completar el mismo piso dos veces no lo anota dos veces', () => {
    const { f, ctx, reloj } = armar();
    reloj.tiempo = 100;
    f.despertar(ctx);
    f.terminarPartida(ctx);
    expect(f.exportar().map((p) => p.piso)).toEqual(['piso4']);
  });

  it('exporta e importa copias (la partida guardada no comparte objetos con el juego)', () => {
    const { f, ctx, reloj } = armar();
    reloj.tiempo = 100;
    f.despertar(ctx);
    const exportado = f.exportar();
    exportado[0].tarjetaVista = true;
    expect(f.exportar()[0].tarjetaVista).toBe(false);
    f.importar([]);
    expect(f.exportar()).toEqual([]);
  });
});
