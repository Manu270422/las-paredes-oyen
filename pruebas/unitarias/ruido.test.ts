// El ruido es la base de TODAS las texturas del juego (paredes, pisos, rastros). Pruebo que el atajo de la
// red (cuando el periodo es múltiplo de 256 me salto los módulos) da exactamente lo mismo que envolver con
// módulos, como lo hacía antes. Si no, cambiaría el aspecto de todo el edificio sin que nadie lo pidiera.
import { describe, expect, it } from 'vitest';
import { Ruido2D } from '../../src/utilidades/Ruido';

/** El ruido de valor tal como lo calculaba antes del atajo: envolviendo cada esquina con módulos. */
function valorConModulos(tabla: Float32Array, x: number, y: number, periodo: number): number {
  const red = (ix: number, iy: number) => {
    const ex = ((ix % periodo) + periodo) % periodo;
    const ey = ((iy % periodo) + periodo) % periodo;
    return tabla[(ey & 255) * 256 + (ex & 255)];
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = red(ix, iy);
  const b = red(ix + 1, iy);
  const c = red(ix, iy + 1);
  const d = red(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Puntos repartidos (también negativos y lejos del origen), siempre los mismos. */
function puntos(cuantos: number): Array<[number, number]> {
  let s = 12345;
  const azar = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return Array.from({ length: cuantos }, () => [(azar() - 0.5) * 1400, (azar() - 0.5) * 1400]);
}

describe('El ruido de valor', () => {
  const ruido = new Ruido2D(7);
  const tabla = (ruido as unknown as { tabla: Float32Array }).tabla;

  it.each([256, 512, 1024, 2048])('con periodo %i da exactamente lo mismo que con módulos', (periodo) => {
    const distintos = puntos(4000).filter(([x, y]) => ruido.valor(x, y, periodo) !== valorConModulos(tabla, x, y, periodo));
    expect(distintos).toEqual([]);
  });

  it('con un periodo que no es múltiplo de 256 sigue envolviendo por ese periodo', () => {
    for (const [x, y] of puntos(500)) {
      expect(ruido.valor(x, y, 64)).toBe(valorConModulos(tabla, x, y, 64));
      expect(ruido.valor(x + 64, y, 64)).toBeCloseTo(ruido.valor(x, y, 64), 9);
    }
  });

  it('el fractal queda entre 0 y 1', () => {
    for (const [x, y] of puntos(500)) {
      const v = ruido.fractal(x, y, 4, 256);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
