// El hueco de la escalera (las celdas 'E'): se ve y se oye a través de él, pero nadie camina por él.
// Aquí pruebo la rejilla, la navegación, las reglas que un mapa debe cumplir y el marco local del hueco.
import { describe, expect, it } from 'vitest';
import { Navegacion } from '../../src/ia/Navegacion';
import type { Direccion } from '../../src/mundo/datos/TiposMapa';
import { aMundo, encontrarHuecos, marcoDelHueco } from '../../src/mundo/HuecoEscalera';
import { Rejilla } from '../../src/mundo/Rejilla';
import { MAPA_PISO_4 } from '../../src/pisos/piso4/mapa';

const C = 1.3;
const ningunaPuertaCerrada = () => false;
/** El centro de una celda en metros. */
const m = (indice: number) => (indice + 0.5) * C;

describe('Una celda de hueco en la rejilla', () => {
  const rejilla = new Rejilla(['#####', '#.E.#', '#####']);

  it('no es muro, no es transitable y sí es hueco', () => {
    expect(rejilla.esMuro(2, 1)).toBe(false);
    expect(rejilla.esTransitable(2, 1)).toBe(false);
    expect(rejilla.esHueco(2, 1)).toBe(true);
    expect(rejilla.esHueco(1, 1)).toBe(false);
    expect(rejilla.esHueco(0, 0)).toBe(false);
  });

  it('deja ver al otro lado (es aire)', () => {
    expect(rejilla.hayLineaDeVision(m(1), m(1), m(3), m(1), ningunaPuertaCerrada)).toBe(true);
    const conMuro = new Rejilla(['#####', '#.#.#', '#####']);
    expect(conMuro.hayLineaDeVision(m(1), m(1), m(3), m(1), ningunaPuertaCerrada)).toBe(false);
  });

  it('no ahoga el sonido: cruzarlo no cuenta como obstáculo, un muro sí', () => {
    expect(rejilla.contarObstaculos(m(1), m(1), m(3), m(1), ningunaPuertaCerrada)).toBe(0);
    const conMuro = new Rejilla(['#####', '#.#.#', '#####']);
    expect(conMuro.contarObstaculos(m(1), m(1), m(3), m(1), ningunaPuertaCerrada)).toBe(1);
  });

  it('no es una pared donde la criatura pueda sonar ni una distancia a pared', () => {
    // Pegado al hueco no estoy "pegado a la pared": el hueco no transmite mis pasos como un muro.
    const soloHueco = new Rejilla(['.....', '..E..', '.....']);
    expect(soloHueco.distanciaAPared(m(1), m(1))).toBe(Infinity);
    expect(soloHueco.muroMasCercano(m(1), m(1), 1)).toBeNull();
  });
});

describe('La navegación junto a un hueco', () => {
  const rejilla = new Rejilla(['#####', '#...#', '#.E.#', '#.E.#', '#...#', '#####']);
  const nav = new Navegacion(rejilla);

  it('rodea el hueco en vez de cruzarlo', () => {
    const camino = nav.buscar({ gx: 1, gy: 2 }, { gx: 3, gy: 2 });
    expect(camino).not.toBeNull();
    expect(camino!.some((c) => rejilla.esHueco(c.gx, c.gy))).toBe(false);
    // Por arriba: (1,2) → (1,1) → (2,1) → (3,1) → (3,2).
    expect(camino!.length).toBe(5);
  });

  it('no busca un camino hacia dentro del hueco', () => {
    expect(nav.buscar({ gx: 1, gy: 1 }, { gx: 2, gy: 2 })).toBeNull();
  });
});

