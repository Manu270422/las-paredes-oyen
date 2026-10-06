// La respiración como mecánica: estas reglas salieron de la telemetría del
// 2026-09-29 (dos muertes injustas por jadeo). Si alguna falla, el juego
// vuelve a castigar justo lo que enseña (contener el aire).
import { describe, expect, it } from 'vitest';
import { Respiracion } from '../../src/jugador/Respiracion';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { crearContextoFalso } from './contextoFalso';
import { AJUSTES_POR_DEFECTO } from '../../src/config/Ajustes';
import { TABLA_DIFICULTAD } from '../../src/config/Dificultad';

const PASO = 1 / 60;

function simular(r: Respiracion, segundos: number, aguantar: boolean, ctx: ReturnType<typeof crearContextoFalso>['ctx']): void {
  for (let t = 0; t < segundos; t += PASO) r.actualizar(PASO, aguantar, 0, 0, ctx, 0, 0);
}

describe('Respiracion', () => {
  it('con la tecla apretada 20 s solo hay UN jadeo (antes: uno cada ~4.5 s)', () => {
    const { ctx, ruidos } = crearContextoFalso();
    const r = new Respiracion();
    simular(r, 20, true, ctx);
    expect(ruidos.filter((x) => x.causa === 'jadeo')).toHaveLength(1);
  });

  it('soltar a tiempo nunca es jadeo, aunque quede poco aire', () => {
    const { ctx, ruidos } = crearContextoFalso();
    const r = new Respiracion();
    while (r.aire > 0.2) r.actualizar(PASO, true, 0, 0, ctx, 0, 0);
    r.actualizar(PASO, false, 0, 0, ctx, 0, 0);
    expect(ruidos.some((x) => x.causa === 'jadeo')).toBe(false);
    const exhalacion = ruidos.find((x) => x.causa === 'respiracion');
    expect(exhalacion?.intensidad).toBe(CONFIG.ruido.exhalacionHonda);
  });

  it('para volver a aguantar después de un jadeo hay que soltar y apretar de nuevo', () => {
    const { ctx } = crearContextoFalso();
    const r = new Respiracion();
    simular(r, 12, true, ctx);
    expect(r.aguantando).toBe(false);
    r.actualizar(PASO, false, 0, 0, ctx, 0, 0);
    r.actualizar(PASO, true, 0, 0, ctx, 0, 0);
    expect(r.aguantando).toBe(true);
  });

  it('contener el aire es silencio: no emite ruido mientras aguanto', () => {
    const { ctx, ruidos } = crearContextoFalso();
    const r = new Respiracion();
    simular(r, 5, true, ctx);
    expect(ruidos).toHaveLength(0);
  });
});

describe('Ayuda visual del aire (accesibilidad)', () => {
  const avisos = (extra: Record<string, unknown>) => {
    const falso = crearContextoFalso(extra);
    const textos: string[] = [];
    falso.bus.on('subtitulo', (s) => textos.push(s.texto));
    return { ctx: falso.ctx, textos, ruidos: falso.ruidos };
  };
  const aguantarHasta = (r: Respiracion, ctx: ReturnType<typeof crearContextoFalso>['ctx'], aire: number) => {
    while (r.aire > aire) r.actualizar(PASO, true, 0, 0, ctx, 0, 0);
  };

  it('apagada (Normal, por defecto): no avisa', () => {
    const { ctx, textos } = avisos({});
    const r = new Respiracion();
    aguantarHasta(r, ctx, 0.05);
    expect(textos).toEqual([]);
  });

  it('encendida en Ajustes: avisa UNA vez por aguantada, con tiempo para soltar antes del jadeo', () => {
    const { ctx, textos, ruidos } = avisos({ ajustes: { valores: { ...AJUSTES_POR_DEFECTO, ayudaVisualAire: true } } });
    const r = new Respiracion();
    aguantarHasta(r, ctx, 0.05);
    expect(textos).toEqual(['[Te queda poco aire: suéltalo antes de jadear]']);
    expect(ruidos.some((x) => x.causa === 'jadeo'), 'avisó antes del jadeo').toBe(false);
    // Suelto, recupero y vuelvo a aguantar: avisa otra vez.
    for (let t = 0; t < 5; t += PASO) r.actualizar(PASO, false, 0, 0, ctx, 0, 0);
    aguantarHasta(r, ctx, 0.05);
    expect(textos).toHaveLength(2);
  });

  it('Historia la trae aunque Ajustes la tenga apagada (la dificultad puede dar, nunca quitar accesibilidad)', () => {
    const { ctx, textos } = avisos({ dificultad: TABLA_DIFICULTAD.historia });
    const r = new Respiracion();
    aguantarHasta(r, ctx, 0.05);
    expect(textos).toHaveLength(1);
  });
});
