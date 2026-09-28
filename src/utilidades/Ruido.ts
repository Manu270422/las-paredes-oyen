// Aquí implemento ruido de valor 2D "enlosable" (que se repite sin costuras).
// Lo uso para generar manchas de humedad, grietas, vetas de madera, etc.
// El parámetro "periodo" hace que el patrón se repita exactamente, así las
// texturas no muestran cortes cuando se repiten en una pared.
import { crearGenerador } from './Aleatorio';

export class Ruido2D {
  private readonly tabla = new Float32Array(256 * 256);

  constructor(semilla = 1) {
    // Lleno la tabla de valores aleatorios fijos para esta semilla.
    const aleatorio = crearGenerador(semilla);
    for (let i = 0; i < this.tabla.length; i++) this.tabla[i] = aleatorio();
  }

  /** Leo el valor de la red en una esquina entera, envolviendo según el periodo. */
  private red(ix: number, iy: number, periodo: number): number {
    const x = ((ix % periodo) + periodo) % periodo;
    const y = ((iy % periodo) + periodo) % periodo;
    return this.tabla[(y & 255) * 256 + (x & 255)];
  }

  /** Ruido de valor suavizado entre 0 y 1. */
  valor(x: number, y: number, periodo = 256): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    // Suavizo la interpolación para evitar el aspecto "cuadriculado".
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = this.red(ix, iy, periodo);
    const b = this.red(ix + 1, iy, periodo);
    const c = this.red(ix, iy + 1, periodo);
    const d = this.red(ix + 1, iy + 1, periodo);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  /**
   * Ruido fractal (varias capas de detalle). x e y van de 0 a periodoBase
   * para cubrir la textura completa una vez.
   */
  fractal(x: number, y: number, octavas: number, periodoBase: number): number {
    let suma = 0;
    let amplitud = 0.5;
    let frecuencia = 1;
    let normalizador = 0;
    for (let o = 0; o < octavas; o++) {
      suma += amplitud * this.valor(x * frecuencia, y * frecuencia, periodoBase * frecuencia);
      normalizador += amplitud;
      amplitud *= 0.5;
      frecuencia *= 2;
    }
    return suma / normalizador;
  }
}
