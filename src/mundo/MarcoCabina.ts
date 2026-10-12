// Aquí veo la cabina de un ascensor como un marco propio: dónde está, hacia dónde da su boca (el lado de las puertas,
// que da al pasillo) y cómo paso de ese marco al mundo. Lo usan el modelo (dónde va cada pieza), el ascensor (¿estoy
// adentro?, ¿hay alguien en la puerta?) y las pruebas de los paquetes (¿la 'A' está bien puesta en la rejilla?).
//
// El marco: u crece hacia afuera desde el centro de la celda (las puertas están en u = celda / 2) y v crece hacia la
// derecha de quien mira hacia afuera. En metros.
import { CONFIG } from '../config/ConfiguracionJuego';
import type { Rejilla } from './Rejilla';

const MEDIO = CONFIG.celda / 2;

/** Dónde va cada cosa de la cabina, en el marco (u, v) y a qué altura (y), en metros. */
export const DISPOSICION_CABINA = {
  /** El botón de llamar: afuera, en el pedazo de muro a la derecha de las puertas (mirándolas desde el pasillo). */
  llamar: { u: MEDIO + 0.012, v: -0.585, y: 1.1 },
  /** El panel: adentro, en el muro de la derecha de quien sale, cerca de las puertas. */
  panel: { u: MEDIO - 0.3, v: MEDIO - 0.012, y: 1.22 },
  /** Distancia vertical entre dos botones del panel. */
  entreBotones: 0.085,
} as const;

const VECINAS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * La boca de la cabina en (gx, gy): la única vecina que no es muro, que tiene que ser piso (ni una puerta, ni otra
 * cabina, ni el hueco de una escalera). Null si ahí no hay una cabina bien puesta.
 */
export function bocaDeCabina(rejilla: Rejilla, gx: number, gy: number): { dx: number; dy: number } | null {
  if (!rejilla.esCabina(gx, gy)) return null;
  const libres = VECINAS.filter(([dx, dy]) => !rejilla.esMuro(gx + dx, gy + dy));
  if (libres.length !== 1) return null;
  const [dx, dy] = libres[0];
  const nx = gx + dx;
  const ny = gy + dy;
  if (!rejilla.esTransitable(nx, ny) || rejilla.esPuerta(nx, ny) || rejilla.esCabina(nx, ny)) return null;
  return { dx, dy };
}

export class MarcoCabina {
  /** El centro de la celda, en metros. */
  readonly cx: number;
  readonly cz: number;
  /** Hacia afuera (de la cabina a la boca). */
  readonly fx: number;
  readonly fz: number;
  /** El giro (rotation.y) de algo cuya cara +Z mira hacia afuera: en su espacio, +X es la IZQUIERDA de quien sale. */
  readonly angulo: number;
  /** Media celda: las puertas están a esta distancia del centro, hacia afuera. */
  readonly medio = CONFIG.celda / 2;

  constructor(
    readonly gx: number,
    readonly gy: number,
    rejilla: Rejilla,
  ) {
    const boca = bocaDeCabina(rejilla, gx, gy);
    if (!boca) throw new Error(`En (${gx}, ${gy}) no hay una cabina de ascensor con una sola boca hacia un piso.`);
    this.cx = rejilla.centro(gx);
    this.cz = rejilla.centro(gy);
    this.fx = boca.dx;
    this.fz = boca.dy;
    this.angulo = Math.atan2(this.fx, this.fz);
  }

  /** Del marco de la cabina al mundo. */
  aMundo(u: number, v: number): { x: number; z: number } {
    // La derecha de quien mira hacia afuera: (-fz, fx).
    return { x: this.cx + this.fx * u - this.fz * v, z: this.cz + this.fz * u + this.fx * v };
  }

  /** Del mundo al marco de la cabina. */
  aLocal(x: number, z: number): { u: number; v: number } {
    const dx = x - this.cx;
    const dz = z - this.cz;
    return { u: dx * this.fx + dz * this.fz, v: -dx * this.fz + dz * this.fx };
  }

  /** ¿El punto está dentro de la cabina, del lado de adentro de las puertas? */
  dentro(x: number, z: number): boolean {
    const { u, v } = this.aLocal(x, z);
    return Math.abs(v) < this.medio && u > -this.medio && u < this.medio;
  }

  /** ¿Un círculo de este radio toca el plano de las puertas, dentro del vano? (El sensor que las vuelve a abrir.) */
  enLaPuerta(x: number, z: number, radio: number): boolean {
    const { u, v } = this.aLocal(x, z);
    return Math.abs(u - this.medio) < radio && Math.abs(v) < CONFIG.anchoVano / 2 + radio * 0.5;
  }
}
