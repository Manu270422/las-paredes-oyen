// Aquí están las piezas básicas de síntesis de audio que uso para crear
// TODOS los sonidos del juego desde cero: ruido, filtros, resonadores y
// envolventes. Trabajo directamente sobre arreglos de muestras (Float32Array).

export const ruido = (): number => Math.random() * 2 - 1;

/** Genero un arreglo de muestras llamando a fn(t, i) para cada una. */
export function crearMuestras(duracion: number, tasa: number, fn: (t: number, i: number) => number): Float32Array {
  const total = Math.max(1, Math.floor(duracion * tasa));
  const datos = new Float32Array(total);
  for (let i = 0; i < total; i++) datos[i] = fn(i / tasa, i);
  return datos;
}

/** Ajusto el volumen para que el pico quede en "pico" (evita saturar y unifica niveles). */
export function normalizar(datos: Float32Array, pico = 0.9): Float32Array {
  let maximo = 0;
  for (let i = 0; i < datos.length; i++) maximo = Math.max(maximo, Math.abs(datos[i]));
  if (maximo < 1e-6) return datos;
  const k = pico / maximo;
  for (let i = 0; i < datos.length; i++) datos[i] *= k;
  return datos;
}

/** Suavizo el inicio y el final para que no haya "clics" al cortar el sonido. */
export function fundidos(datos: Float32Array, tasa: number, entrada = 0.002, salida = 0.01): Float32Array {
  const ne = Math.floor(entrada * tasa);
  const ns = Math.floor(salida * tasa);
  for (let i = 0; i < ne && i < datos.length; i++) datos[i] *= i / ne;
  for (let i = 0; i < ns && i < datos.length; i++) datos[datos.length - 1 - i] *= i / ns;
  return datos;
}

/** Envolvente de ataque lineal y caída exponencial. */
export function envolvente(t: number, ataque: number, caida: number): number {
  if (t < 0) return 0;
  if (t < ataque) return t / ataque;
  return Math.exp(-(t - ataque) / caida);
}

/** Filtro pasa bajos de un polo: suaviza, quita agudos. */
export class PasaBajos {
  private y = 0;
  private a: number;
  constructor(corte: number, private readonly tasa: number) {
    this.a = Math.exp((-2 * Math.PI * corte) / tasa);
  }
  fijarCorte(corte: number): void {
    this.a = Math.exp((-2 * Math.PI * corte) / this.tasa);
  }
  procesar(x: number): number {
    this.y = (1 - this.a) * x + this.a * this.y;
    return this.y;
  }
}

/** Pasa altos de un polo: quita graves. */
export class PasaAltos {
  private readonly bajos: PasaBajos;
  constructor(corte: number, tasa: number) {
    this.bajos = new PasaBajos(corte, tasa);
  }
  procesar(x: number): number {
    return x - this.bajos.procesar(x);
  }
}

/**
 * Biquad pasa banda (fórmulas del "Audio EQ Cookbook" de R. Bristow-Johnson).
 * Con Q alto funciona como resonador: si lo golpeo con un impulso, "suena"
 * a esa frecuencia. Así fabrico madera, metal, voces y crujidos.
 */
export class PasaBanda {
  private b0 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  constructor(frecuencia: number, private readonly q: number, private readonly tasa: number) {
    this.fijar(frecuencia);
  }
  fijar(frecuencia: number): void {
    const w0 = (2 * Math.PI * Math.min(frecuencia, this.tasa * 0.45)) / this.tasa;
    const alfa = Math.sin(w0) / (2 * this.q);
    const a0 = 1 + alfa;
    this.b0 = alfa / a0;
    this.b2 = -alfa / a0;
    this.a1 = (-2 * Math.cos(w0)) / a0;
    this.a2 = (1 - alfa) / a0;
  }
  procesar(x: number): number {
    const y = this.b0 * x + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Saturación suave (tanh): calienta y ensucia el sonido. */
export const saturar = (x: number, cantidad: number): number => Math.tanh(x * cantidad) / Math.tanh(cantidad);

/** Mezclo varios arreglos en uno (el más largo define la duración). */
export function mezclar(...pistas: Float32Array[]): Float32Array {
  const largo = Math.max(...pistas.map((p) => p.length));
  const salida = new Float32Array(largo);
  for (const pista of pistas) for (let i = 0; i < pista.length; i++) salida[i] += pista[i];
  return salida;
}

/** Desplazo una pista en el tiempo (agrego silencio al principio). */
export function desplazar(datos: Float32Array, segundos: number, tasa: number): Float32Array {
  const n = Math.floor(segundos * tasa);
  const salida = new Float32Array(datos.length + n);
  salida.set(datos, n);
  return salida;
}
