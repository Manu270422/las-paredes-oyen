// Aquí interpreto la rejilla del mapa y respondo preguntas espaciales:
// ¿esta celda es muro? ¿es el hueco de una escalera? ¿hay línea de visión? ¿cuántas paredes hay entre
// el jugador y ese sonido? Estas consultas alimentan colisiones, audio
// (oclusión) e IA (oír a través de muros).
import { CONFIG } from '../config/ConfiguracionJuego';

/** Función que me dice si una celda de puerta está cerrada (la provee el nivel). */
export type ConsultaPuertaCerrada = (gx: number, gy: number) => boolean;

export class Rejilla {
  readonly ancho: number;
  readonly alto: number;
  readonly celda = CONFIG.celda;
  private readonly celdas: string[];

  constructor(filas: readonly string[]) {
    this.alto = filas.length;
    this.ancho = Math.max(...filas.map((f) => f.length));
    this.celdas = filas.map((f) => f.padEnd(this.ancho, '#'));
  }

  caracter(gx: number, gy: number): string {
    if (gx < 0 || gy < 0 || gx >= this.ancho || gy >= this.alto) return '#';
    return this.celdas[gy][gx];
  }

  esMuro(gx: number, gy: number): boolean {
    const c = this.caracter(gx, gy);
    return c !== '.' && c !== 'P' && c !== 'E';
  }

  esPuerta(gx: number, gy: number): boolean {
    return this.caracter(gx, gy) === 'P';
  }

  /**
   * El hueco de una escalera ('E'): para la vista y el sonido es aire (no es muro), pero
   * nadie camina por él (no es transitable): ni el jugador, ni la criatura, ni un evento.
   */
  esHueco(gx: number, gy: number): boolean {
    return this.caracter(gx, gy) === 'E';
  }

  esTransitable(gx: number, gy: number): boolean {
    return !this.esMuro(gx, gy) && !this.esHueco(gx, gy);
  }

  /** Paso de metros a índice de celda. */
  aCelda(metros: number): number {
    return Math.floor(metros / this.celda);
  }

  /** Centro de una celda en metros. */
  centro(indice: number): number {
    return (indice + 0.5) * this.celda;
  }

  /**
   * Recorro las celdas que atraviesa un segmento (algoritmo DDA de Amanatides-Woo).
   * Llamo a "visitar" por cada celda; si devuelve false, me detengo.
   */
  recorrer(ax: number, az: number, bx: number, bz: number, visitar: (gx: number, gy: number) => boolean): void {
    const c = this.celda;
    let gx = Math.floor(ax / c);
    let gy = Math.floor(az / c);
    const fx = Math.floor(bx / c);
    const fy = Math.floor(bz / c);
    const dx = bx - ax;
    const dz = bz - az;
    const pasoX = dx > 0 ? 1 : -1;
    const pasoY = dz > 0 ? 1 : -1;
    const deltaX = dx !== 0 ? Math.abs(c / dx) : Infinity;
    const deltaY = dz !== 0 ? Math.abs(c / dz) : Infinity;
    let maxX = dx !== 0 ? ((dx > 0 ? (gx + 1) * c - ax : ax - gx * c) / Math.abs(dx)) : Infinity;
    let maxY = dz !== 0 ? ((dz > 0 ? (gy + 1) * c - az : az - gy * c) / Math.abs(dz)) : Infinity;
    let seguridad = this.ancho + this.alto + 4;
    while (seguridad-- > 0) {
      if (!visitar(gx, gy)) return;
      if (gx === fx && gy === fy) return;
      if (maxX < maxY) {
        maxX += deltaX;
        gx += pasoX;
      } else {
        maxY += deltaY;
        gy += pasoY;
      }
    }
  }

  /**
   * Cuento cuántos obstáculos hay entre dos puntos. Los muros cuentan 1 y las
   * puertas cerradas 0.6 (la madera deja pasar más sonido que el ladrillo).
   */
  contarObstaculos(ax: number, az: number, bx: number, bz: number, puertaCerrada: ConsultaPuertaCerrada): number {
    let total = 0;
    let enMuro = false;
    this.recorrer(ax, az, bx, bz, (gx, gy) => {
      if (this.esPuerta(gx, gy)) {
        if (puertaCerrada(gx, gy)) total += 0.6;
        enMuro = false;
      } else if (this.esMuro(gx, gy)) {
        // Un muro grueso de varias celdas cuenta un poco más, pero no lineal.
        total += enMuro ? 0.35 : 1;
        enMuro = true;
      } else {
        enMuro = false;
      }
      return total < 6;
    });
    return total;
  }

  /** ¿Se ve B desde A? (sin muros ni puertas cerradas en medio). */
  hayLineaDeVision(ax: number, az: number, bx: number, bz: number, puertaCerrada: ConsultaPuertaCerrada): boolean {
    let libre = true;
    this.recorrer(ax, az, bx, bz, (gx, gy) => {
      if (this.esMuro(gx, gy) || (this.esPuerta(gx, gy) && puertaCerrada(gx, gy))) {
        libre = false;
        return false;
      }
      return true;
    });
    return libre;
  }

  /**
   * Distancia aproximada desde un punto a la pared más cercana (reviso las 8 vecinas).
   * La uso para la regla central: pegado a la pared, se me oye más.
   */
  distanciaAPared(x: number, z: number): number {
    const c = this.celda;
    const gx = Math.floor(x / c);
    const gy = Math.floor(z / c);
    let minima = Infinity;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = gx + ox;
        const ny = gy + oy;
        if (!this.esMuro(nx, ny)) continue;
        // Distancia del punto a la caja de esa celda.
        const cx = Math.max(nx * c, Math.min(x, (nx + 1) * c));
        const cz = Math.max(ny * c, Math.min(z, (ny + 1) * c));
        minima = Math.min(minima, Math.hypot(x - cx, z - cz));
      }
    }
    return minima;
  }

  /** Busco la celda de muro más cercana a un punto (para ubicar sonidos "dentro de la pared"). */
  muroMasCercano(x: number, z: number, radioCeldas = 3): { gx: number; gy: number } | null {
    const gx0 = Math.floor(x / this.celda);
    const gy0 = Math.floor(z / this.celda);
    let mejor: { gx: number; gy: number } | null = null;
    let mejorDistancia = Infinity;
    for (let oy = -radioCeldas; oy <= radioCeldas; oy++) {
      for (let ox = -radioCeldas; ox <= radioCeldas; ox++) {
        const gx = gx0 + ox;
        const gy = gy0 + oy;
        if (!this.esMuro(gx, gy) || gx <= 0 || gy <= 0 || gx >= this.ancho - 1 || gy >= this.alto - 1) continue;
        // Solo me sirven muros que dan a un espacio abierto (la superficie de la pared). Un muro que da al aire
        // del hueco de la escalera también es superficie: el sonido sale de ahí igual, aunque no se pise.
        const daAEspacio = !this.esMuro(gx + 1, gy) || !this.esMuro(gx - 1, gy) || !this.esMuro(gx, gy + 1) || !this.esMuro(gx, gy - 1);
        if (!daAEspacio) continue;
        const d = Math.hypot(this.centro(gx) - x, this.centro(gy) - z);
        if (d < mejorDistancia) {
          mejorDistancia = d;
          mejor = { gx, gy };
        }
      }
    }
    return mejor;
  }
}
