// Aquí guardo las funciones matemáticas pequeñas que uso en todo el juego.
// Las tengo separadas para no repetir fórmulas en cada sistema.

export const GRADOS = Math.PI / 180;

/** Limito un valor entre un mínimo y un máximo. */
export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Interpolo linealmente entre a y b. */
export function interpolar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Acerco "actual" a "objetivo" de forma exponencial.
 * Lo uso en vez de interpolar con un t fijo porque así el resultado
 * es igual a 30, 60 o 144 FPS (no depende del framerate).
 */
export function amortiguar(actual: number, objetivo: number, rapidez: number, dt: number): number {
  return interpolar(actual, objetivo, 1 - Math.exp(-rapidez * dt));
}

/** Curva suave (smoothstep) para transiciones sin cortes bruscos. */
export function suavizar(t: number): number {
  const x = limitar(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Número aleatorio decimal entre min y max. */
export function aleatorio(minimo: number, maximo: number): number {
  return minimo + Math.random() * (maximo - minimo);
}

/** Número aleatorio entero entre min y max (ambos incluidos). */
export function aleatorioEntero(minimo: number, maximo: number): number {
  return Math.floor(aleatorio(minimo, maximo + 1));
}

/** Escojo un elemento al azar de una lista. */
export function elegir<T>(lista: readonly T[]): T | undefined {
  if (lista.length === 0) return undefined;
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Escojo un elemento según su peso: los de más peso salen más seguido.
 * Es la base de mi director de terror para elegir eventos.
 */
export function elegirPonderado<T>(lista: readonly T[], peso: (elemento: T) => number): T | null {
  let total = 0;
  for (const elemento of lista) total += Math.max(0, peso(elemento));
  if (total <= 0) return null;
  let tirada = Math.random() * total;
  for (const elemento of lista) {
    tirada -= Math.max(0, peso(elemento));
    if (tirada <= 0) return elemento;
  }
  return lista[lista.length - 1] ?? null;
}

/** Normalizo un ángulo al rango [-PI, PI]. */
export function normalizarAngulo(angulo: number): number {
  let a = angulo;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Distancia en el plano horizontal (ignoro la altura). */
export function distancia2D(ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}
