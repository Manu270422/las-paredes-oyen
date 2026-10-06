// Los rastros (sangre vieja, lápiz, rayas): pruebo que cada piso los pone donde tienen sentido (pegados a un
// muro de verdad o sobre un piso que se pisa) y que el pintor los pinta bien: sin rectángulo visible, siempre
// igual para el mismo rastro, y con las capas en el orden correcto.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { Rejilla } from '../../src/mundo/Rejilla';
import { PISOS } from '../../src/pisos/catalogo';
import type { DefRastro } from '../../src/pisos/TiposPiso';
import { altoNecesarioConteo, pintarRastro, ponerDebajo } from '../../src/render/texturas/PintorRastros';

const C = CONFIG.celda;

describe.each(PISOS.map((p) => [p.id, p] as const))('Rastros de %s', (_id, piso) => {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const rastros = piso.rastros ?? [];
  const enMuro = rastros.filter((r) => r.tipo !== 'charco');
  const enPiso = rastros.filter((r) => r.tipo === 'charco');

  it('no repiten id (la telemetría los cuenta por id)', () => {
    const ids = rastros.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los de muro están pegados a la cara de un muro en TODO su ancho, con aire delante', () => {
    // A 2 cm hacia atrás tiene que haber muro y a 2 cm hacia adelante, aire (se pise o sea el hueco de una
    // escalera). Lo miro en los dos extremos y en el centro: si no, un rastro ancho quedaría colgando en una
    // esquina o tapando una puerta.
    const margen = 0.02 / C;
    const rotos = enMuro.flatMap((r) => {
      const ang = (r.rot * Math.PI) / 180;
      const [nx, ny] = [Math.sin(ang), Math.cos(ang)];
      const [tx, ty] = [Math.cos(ang), -Math.sin(ang)];
      const medio = (r.ancho / 2 - 0.02) / C;
      return [-medio, 0, medio].flatMap((s) => {
        const [px, py] = [r.x + tx * s, r.y + ty * s];
        const detras = rejilla.esMuro(Math.floor(px - nx * margen), Math.floor(py - ny * margen));
        const delante = !rejilla.esMuro(Math.floor(px + nx * margen), Math.floor(py + ny * margen));
        return detras && delante ? [] : [`${r.id} en (${px.toFixed(2)}, ${py.toFixed(2)}): muro detrás ${detras}, aire delante ${delante}`];
      });
    });
    expect(rotos).toEqual([]);
  });

  it('los de muro caben entre el piso y el techo', () => {
    const rotos = enMuro.filter((r) => r.altura - r.alto / 2 < 0 || r.altura + r.alto / 2 > CONFIG.alturaTecho);
    expect(rotos.map((r) => r.id)).toEqual([]);
  });

  it('los de piso caen enteros sobre celdas que se pisan (ni muro ni hueco de escalera)', () => {
    const rotos = enPiso.flatMap((r) => {
      const ang = (r.rot * Math.PI) / 180;
      const [ax, ay] = [Math.sin(ang), Math.cos(ang)];
      const [bx, by] = [Math.cos(ang), -Math.sin(ang)];
      const esquinas = [-1, 1].flatMap((i) => [-1, 1].map((j) => [r.x + ((bx * r.ancho) / 2) * i / C + ((ax * r.alto) / 2) * j / C, r.y + ((by * r.ancho) / 2) * i / C + ((ay * r.alto) / 2) * j / C]));
      return esquinas.filter(([x, y]) => !rejilla.esTransitable(Math.floor(x), Math.floor(y))).map(([x, y]) => `${r.id}: esquina en (${x.toFixed(2)}, ${y.toFixed(2)})`);
    });
    expect(rotos).toEqual([]);
  });

  it('las rayas de estatura y su mancha quedan dentro del cuadro (lejos del borde que se desvanece)', () => {
    const rotos = rastros.flatMap((r) => {
      if (r.tipo !== 'estatura') return [];
      const alturas = [...r.marcas.map((m) => m.altura), ...(r.mancha !== undefined ? [r.mancha] : [])];
      return alturas.filter((a) => Math.abs(a - r.altura) > r.alto / 2 - 0.03).map((a) => `${r.id}: algo a ${a} m queda fuera`);
    });
    expect(rotos).toEqual([]);
  });

  it('cada conteo cabe completo en su cuadro', () => {
    const rotos = rastros.flatMap((r) => (r.tipo === 'conteo' && altoNecesarioConteo(r.ancho, r.cuenta) > r.alto ? [`${r.id}: necesita ${altoNecesarioConteo(r.ancho, r.cuenta).toFixed(3)} m`] : []));
    expect(rotos).toEqual([]);
  });
});