describe('Las reglas de un hueco', () => {
  it('encuentra el hueco del piso 4 con la boca al norte (hacia el descanso)', () => {
    expect(encontrarHuecos(new Rejilla(MAPA_PISO_4.rejilla))).toEqual([{ gx0: 1, gy0: 11, gx1: 3, gy1: 12, boca: 'n' }]);
  });

  it('un mapa sin celdas E no tiene huecos', () => {
    expect(encontrarHuecos(new Rejilla(['####', '#..#', '####']))).toEqual([]);
  });

  it.each<[Direccion, string[]]>([
    ['n', ['#####', '#...#', '#EEE#', '#EEE#', '#####']],
    ['s', ['#####', '#EEE#', '#EEE#', '#...#', '#####']],
    ['o', ['#####', '#.EE#', '#.EE#', '#####']],
    ['e', ['#####', '#EE.#', '#EE.#', '#####']],
  ])('reconoce la boca "%s"', (boca, filas) => {
    const huecos = encontrarHuecos(new Rejilla(filas));
    expect(huecos).toHaveLength(1);
    expect(huecos[0].boca).toBe(boca);
  });

  it.each<[string, string[], RegExp]>([
    ['no es un rectángulo', ['#####', '#...#', '#EEE#', '#EE##', '#####'], /no es un rectángulo/],
    ['es demasiado pequeño', ['#####', '#...#', '#EEE#', '#####'], /mide menos/],
    ['tiene dos bocas', ['#####', '#...#', '#EE.#', '#EE.#', '#####'], /2 bocas/],
    ['no tiene boca', ['#####', '#####', '#EE##', '#EE##', '#####'], /0 bocas/],
    ['tiene una puerta en la boca', ['#####', '#.P.#', '#EEE#', '#EEE#', '#####'], /ni boca entera ni muro entero/],
    ['tiene un lado medio abierto', ['#####', '#.#.#', '#EEE#', '#EEE#', '#####'], /ni boca entera ni muro entero/],
  ])('rechaza un hueco que %s', (_caso, filas, error) => {
    expect(() => encontrarHuecos(new Rejilla(filas))).toThrow(error);
  });
});

describe('El marco local de un hueco', () => {
  // Un hueco de 3 x 2 celdas, de (1, 2) a (3, 3): en metros, x de 1.3 a 5.2 y z de 2.6 a 5.2.
  const rect = { gx0: 1, gy0: 2, gx1: 3, gy1: 3 };
  const [x0, x1, z0, z1] = [1 * C, 4 * C, 2 * C, 4 * C];
  const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const clave = (p: { x: number; z: number }) => `${p.x.toFixed(6)},${p.z.toFixed(6)}`;
  /** Dónde queda la boca (v = 0) según hacia dónde mira. */
  const enLaBoca: Record<Direccion, (p: { x: number; z: number }) => boolean> = {
    n: (p) => cerca(p.z, z0),
    s: (p) => cerca(p.z, z1),
    o: (p) => cerca(p.x, x0),
    e: (p) => cerca(p.x, x1),
  };

  it.each<Direccion>(['n', 's', 'o', 'e'])('con la boca "%s", las esquinas del marco son las del rectángulo', (boca) => {
    const marco = marcoDelHueco({ ...rect, boca }, C);
    const esquinas = [
      aMundo(marco, 0, 0),
      aMundo(marco, marco.ancho, 0),
      aMundo(marco, 0, marco.fondo),
      aMundo(marco, marco.ancho, marco.fondo),
    ];
    const esperadas = [
      { x: x0, z: z0 },
      { x: x1, z: z0 },
      { x: x0, z: z1 },
      { x: x1, z: z1 },
    ];
    expect(new Set(esquinas.map(clave))).toEqual(new Set(esperadas.map(clave)));
    // La línea v = 0 es la boca, y el área del marco es la del rectángulo.
    expect(enLaBoca[boca](esquinas[0]) && enLaBoca[boca](esquinas[1])).toBe(true);
    expect(cerca(marco.ancho * marco.fondo, (x1 - x0) * (z1 - z0))).toBe(true);
  });

  it.each<Direccion>(['n', 's', 'o', 'e'])('con la boca "%s", avanzar en v entra al hueco', (boca) => {
    const marco = marcoDelHueco({ ...rect, boca }, C);
    const dentro = aMundo(marco, marco.ancho / 2, 0.5);
    expect(dentro.x > x0 && dentro.x < x1 && dentro.z > z0 && dentro.z < z1).toBe(true);
    const fuera = aMundo(marco, marco.ancho / 2, -0.5);
    expect(fuera.x > x0 && fuera.x < x1 && fuera.z > z0 && fuera.z < z1).toBe(false);
  });
});
