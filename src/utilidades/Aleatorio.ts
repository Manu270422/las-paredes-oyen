// Aquí tengo un generador aleatorio con semilla (mulberry32).
// Lo necesito para que las texturas procedurales salgan SIEMPRE iguales:
// si uso Math.random() cada partida tendría paredes distintas.

export type GeneradorAleatorio = () => number;

/** Creo un generador reproducible a partir de una semilla entera. */
export function crearGenerador(semilla: number): GeneradorAleatorio {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