/** Un ejemplar de cada tipo, pequeño (las pruebas corren rápido). */
const EJEMPLOS: readonly DefRastro[] = [
  { tipo: 'charco', id: 'prueba_charco', x: 0, y: 0, rot: 0, ancho: 0.6, alto: 0.5 },
  { tipo: 'mano', id: 'prueba_mano', x: 0, y: 0, rot: 0, altura: 1, ancho: 0.6, alto: 0.5 },
  { tipo: 'estatura', id: 'prueba_estatura', x: 0, y: 0, rot: 0, altura: 1.1, ancho: 0.3, alto: 0.4, mancha: 1.15, marcas: [{ altura: 1.0, texto: 'uno' }, { altura: 1.1, texto: '' }] },
  { tipo: 'conteo', id: 'prueba_conteo', x: 0, y: 0, rot: 0, altura: 1, ancho: 0.4, alto: 0.2, cuenta: 12 },
];

/** Cuántos píxeles tienen algo pintado, y el alfa más alto del borde del cuadro. */
function medir(datos: Uint8ClampedArray, ancho: number, alto: number): { cubiertos: number; bordeMax: number } {
  let cubiertos = 0;
  let bordeMax = 0;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const a = datos[(y * ancho + x) * 4 + 3];
      if (a > 25) cubiertos++;
      if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1) bordeMax = Math.max(bordeMax, a);
    }
  }
  return { cubiertos, bordeMax };
}

describe.each(EJEMPLOS.map((d) => [d.tipo, d] as const))('Pintar un rastro de tipo %s', (_tipo, def) => {
  const p = pintarRastro(def, 0.5);

  it('mide lo que dice su cuadro (en píxeles, según la escala)', () => {
    expect(p.datos.length).toBe(p.ancho * p.alto * 4);
    expect(p.ancho / p.alto).toBeCloseTo(def.ancho / def.alto, 1);
  });

  it('pinta algo, y el borde del cuadro queda transparente (nunca se ve el rectángulo)', () => {
    const { cubiertos, bordeMax } = medir(p.datos, p.ancho, p.alto);
    expect(cubiertos).toBeGreaterThan(0);
    expect(bordeMax).toBe(0);
  });

  it('el mismo rastro sale siempre igual, y otro id lo pinta distinto', () => {
    expect(pintarRastro(def, 0.5).datos).toEqual(p.datos);
    expect(pintarRastro({ ...def, id: `${def.id}_otro` }, 0.5).datos).not.toEqual(p.datos);
  });

  it('a media escala tiene la mitad de píxeles por lado', () => {
    const completo = pintarRastro(def, 1);
    expect(Math.abs(completo.ancho - 2 * p.ancho)).toBeLessThanOrEqual(1);
    expect(Math.abs(completo.alto - 2 * p.alto)).toBeLessThanOrEqual(1);
  });
});

describe('Las letras de la estatura', () => {
  it('salen solo para las rayas con texto, a la derecha de la raya y dentro del cuadro', () => {
    const def = EJEMPLOS.find((d) => d.tipo === 'estatura')!;
    const p = pintarRastro(def, 1);
    expect(p.letras.map((l) => l.texto)).toEqual(['uno']);
    const [l] = p.letras;
    expect(l.x).toBeGreaterThan(p.ancho * 0.3);
    expect(l.x).toBeLessThan(p.ancho);
    expect(l.y).toBeGreaterThan(0);
    expect(l.y).toBeLessThan(p.alto);
  });

  it('los demás rastros no escriben nada', () => {
    for (const def of EJEMPLOS.filter((d) => d.tipo !== 'estatura')) expect(pintarRastro(def, 0.5).letras).toEqual([]);
  });
});

describe('Poner una capa debajo del rastro', () => {
  const pixel = (r: number, g: number, b: number, a: number) => new Uint8ClampedArray([r, g, b, a]);

  it('lo opaco de arriba tapa lo de abajo; lo transparente lo deja ver', () => {
    expect([...ponerDebajo(pixel(10, 20, 30, 255), pixel(200, 200, 200, 255))]).toEqual([10, 20, 30, 255]);
    expect([...ponerDebajo(pixel(10, 20, 30, 0), pixel(200, 100, 50, 255))]).toEqual([200, 100, 50, 255]);
  });

  it('a medias, mezcla los colores y suma la opacidad', () => {
    const [r, , , a] = ponerDebajo(pixel(0, 0, 0, 128), pixel(200, 200, 200, 255));
    expect(a).toBe(255);
    expect(r).toBeGreaterThan(90);
    expect(r).toBeLessThan(110);
  });

  it('se niega a mezclar capas de distinto tamaño', () => {
    expect(() => ponerDebajo(new Uint8ClampedArray(8), new Uint8ClampedArray(4))).toThrow();
  });
});
