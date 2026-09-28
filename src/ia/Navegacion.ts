// Aquí busco caminos con A* sobre la rejilla del mapa. Uso 4 direcciones
// (sin diagonales) para que la criatura nunca corte esquinas atravesando muros.
// Las puertas cerradas cuestan más: prefiere rutas abiertas, pero abre si hace falta.
import type { Rejilla } from '../mundo/Rejilla';
import type { Celda } from './TiposIA';

export type CostoExtra = (gx: number, gy: number) => number;

export class Navegacion {
  constructor(private readonly rejilla: Rejilla) {}

  buscar(desde: Celda, hasta: Celda, costoExtra?: CostoExtra): Celda[] | null {
    const r = this.rejilla;
    if (!r.esTransitable(hasta.gx, hasta.gy) || !r.esTransitable(desde.gx, desde.gy)) return null;
    const ancho = r.ancho;
    const indice = (gx: number, gy: number) => gy * ancho + gx;
    const inicio = indice(desde.gx, desde.gy);
    const meta = indice(hasta.gx, hasta.gy);
    const g = new Map<number, number>([[inicio, 0]]);
    const padre = new Map<number, number>();
    const abiertos = new Map<number, number>([[inicio, this.heuristica(desde, hasta)]]);
    const cerrados = new Set<number>();

    while (abiertos.size > 0) {
      // Con un mapa pequeño, buscar el mínimo linealmente es más que suficiente.
      let actual = -1;
      let mejor = Infinity;
      for (const [nodo, f] of abiertos) {
        if (f < mejor) {
          mejor = f;
          actual = nodo;
        }
      }
      if (actual === meta) return this.reconstruir(padre, actual, ancho);
      abiertos.delete(actual);
      cerrados.add(actual);
      const cx = actual % ancho;
      const cy = Math.floor(actual / ancho);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!r.esTransitable(nx, ny)) continue;
        const vecino = indice(nx, ny);
        if (cerrados.has(vecino)) continue;
        const costo = (g.get(actual) ?? 0) + 1 + (costoExtra ? costoExtra(nx, ny) : 0);
        if (costo < (g.get(vecino) ?? Infinity)) {
          g.set(vecino, costo);
          padre.set(vecino, actual);
          abiertos.set(vecino, costo + this.heuristica({ gx: nx, gy: ny }, hasta));
        }
      }
    }
    return null;
  }

  private heuristica(a: Celda, b: Celda): number {
    return Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
  }

  private reconstruir(padre: Map<number, number>, final: number, ancho: number): Celda[] {
    const camino: Celda[] = [];
    let actual: number | undefined = final;
    while (actual !== undefined) {
      camino.push({ gx: actual % ancho, gy: Math.floor(actual / ancho) });
      actual = padre.get(actual);
    }
    return camino.reverse();
  }
}
