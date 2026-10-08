// La libreta de Andrés: el cuaderno del 302 y las dos hojas que le arrancaron (301 y 303). Leídas las tres, en
// cualquier orden, el guion marca 'imitacion:piso3' (la criatura imita completo) y, de vuelta en el juego,
// suena la reflexión una sola vez. Una partida guardada justo al leer la última se arregla al cargarla.
import { describe, expect, it } from 'vitest';
import { Progreso } from '../../src/narrativa/Progreso';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { PISO_3 } from '../../src/pisos/piso3';
import { GuionPiso3, LIBRETA_COMPLETA, PARTES_LIBRETA, REFLEXION_LIBRETA } from '../../src/pisos/piso3/guion';
import { crearContextoFalso } from './contextoFalso';

function armar(leidos: readonly string[] = []) {
  const falso = crearContextoFalso();
  const progreso = new Progreso(falso.bus, PISO_3.objetivos, PISO_3.reglas);
  progreso.importar({ banderas: ['llego:piso3', ...leidos.map((id) => `leyo:${id}`)], inventario: [], documentos: [...leidos] });
  const subtitulos: string[] = [];
  const banderas: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  falso.bus.on('bandera', (b) => banderas.push(b.nombre));
  const ctx = { ...falso.ctx, piso: PISO_3, progreso } as unknown as ContextoJuego;
  const guion = new GuionPiso3();
  guion.conectar(ctx);
  guion.reiniciar(ctx);
  const jugar = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.1) guion.actualizar(0.1, ctx);
  };
  return { ctx, guion, progreso, subtitulos, banderas, jugar };
}

/** Todas las maneras de ordenar las tres partes. */
function ordenes<T>(lista: readonly T[]): T[][] {
  if (lista.length <= 1) return [[...lista]];
  return lista.flatMap((x, i) => ordenes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [x, ...resto]));
}

describe('La libreta de Andrés (guion del Piso 3)', () => {
  it.each(ordenes(PARTES_LIBRETA).map((o) => [o.join(' → '), o] as const))('leída en el orden %s, se completa con la tercera', (_nombre, orden) => {
    const { progreso } = armar();
    progreso.registrarDocumento(orden[0]);
    progreso.registrarDocumento(orden[1]);
    expect(progreso.tiene(LIBRETA_COMPLETA), 'con dos de tres, todavía no').toBe(false);
    expect(progreso.imitacionCompleta).toBe(false);
    progreso.registrarDocumento(orden[2]);
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(true);
    expect(progreso.imitacionCompleta, 'la regla del paquete apunta a la misma bandera').toBe(true);
  });

  it('otros papeles del piso no la completan', () => {
    const { progreso } = armar(['hoja_301', 'hoja_303']);
    progreso.registrarDocumento('carta_admin_301');
    progreso.registrarDocumento('carta_madre_302');
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(false);
  });

  it('la reflexión sale después, ya jugando (leyendo no corre el tiempo del guion), y una sola vez', () => {
    const { progreso, subtitulos, jugar } = armar(['libreta_302', 'hoja_301']);
    progreso.registrarDocumento('hoja_303');
    expect(subtitulos, 'mientras leo, nada').toEqual([]);
    jugar(0.6);
    expect(subtitulos, 'recién cerrado el lector, todavía no').toEqual([]);
    jugar(1);
    expect(subtitulos).toEqual([REFLEXION_LIBRETA]);
    jugar(30);
    progreso.registrarDocumento('libreta_302');
    jugar(5);
    expect(subtitulos, 'releer no la repite').toEqual([REFLEXION_LIBRETA]);
  });

  it('al cargar una partida con las tres leídas y sin la bandera, la marca en silencio y sin reflexión', () => {
    // Así queda la partida si el punto de control de la última parte se guardó antes de que el guion oyera la bandera.
    const { progreso, subtitulos, banderas, jugar } = armar([...PARTES_LIBRETA]);
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(true);
    expect(banderas, 'cargar no es un hecho nuevo: nada por el bus').toEqual([]);
    jugar(5);
    expect(subtitulos).toEqual([]);
  });

  it('desconectado (me fui a otro piso), ya no escucha', () => {
    const { guion, progreso } = armar(['libreta_302', 'hoja_301']);
    guion.desconectar();
    progreso.registrarDocumento('hoja_303');
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(false);
  });
});

describe('La libreta en el paquete del Piso 3', () => {
  it('la regla de la imitación completa es la bandera que marca el guion, y la de un objetivo', () => {
    expect(PISO_3.reglas.imitacionCompletaCon).toBe(LIBRETA_COMPLETA);
    expect(PISO_3.objetivos.map((o) => o.bandera)).toContain(LIBRETA_COMPLETA);
  });

  it('cada parte de la libreta es un documento del piso que está en el mapa', () => {
    const enMapa = new Set(PISO_3.mapa.interactuables.flatMap((i) => (i.tipo === 'documento' && i.documento ? [i.documento] : [])));
    for (const parte of PARTES_LIBRETA) {
      expect(PISO_3.documentos[parte], `${parte} no está en los documentos`).toBeDefined();
      expect(enMapa.has(parte), `${parte} no está en el mapa`).toBe(true);
    }
  });

  it('leer el cuaderno crea el punto de control del cuarto del 302 (también en Difícil)', () => {
    expect(PISO_3.puntosControl['leyo:libreta_302']).toBe('cuarto302');
    expect(PISO_3.puntosControlMayores).toContain('leyo:libreta_302');
  });
});
