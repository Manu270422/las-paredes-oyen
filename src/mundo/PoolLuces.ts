// Aquí manejo un "pool" de luces puntuales. En WebGL cada luz extra encarece
// TODOS los shaders, y cambiar la cantidad de luces obliga a recompilarlos
// (tirones). Por eso creo un número fijo de luces según la calidad y se las
// asigno cada fotograma a las lámparas más relevantes para el jugador.
import { PointLight, type Object3D } from 'three';
import type { Lampara } from './Lampara';

/** Candelas por unidad de "intensidad" de lámpara (luz física de Three.js). */
const CANDELAS = 4.2;

export class PoolLuces {
  private readonly luces: PointLight[] = [];

  constructor(padre: Object3D, cantidad: number) {
    for (let i = 0; i < cantidad; i++) {
      const luz = new PointLight(0xffffff, 0, 9, 2);
      luz.castShadow = false;
      luz.name = `pool-luz-${i}`;
      padre.add(luz);
      this.luces.push(luz);
    }
  }

  actualizar(lamparas: readonly Lampara[], x: number, z: number): void {
    // Puntúo cada lámpara: brillante y cercana = más importante.
    const candidatas = lamparas
      .filter((l) => l.brillo > 0.001)
      .map((l) => {
        const dx = l.posicion.x - x;
        const dz = l.posicion.z - z;
        return { l, puntaje: l.intensidad / (1 + (dx * dx + dz * dz) * 0.08) };
      })
      .sort((a, b) => b.puntaje - a.puntaje);

    for (let i = 0; i < this.luces.length; i++) {
      const luz = this.luces[i];
      const candidata = candidatas[i];
      if (!candidata) {
        luz.intensity = 0;
        continue;
      }
      const l = candidata.l;
      luz.position.set(l.posicion.x, l.posicion.y - 0.1, l.posicion.z);
      luz.color.copy(l.color);
      luz.intensity = l.brillo * CANDELAS;
      luz.distance = l.tipo === 'emergencia' ? 6 : 9;
    }
  }
}
