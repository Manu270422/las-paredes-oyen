// Aquí resuelvo colisiones en el plano horizontal. En este juego no salto
// ni caigo, así que un círculo (yo) contra cajas (muros, muebles, puertas)
// es suficiente, estable y muy barato incluso en celulares.

export interface CajaColision {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PuntoMovil {
  x: number;
  z: number;
}

/**
 * Empujo el círculo fuera de cada caja que lo toca.
 * Hago dos pasadas porque en esquinas una caja puede empujarme contra otra.
 */
export function resolverCirculo(punto: PuntoMovil, radio: number, cajas: readonly CajaColision[]): boolean {
  let choco = false;
  for (let pasada = 0; pasada < 2; pasada++) {
    for (const caja of cajas) {
      const cx = Math.max(caja.minX, Math.min(punto.x, caja.maxX));
      const cz = Math.max(caja.minZ, Math.min(punto.z, caja.maxZ));
      const dx = punto.x - cx;
      const dz = punto.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radio * radio) continue;
      choco = true;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const empuje = radio - d;
        punto.x += (dx / d) * empuje;
        punto.z += (dz / d) * empuje;
      } else {
        // Estoy dentro de la caja: salgo por el lado más cercano.
        const izquierda = punto.x - caja.minX;
        const derecha = caja.maxX - punto.x;
        const arriba = punto.z - caja.minZ;
        const abajo = caja.maxZ - punto.z;
        const minimo = Math.min(izquierda, derecha, arriba, abajo);
        if (minimo === izquierda) punto.x = caja.minX - radio;
        else if (minimo === derecha) punto.x = caja.maxX + radio;
        else if (minimo === arriba) punto.z = caja.minZ - radio;
        else punto.z = caja.maxZ + radio;
      }
    }
  }
  return choco;
}

/** ¿Un punto está dentro de alguna caja (con margen)? */
export function puntoDentro(x: number, z: number, cajas: readonly CajaColision[], margen = 0): boolean {
  return cajas.some((c) => x > c.minX - margen && x < c.maxX + margen && z > c.minZ - margen && z < c.maxZ + margen);
}
