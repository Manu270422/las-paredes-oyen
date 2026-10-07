// Aquí pinto, píxel a píxel, los RASTROS de lo que pasó en un piso: una mancha vieja que alguien quiso
// limpiar, una mano que bajó apoyándose en la pared, las rayas de lápiz de la estatura de un niño, un conteo
// rayado en la pintura, una frase escrita con el dedo, la humedad que baja por un techo. Es lógica pura (un
// arreglo RGBA, sin lienzo ni navegador): así la pruebo en Node. Las letras de una frase las traza quien
// tenga un lienzo, y yo las convierto en sangre.
//
// Las reglas que me puse:
// - Todo es VIEJO: café oscuro, casi negro, nada de rojo brillante. Sin linterna casi no se distingue.
// - Frases, pocas y con razón: las escribió gente que ya no podía hablar (él repite las voces, como cuenta el
//   diario del 401). Nunca un mensaje de la criatura, y nunca una frase solo para asustar.
// - El borde del cuadro siempre queda transparente (alfa 0): nunca se ve el rectángulo del calco.
//
// Mido todo en METROS sobre la superficie (x a la derecha, y hacia abajo desde la esquina de arriba a la
// izquierda del cuadro) y lo paso a píxeles al final: así un rastro mide lo mismo con cualquier resolución.
import type { DefCharco, DefConteo, DefEstatura, DefFrase, DefHumedad, DefMano, DefRastro, TipoRastro } from '../../pisos/TiposPiso';
import { Ruido2D } from '../../utilidades/Ruido';

type Rgb = readonly [number, number, number];

/** La sangre seca de hace años: café casi negro. El borde de una mancha seca es más oscuro que el centro. */
const SANGRE: Rgb = [58, 25, 19];
const SANGRE_BORDE: Rgb = [30, 13, 10];
/** Lo que tiñe el yeso de un techo empapado: un rojo sucio, apagado (agua con sangre), nada que brille. */
const HUMEDAD: Rgb = [112, 40, 34];
/** Lo que queda donde alguien restregó con un trapo: una película sucia, entre café y rosa. */
const PELICULA: Rgb = [88, 60, 48];
/** El lápiz de las rayas de estatura (y de lo que le escribieron al lado). */
export const GRAFITO: Rgb = [58, 58, 64];
/** El papel de colgadura más limpio (y pálido) donde alguien restregó. */
const PAPEL_RESTREGADO: Rgb = [214, 205, 186];
/** Lo que aparece bajo la pintura cuando se raya: el yeso, y la sombra del surco. */
const YESO: Rgb = [200, 193, 176];
const SOMBRA_SURCO: Rgb = [40, 36, 30];

/** Píxeles por metro de cada rastro: lo pequeño y con trazos finos (lápiz, rayas) necesita más. */
const PX_POR_METRO: Record<TipoRastro, number> = { charco: 320, mano: 512, estatura: 1024, conteo: 1024, frase: 512, humedad: 320 };
const LADO_MAXIMO = 1024;
/** El alto de lo escrito a lápiz junto a las rayas de estatura (2.6 cm: lo que escribe un adulto en la pared). */
export const ALTO_LETRA_ESTATURA = 0.026;
/** Cuánto del borde se desvanece a cero (en metros, y nunca menos de 3 píxeles). */
const MARGEN_M = 0.02;

/** Un rastro ya pintado: los píxeles (RGBA sin premultiplicar) y lo que se escribe a lápiz encima. */
export interface PinturaRastro {
  ancho: number;
  alto: number;
  datos: Uint8ClampedArray;
  /** Las letras a lápiz (solo la estatura): el texto, su punto de inicio a media altura y su alto, en píxeles. */
  letras: Array<{ texto: string; x: number; y: number; alto: number }>;
}

/** Un renglón de una frase, listo para trazar (todo en píxeles, menos la inclinación, en radianes). */
export interface RenglonFrase {
  readonly texto: string;
  /** El centro del renglón y su línea base. */
  readonly x: number;
  readonly y: number;
  /** El alto de las mayúsculas, el grosor del dedo y el ancho que no puede pasar. */
  readonly alto: number;
  readonly grosor: number;
  readonly anchoMax: number;
  readonly inclinacion: number;
  /** Para torcer cada letra a su manera (siempre igual para la misma frase). */
  readonly semilla: number;
}

/** Quien sabe dibujar letras (el navegador): me devuelve la cobertura de cada píxel (0..255), fila por fila. */
export type TrazarLetras = (renglones: readonly RenglonFrase[], ancho: number, alto: number) => Uint8ClampedArray;

/**
 * Cómo se escribe una frase en la pared, en metros: los márgenes (abajo hay más, para que chorree), el espacio
 * entre renglones y cuánto ocupa de ancho cada letra respecto a su alto (mayúsculas de palo, con el espacio).
 */
export const FRASE = { margen: 0.04, margenAbajo: 0.11, entreRenglones: 0.045, anchoPorLetra: 0.85 } as const;

/** El alto de las mayúsculas de una frase: lo que deja su cuadro después de márgenes y renglones. */
export function letraFrase(def: DefFrase): number {
  const n = def.lineas.length;
  return (def.alto - FRASE.margen - FRASE.margenAbajo - FRASE.entreRenglones * (n - 1)) / n;
}

/** Cuánto ancho necesita una frase para que sus letras no se aprieten (para validar los datos). */
export function anchoNecesarioFrase(def: DefFrase): number {
  const mas = Math.max(...def.lineas.map((l) => l.length));
  return 2 * FRASE.margen + mas * letraFrase(def) * FRASE.anchoPorLetra;
}

const limitar01 = (x: number) => Math.min(1, Math.max(0, x));
const suave = (a: number, b: number, x: number) => {
  const t = limitar01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mezclar = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const escalar = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
/** La distancia en el plano. No uso Math.hypot: protege de desbordes que aquí no pasan y es varias veces más lento (se llama millones de veces). */
const distancia = (x: number, y: number) => Math.sqrt(x * x + y * y);

/** Una semilla estable por id: cada rastro es distinto, pero siempre el mismo. */
export function semillaRastro(id: string): number {
  let h = 11;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 100_003;
  return h + 1;
}

/** Distancia de un punto a un segmento, y en qué parte del segmento cae (0 en a, 1 en b). */
function aSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): { d: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 > 0 ? limitar01(((px - ax) * dx + (py - ay) * dy) / largo2) : 0;
  return { d: distancia(px - (ax + dx * t), py - (ay + dy * t)), t };
}

/** La hoja donde pinto: píxeles RGBA y la escala en metros. Pinto siempre "encima" (alfa sobre alfa). */
class Lamina {
  readonly datos: Uint8ClampedArray;

  constructor(
    readonly ancho: number,
    readonly alto: number,
    readonly k: number,
  ) {
    this.datos = new Uint8ClampedArray(ancho * alto * 4);
  }

  sobre(x: number, y: number, color: Rgb, a: number): void {
    if (a <= 0.002 || x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return;
    const i = (y * this.ancho + x) * 4;
    const a0 = this.datos[i + 3] / 255;
    const af = a + a0 * (1 - a);
    for (let c = 0; c < 3; c++) this.datos[i + c] = (color[c] * a + this.datos[i + c] * a0 * (1 - a)) / af;
    this.datos[i + 3] = af * 255;
  }

  /** Recorro cada píxel con su centro en metros. */
  cadaPixel(f: (x: number, y: number, mx: number, my: number) => void): void {
    for (let y = 0; y < this.alto; y++) for (let x = 0; x < this.ancho; x++) f(x, y, (x + 0.5) / this.k, (y + 0.5) / this.k);
  }

  /** Recorro solo los píxeles de un círculo (en metros): lo que queda fuera no lo toco, y me ahorro el tiempo. */
  cadaPixelCerca(cx: number, cy: number, radio: number, f: (x: number, y: number, mx: number, my: number) => void): void {
    const k = this.k;
    const x0 = Math.max(0, Math.floor((cx - radio) * k));
    const x1 = Math.min(this.ancho - 1, Math.ceil((cx + radio) * k));
    const y0 = Math.max(0, Math.floor((cy - radio) * k));
    const y1 = Math.min(this.alto - 1, Math.ceil((cy + radio) * k));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y, (x + 0.5) / k, (y + 0.5) / k);
  }

  /**
   * Un trazo recto de `ancho` metros entre dos puntos (en metros), con antialias. `alfa(t)` da la opacidad
   * a lo largo del trazo (t de 0 a 1): así varía la presión de la mano.
   */
  trazo(ax: number, ay: number, bx: number, by: number, ancho: number, color: Rgb, alfa: (t: number) => number): void {
    const k = this.k;
    const medio = (ancho * k) / 2;
    const x0 = Math.floor(Math.min(ax, bx) * k - medio - 1);
    const x1 = Math.ceil(Math.max(ax, bx) * k + medio + 1);
    const y0 = Math.floor(Math.min(ay, by) * k - medio - 1);
    const y1 = Math.ceil(Math.max(ay, by) * k + medio + 1);
    for (let y = Math.max(0, y0); y <= Math.min(this.alto - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(this.ancho - 1, x1); x++) {
        const s = aSegmento(x + 0.5, y + 0.5, ax * k, ay * k, bx * k, by * k);
        const cobertura = limitar01(medio + 0.5 - s.d);
        if (cobertura > 0) this.sobre(x, y, color, cobertura * alfa(s.t));
      }
    }
  }

  /** El borde se desvanece a cero: ningún calco deja ver su rectángulo (la última fila y columna quedan en 0). */
  desvanecerBorde(): void {
    const margen = Math.max(3, Math.round(MARGEN_M * this.k));
    this.cadaPixel((x, y) => {
      const borde = Math.min(x, y, this.ancho - 1 - x, this.alto - 1 - y);
      if (borde >= margen) return;
      const i = (y * this.ancho + x) * 4 + 3;
      this.datos[i] *= suave(0, margen, borde);
    });
  }
}

/**
 * Pinto un rastro según su tipo. El tamaño en píxeles sale de su tamaño en metros; `escala` baja la
 * resolución en los equipos modestos (0.5 = la mitad de píxeles por metro, una cuarta parte del trabajo).
 * Una frase necesita `trazar`: alguien que sepa dibujar las letras.
 */
export function pintarRastro(def: DefRastro, escala = 1, trazar?: TrazarLetras): PinturaRastro {
  let k = PX_POR_METRO[def.tipo] * escala;
  // Si un lado pasa del máximo, bajo la resolución de todo el rastro (no lo deformo).
  k = Math.min(k, LADO_MAXIMO / Math.max(def.ancho, def.alto));
  const lamina = new Lamina(Math.max(8, Math.round(def.ancho * k)), Math.max(8, Math.round(def.alto * k)), k);
  const ruido = new Ruido2D(semillaRastro(def.id));
  const letras: PinturaRastro['letras'] = [];
  switch (def.tipo) {
    case 'charco':
      pintarCharco(lamina, ruido, def);
      break;
    case 'mano':
      pintarMano(lamina, ruido, def);
      break;
    case 'estatura':
      letras.push(...pintarEstatura(lamina, ruido, def));
      break;
    case 'conteo':
      pintarConteo(lamina, ruido, def);
      break;
    case 'frase':
      if (!trazar) throw new Error(`La frase "${def.id}" necesita quien trace sus letras.`);
      pintarFrase(lamina, ruido, def, trazar);
      break;
    case 'humedad':
      pintarHumedad(lamina, ruido, def);
      break;
  }
  lamina.desvanecerBorde();
  return { ancho: lamina.ancho, alto: lamina.alto, datos: lamina.datos, letras };
}

/**
 * Una mancha vieja en el piso que alguien quiso limpiar: el charco seco (con el borde más oscuro, como se
 * seca la sangre), las pasadas de un trapo que la corrieron en arcos y dejaron una película sucia alrededor,
 * unas gotas sueltas, y un arrastre que se aleja hacia ARRIBA del cuadro (hacia la puerta). Nada más.
 */
function pintarCharco(l: Lamina, r: Ruido2D, def: DefCharco): void {
  const W = def.ancho;
  const H = def.alto;
  const cx = W * 0.5;
  const cy = H * 0.7;
  const radio = Math.min(W, H) * 0.27;
  // Un lóbulo: el líquido corrió un poco hacia un lado antes de secarse.
  const lobulo = { x: cx + radio * 0.55, y: cy + radio * 0.3, radio: radio * 0.6 };
  // Las pasadas del trapo: arcos alrededor de un punto corrido (el codo de quien restregaba), solo cerca del charco.
  const pasadas = Array.from({ length: 5 }, (_, i) => {
    const ang = r.valor(i * 7.3 + 0.5, 1.1) * Math.PI * 2;
    const R = radio * (1.4 + 1.2 * r.valor(i * 3.1, 4.4));
    return { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, R, ancho: radio * (0.3 + 0.35 * r.valor(i * 5.5, 2.2)), fase: i * 1.7 };
  });
  // Gotas sueltas alrededor: se secaron antes de que llegara el trapo.
  const gotas = Array.from({ length: 6 }, (_, i) => {
    const ang = r.valor(i * 4.1, 9.3) * Math.PI * 2;
    const dist = radio * (1.15 + 0.6 * r.valor(i * 6.7, 3.3));
    return { x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist * 0.85, radio: 0.004 + 0.006 * r.valor(i * 2.9, 7.1) };
  });

  l.cadaPixel((x, y, mx, my) => {
    const u = mx / W;
    const v = my / H;
    const n1 = r.fractal(u * 5, v * 5, 3, 256);
    const n2 = r.fractal(u * 5 + 31, v * 5 + 17, 3, 256);
    // Deformo el espacio con ruido: el contorno sale irregular, como un líquido sobre madera.
    const qx = mx + (n1 - 0.5) * 0.22 * radio * 2;
    const qy = my + (n2 - 0.5) * 0.22 * radio * 2;
    const d = Math.min(distancia(qx - cx, (qy - cy) * 1.1) / radio, distancia(qx - lobulo.x, qy - lobulo.y) / lobulo.radio);
    // La sangre seca deja un borde marcado, no un degradé.
    const charco = 1 - suave(0.94, 1.0, d);
    const anillo = suave(0.62, 0.95, d) * charco;

    // Por dónde pasó el trapo (la pasada más fuerte en este punto) y sus estrías en arco.
    let trapo = 0;
    let estrias = 0;
    for (const p of pasadas) {
      const rr = distancia(mx - p.x, my - p.y);
      const banda = 1 - suave(0.45, 1.0, Math.abs(rr - p.R) / p.ancho);
      if (banda > trapo) {
        trapo = banda;
        // Las fibras del trapo: estrías anchas y desparejas, no un tejido regular.
        const fibra = 0.5 + 0.5 * Math.sin((rr / 0.011) * Math.PI + p.fase + n1 * 9);
        estrias = fibra * suave(0.25, 0.75, r.valor(rr * 90, p.fase * 7 + n2 * 3));
      }
    }
    // El trapo solo esparció lo que había: lejos del charco ya no arrastra nada.
    trapo *= 1 - suave(1.3, 2.3, d);
    const grano = 0.88 + 0.24 * r.valor(x * 0.4, y * 0.4);

    // La película que dejó el trapo alrededor del charco, a parches. El ruido de los parches solo lo calculo
    // donde pasó el trapo: es lo más caro del charco y la mitad del cuadro no lo necesita.
    const parches = trapo > 0 ? suave(0.35, 0.65, r.fractal(u * 9 + 50, v * 9 + 50, 3, 256)) : 0;
    const aPelicula = (1 - charco) * trapo * (0.1 + 0.28 * estrias) * (0.35 + 0.65 * parches);
    if (aPelicula > 0) l.sobre(x, y, escalar(PELICULA, grano), aPelicula);

    // El arrastre hacia arriba: una franja ancha (lo que sacaron de aquí, a rastras), más oscura en los bordes,
    // con vetas largas. Tiene que leerse a 3 m: nada de rayitas finas, que a esa distancia se borran.
    const t = (cy - radio * 0.4 - my) / (H * 0.62);
    if (t > -0.1 && t < 1) {
      const eje = cx - radio * 0.1 + W * 0.04 * t * t + (n1 - 0.5) * 0.03;
      const lado = Math.abs(mx - eje) / (0.12 * (1 - 0.35 * limitar01(t)));
      const franja = 1 - suave(0.75, 1.05, lado);
      if (franja > 0) {
        const borde = suave(0.5, 0.9, lado) * franja;
        const vetas = 0.5 + 0.5 * Math.sin(((mx - eje) / 0.014) * Math.PI + n2 * 5);
        const presion = suave(0.15, 0.45, r.fractal(t * 3.5 + 7, 3.5, 2, 256));
        const aArrastre = Math.min(1, franja * 0.72 * (0.7 + 0.3 * vetas) + borde * 0.2) * presion * (1 - suave(0.5, 1.0, t));
        if (aArrastre > 0) l.sobre(x, y, escalar(mezclar(mezclar(SANGRE, PELICULA, 0.25), SANGRE_BORDE, borde), grano), aArrastre);
      }
    }

    // Las gotas sueltas.
    for (const g of gotas) {
      const dg = distancia(mx - g.x, my - g.y) / g.radio;
      if (dg < 1.2) l.sobre(x, y, escalar(SANGRE_BORDE, grano), (1 - suave(0.75, 1.1, dg + (n2 - 0.5) * 0.4)) * 0.85);
    }

    // El charco: donde pasó el trapo quedó un poco más claro y con estrías (la sangre seca no sale del todo).
    if (charco > 0) {
      const limpio = trapo * (0.4 + 0.6 * estrias) * parches;
      const color = mezclar(mezclar(SANGRE, SANGRE_BORDE, anillo), PELICULA, limpio * 0.3);
      l.sobre(x, y, escalar(color, grano), charco * (0.95 - 0.35 * limpio));
    }
  });
}

/**
 * La mano: una derecha apoyada de lleno en la pared (dedos hacia arriba y hacia la IZQUIERDA del cuadro,
 * hacia donde iba bajando), que se arrastró hacia abajo a la izquierda perdiendo sangre, y al final se apoyó
 * otra vez, más débil. Dos gotas escurrieron desde la primera. Alguien bajó apoyándose. ¿Cuándo?
 */
function pintarMano(l: Lamina, r: Ruido2D, def: DefMano): void {
  const W = def.ancho;
  const H = def.alto;
  // La primera huella arriba a la derecha; el arrastre baja hacia la izquierda con la pendiente del tramo.
  const p1 = { x: W - 0.17, y: 0.17 };
  const largoDir = distancia(0.82, 0.57);
  const sx = -0.82 / largoDir;
  const sy = 0.57 / largoDir;
  const largo = Math.min(0.7, (p1.x - 0.13) / -sx, (H - 0.17 - p1.y) / sy);
  const p2 = { x: p1.x + sx * largo, y: p1.y + sy * largo };
  const huella1 = mascaraMano(p1.x, p1.y, -0.62);
  const huella2 = mascaraMano(p2.x, p2.y, -0.95);
  const contacto = (mx: number, my: number) => suave(0.3, 0.52, r.fractal(mx * 40, my * 40, 3, 256));
  const color = (mx: number, my: number) => mezclar(SANGRE, SANGRE_BORDE, suave(0.4, 0.8, r.valor(mx * 70, my * 70)));

  // 1. El arrastre: cada dedo deja su raya, que se tuerce un poco y se va apagando; la presión se corta y vuelve.
  const x0 = Math.max(0, Math.floor(Math.min(p1.x, p2.x) * l.k - 0.1 * l.k));
  const x1 = Math.min(l.ancho - 1, Math.ceil(Math.max(p1.x, p2.x) * l.k + 0.1 * l.k));
  const y0 = Math.max(0, Math.floor(Math.min(p1.y, p2.y) * l.k - 0.1 * l.k));
  const y1 = Math.min(l.alto - 1, Math.ceil(Math.max(p1.y, p2.y) * l.k + 0.1 * l.k));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const mx = (x + 0.5) / l.k;
      const my = (y + 0.5) / l.k;
      const dx = mx - p1.x;
      const dy = my - p1.y;
      const t = (dx * sx + dy * sy) / largo;
      const lateral = -dx * sy + dy * sx;
      if (t < 0.03 || t > 1.0 || Math.abs(lateral) > 0.07) continue;
      let rayas = 0;
      for (let k = 0; k < 4; k++) {
        const centro = (-0.026 + k * 0.017) * (1 - 0.25 * t) + 0.005 * Math.sin(t * 7 + k * 1.9);
        rayas = Math.max(rayas, 1 - suave(0.0035, 0.007, Math.abs(lateral - centro)));
      }
      const palma = (1 - suave(0.02, 0.045, Math.abs(lateral + 0.006))) * 0.5;
      const presion = suave(0.2, 0.48, r.fractal(t * 5 + 11, 2.5, 2, 256));
      const queda = Math.pow(1 - t, 1.3);
      const a = Math.max(rayas * 0.95, palma) * presion * (0.3 + 0.7 * queda) * (0.6 + 0.4 * contacto(mx, my));
      l.sobre(x, y, color(mx, my), a);
    }
  }

  // 2. Las dos huellas: la piel deja manchas, no un sello. La segunda, casi sin sangre ya.
  for (const [h, centro, fuerza] of [
    [huella1, p1, 1],
    [huella2, p2, 0.45],
  ] as const) {
    l.cadaPixelCerca(centro.x, centro.y, 0.15, (x, y, mx, my) => {
      const m = h(mx, my);
      if (m <= 0) return;
      const c = contacto(mx, my);
      l.sobre(x, y, color(mx, my), m * fuerza * (fuerza === 1 ? 0.38 + 0.55 * c : c) * 0.95);
    });
  }

  // 3. Las gotas: escurrieron derecho hacia abajo desde la primera huella y terminan en una cabeza más gruesa.
  for (const g of [
    { x: p1.x + 0.014, y: p1.y + 0.04, largo: 0.12 },
    { x: p1.x - 0.02, y: p1.y + 0.045, largo: 0.065 },
  ]) {
    l.cadaPixelCerca(g.x, g.y + g.largo / 2, g.largo / 2 + 0.01, (x, y, mx, my) => {
      const s = aSegmento(mx, my, g.x, g.y, g.x + 0.002, g.y + g.largo);
      const grosor = 0.0026 + 0.0022 * s.t * s.t;
      const a = (1 - suave(grosor * 0.55, grosor, s.d)) * 0.85;
      if (a > 0) l.sobre(x, y, SANGRE_BORDE, a);
    });
  }
}

/**
 * La forma de una mano derecha vista desde el lado de quien la apoyó (palma contra la pared): palma,
 * cuatro dedos que nacen de ella y el pulgar a la izquierda. `giro` es hacia dónde apuntan los dedos, en
 * radianes desde "arriba" (negativo: hacia la izquierda). Devuelve la cobertura 0..1 en cada punto.
 */
function mascaraMano(cx: number, cy: number, giro: number): (x: number, y: number) => number {
  // Ejes de la mano: f hacia la punta de los dedos, lado hacia el meñique.
  const fx = Math.sin(giro);
  const fy = -Math.cos(giro);
  const lx = Math.cos(giro);
  const ly = Math.sin(giro);
  const dedos = [
    { base: 0.029, largo: 0.066, abre: 0.14, grueso: 0.0078 }, // meñique
    { base: 0.011, largo: 0.083, abre: 0.05, grueso: 0.0086 }, // anular
    { base: -0.008, largo: 0.09, abre: -0.02, grueso: 0.009 }, // medio
    { base: -0.027, largo: 0.08, abre: -0.1, grueso: 0.0088 }, // índice
  ];
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const lado = dx * lx + dy * ly;
    const frente = dx * fx + dy * fy;
    // La palma: un óvalo, más tenue en el hueco del centro (ahí la mano no toca).
    const dPalma = distancia(lado / 0.045, (frente + 0.004) / 0.055);
    let a = (1 - suave(0.85, 1.0, dPalma)) * (0.5 + 0.5 * suave(0.2, 0.7, dPalma));
    for (const d of dedos) {
      // Cada dedo nace dentro de la palma: no quedan "palitos" sueltos.
      const tipX = d.base + Math.sin(d.abre) * d.largo;
      const tipY = 0.03 + Math.cos(d.abre) * d.largo;
      const s = aSegmento(lado, frente, d.base, 0.03, tipX, tipY);
      // La yema marca más que el resto del dedo.
      const yema = 0.75 + 0.25 * suave(0.6, 0.9, s.t);
      a = Math.max(a, (1 - suave(d.grueso * 0.8, d.grueso, s.d)) * yema);
    }
    const pulgar = aSegmento(lado, frente, -0.03, -0.01, -0.072, 0.028);
    a = Math.max(a, (1 - suave(0.0098, 0.012, pulgar.d)) * 0.9);
    return a;
  };
}

/**
 * Las rayas de lápiz de la estatura de un niño, cada una con lo que le escribieron al lado (las letras van
 * aparte: las escribe quien tenga un lienzo). Cerca de la última, algo oscuro que llegó después, y alrededor
 * el papel más pálido: alguien lo restregó. El restregado también borró un poco el lápiz.
 */
function pintarEstatura(l: Lamina, r: Ruido2D, def: DefEstatura): PinturaRastro['letras'] {
  const W = def.ancho;
  const arriba = def.altura + def.alto / 2;
  const aY = (altura: number) => arriba - altura;
  const centroLinea = W * 0.3;
  const mancha = def.mancha !== undefined ? { x: centroLinea + 0.04, y: aY(def.mancha) } : null;
  const restregado = (mx: number, my: number) =>
    mancha ? 1 - suave(0.5, 1.0, distancia((mx - mancha.x) / 0.14, (my - mancha.y) / 0.1) + (r.fractal(mx * 14, my * 14, 2, 256) - 0.5) * 0.5) : 0;

  // 1. El halo restregado (papel más limpio), a parches y con las pasadas del trapo de lado a lado.
  if (mancha) {
    l.cadaPixelCerca(mancha.x, mancha.y, 0.17, (x, y, mx, my) => {
      const h = restregado(mx, my);
      if (h <= 0) return;
      const pasadas = 0.6 + 0.4 * Math.sin((my + 0.01 * Math.sin(mx * 60)) * 700 + r.valor(mx * 50, my * 50) * 3) * r.valor(mx * 25 + 9, my * 25);
      l.sobre(x, y, PAPEL_RESTREGADO, h * 0.32 * pasadas);
    });
  }

  // 2. Las rayas de lápiz: cortas, casi horizontales, con el grano del papel.
  const letras: PinturaRastro['letras'] = [];
  def.marcas.forEach((m, i) => {
    const y = aY(m.altura);
    const largo = 0.12 + 0.025 * r.valor(i * 3.1, 7.7);
    const inclinacion = (r.valor(i * 5.3, 2.2) - 0.5) * 0.006;
    const x0 = centroLinea - largo / 2;
    const x1 = centroLinea + largo / 2;
    l.trazo(x0, y - inclinacion, x1, y + inclinacion, 0.0026, GRAFITO, (t) => {
      const px = x0 + (x1 - x0) * t;
      const grano = suave(0.2, 0.45, r.valor(px * 900, y * 900 + i * 13));
      return (0.6 + 0.35 * grano) * (1 - 0.5 * restregado(px, y));
    });
    if (m.texto) letras.push({ texto: m.texto, x: x1 * l.k + 0.008 * l.k, y: y * l.k, alto: ALTO_LETRA_ESTATURA * l.k });
  });

  // 3. La mancha, desteñida por el restregado, y unas gotitas alrededor.
  if (mancha) {
    l.cadaPixelCerca(mancha.x, mancha.y, 0.08, (x, y, mx, my) => {
      const n = r.fractal(mx * 24, my * 24, 3, 256);
      const d = distancia((mx - mancha.x + (n - 0.5) * 0.03) / 0.046, (my - mancha.y + (n - 0.5) * 0.02) / 0.026);
      // Restregada de lado a lado: queda más ancha que alta, con el centro más gastado que el borde.
      const a = (1 - suave(0.7, 1.0, d)) * (0.45 + 0.4 * suave(0.3, 0.7, n)) * (0.75 + 0.25 * suave(0.4, 0.9, d));
      if (a > 0) l.sobre(x, y, mezclar(SANGRE, PELICULA, 0.45), a);
    });
    for (let i = 0; i < 6; i++) {
      const ang = r.valor(i * 9.1, 1.3) * Math.PI * 2;
      const dist = 0.04 + 0.05 * r.valor(i * 4.7, 8.2);
      const gx = mancha.x + Math.cos(ang) * dist;
      const gy = mancha.y + Math.sin(ang) * dist * 0.7;
      l.trazo(gx, gy, gx + 0.0005, gy + 0.0005, 0.0018 + 0.0022 * r.valor(i, 3), mezclar(SANGRE, PELICULA, 0.3), () => 0.75);
    }
  }
  return letras;
}

/**
 * Pongo una capa DEBAJO del rastro (por ejemplo, las letras a lápiz que el navegador escribe aparte): así la
 * mancha y el restregado tapan el lápiz, como en la pared real. Las dos capas son RGBA sin premultiplicar,
 * del mismo tamaño; devuelvo una nueva.
 */
export function ponerDebajo(arriba: Uint8ClampedArray, abajo: Uint8ClampedArray): Uint8ClampedArray {
  if (arriba.length !== abajo.length) throw new Error('Las dos capas de un rastro deben medir lo mismo.');
  const salida = new Uint8ClampedArray(arriba.length);
  for (let i = 0; i < arriba.length; i += 4) {
    const a = arriba[i + 3] / 255;
    const b = abajo[i + 3] / 255;
    const af = a + b * (1 - a);
    if (af <= 0) continue;
    for (let c = 0; c < 3; c++) salida[i + c] = (arriba[i + c] * a + abajo[i + c] * b * (1 - a)) / af;
    salida[i + 3] = af * 255;
  }
  return salida;
}

/** El trazo de las rayas de conteo, en metros (el conteo lo uso también para saber cuánto mide). */
const CONTEO = { margen: 0.03, alto: 0.06, paso: 0.014, entreGrupos: 0.022, entreFilas: 0.09 };

/** Cuántas rayas caben por fila en un ancho dado (siempre grupos enteros de cinco). */
function rayasPorFila(ancho: number): number {
  const anchoGrupo = 4 * CONTEO.paso + CONTEO.entreGrupos;
  return Math.max(1, Math.floor((ancho - 2 * CONTEO.margen + CONTEO.entreGrupos) / anchoGrupo)) * 5;
}

/** Cuánto alto necesita un conteo en un ancho dado (para validar que cabe en su cuadro). */
export function altoNecesarioConteo(ancho: number, cuenta: number): number {
  const filas = Math.ceil(cuenta / rayasPorFila(ancho));
  return 2 * CONTEO.margen + (filas - 1) * CONTEO.entreFilas + CONTEO.alto;
}

/**
 * Rayas de conteo hechas con algo duro sobre la pintura, a la altura de los ojos de un niño sentado: de cinco
 * en cinco (cuatro palitos y uno cruzado). Cada surco es claro (el yeso) con su sombra. Las primeras son
 * cuidadosas; las últimas, torcidas. La última quedó a medias.
 */
function pintarConteo(l: Lamina, r: Ruido2D, def: DefConteo): void {
  const { margen, alto, paso, entreGrupos, entreFilas } = CONTEO;
  const anchoGrupo = 4 * paso + entreGrupos;
  const porFila = rayasPorFila(def.ancho);
  const surco = (ax: number, ay: number, bx: number, by: number, presion: number, semilla: number) => {
    const alfa = (t: number) => presion * (0.55 + 0.45 * suave(0.2, 0.5, r.valor(t * 9 + semilla, semilla)));
    l.trazo(ax + 0.0012, ay + 0.0012, bx + 0.0012, by + 0.0012, 0.0016, SOMBRA_SURCO, (t) => alfa(t) * 0.65);
    l.trazo(ax, ay, bx, by, 0.0022, YESO, alfa);
  };
  for (let i = 0; i < def.cuenta; i++) {
    const fila = Math.floor(i / porFila);
    const enFila = i % porFila;
    const grupo = Math.floor(enFila / 5);
    const enGrupo = enFila % 5;
    // Con cada raya, la mano tiembla más.
    const temblor = 0.0015 + 0.006 * (i / Math.max(1, def.cuenta - 1));
    const j = (n: number) => (r.valor(i * 3.7 + n * 11.3, n * 5.9) - 0.5) * 2 * temblor;
    const x0 = margen + grupo * anchoGrupo;
    const y0 = margen + fila * entreFilas;
    const ultima = i === def.cuenta - 1;
    if (enGrupo < 4) {
      const x = x0 + enGrupo * paso;
      const y1 = y0 + alto * (ultima ? 0.45 : 1);
      surco(x + j(1), y0 + j(2), x + j(3) + 0.002, y1 + j(4), 1, i);
    } else {
      // La quinta cruza las cuatro en diagonal.
      const fin = ultima ? 0.45 : 1;
      surco(x0 - 0.004 + j(1), y0 + alto * 0.8 + j(2), x0 - 0.004 + (3 * paso + 0.008) * fin + j(3), y0 + alto * (0.8 - 0.6 * fin) + j(4), 1, i);
    }
  }
}

/**
 * Una frase escrita con el dedo: el dedo se moja, escribe hasta que se le acaba la sangre (el trazo se va
 * secando y deja las vetas de la piel) y se vuelve a mojar al empezar cada palabra. Donde quedó más cargado,
 * escurrió hacia abajo. Las letras me las traza `trazar`; yo decido dónde va cada renglón y lo vuelvo sangre.
 */
function pintarFrase(l: Lamina, r: Ruido2D, def: DefFrase, trazar: TrazarLetras): void {
  const W = def.ancho;
  const letra = letraFrase(def);
  const grosor = Math.min(0.022, letra * 0.17);
  const anchoMax = W - 2 * FRASE.margen;
  // Escrito a pulso en una pared: cada renglón se corre y se tuerce un poco.
  const renglones = def.lineas.map((texto, i) => {
    const base = FRASE.margen + letra * (i + 1) + FRASE.entreRenglones * i;
    const centro = W / 2 + (r.valor(i * 7.1, 3.3) - 0.5) * 0.04;
    const largo = Math.min(anchoMax, texto.length * letra * FRASE.anchoPorLetra);
    // Dónde empieza y termina cada palabra a lo largo del renglón: al empezar, el dedo se volvió a mojar.
    const palabras: Array<{ desde: number; hasta: number }> = [];
    let letraInicial = 0;
    for (const p of texto.split(' ')) {
      const desde = centro - largo / 2 + (largo * letraInicial) / texto.length;
      palabras.push({ desde, hasta: desde + (largo * p.length) / texto.length });
      letraInicial += p.length + 1;
    }
    return { texto, base, centro, largo, palabras, inclinacion: (r.valor(i * 4.3, 8.8) - 0.5) * 0.06 };
  });
  const semilla = semillaRastro(def.id);
  const mascara = trazar(
    renglones.map((g, i) => ({
      texto: g.texto,
      x: g.centro * l.k,
      y: g.base * l.k,
      alto: letra * l.k,
      grosor: grosor * l.k,
      anchoMax: anchoMax * l.k,
      inclinacion: g.inclinacion,
      semilla: semilla + i * 101,
    })),
    l.ancho,
    l.alto,
  );
  if (mascara.length !== l.ancho * l.alto) throw new Error(`Las letras de "${def.id}" no miden lo que su cuadro.`);

  /** Cuánta sangre llevaba el dedo en un punto: 1 recién mojado, cerca de 0.55 al final de una palabra. */
  const presion = (mx: number, my: number) => {
    let g = renglones[0];
    for (const otro of renglones) if (Math.abs(my - (otro.base - letra / 2)) < Math.abs(my - (g.base - letra / 2))) g = otro;
    const p = g.palabras.find((w) => mx <= w.hasta + letra * 0.3) ?? g.palabras[g.palabras.length - 1];
    const t = limitar01((mx - p.desde) / Math.max(letra, p.hasta - p.desde));
    return limitar01(1 - 0.45 * Math.pow(t, 1.5) + (r.valor(mx * 20, my * 20) - 0.5) * 0.1);
  };

  // El dedo no traza limpio: leo las letras con el espacio torcido unos milímetros, así el borde tiembla y el
  // trazo engorda donde apretó más. Así no parecen impresas.
  const desvio = grosor * l.k * 0.35;
  const cobertura = (x: number, y: number, mx: number, my: number) => {
    const sx = Math.round(x + (r.fractal(mx * 18 + 7, my * 18, 2, 256) - 0.5) * 2 * desvio);
    const sy = Math.round(y + (r.fractal(mx * 18, my * 18 + 13, 2, 256) - 0.5) * 2 * desvio);
    if (sx < 0 || sy < 0 || sx >= l.ancho || sy >= l.alto) return 0;
    return mascara[sy * l.ancho + sx] / 255;
  };

  // 1. Las letras: donde el dedo iba seco, la sangre deja vetas y huecos (las crestas de la piel). Siempre más
  //    oscuras que la pared: la sangre seca no aclara nada.
  l.cadaPixel((x, y, mx, my) => {
    const m = cobertura(x, y, mx, my);
    if (m <= 0.02) return;
    const p = presion(mx, my);
    const seco = 1 - p;
    const cubre = suave(seco * 0.6 - 0.1, seco * 0.6 + 0.1, r.fractal(mx * 55, my * 55, 2, 256));
    const oscuro = suave(0.35, 0.8, r.valor(mx * 90, my * 90));
    const color = mezclar(mezclar(SANGRE, SANGRE_BORDE, 0.2 + 0.45 * oscuro), PELICULA, seco * 0.12);
    l.sobre(x, y, color, m * cubre * (0.8 + 0.18 * p));
  });

  // 2. Los chorreones: desde el borde de abajo de los trazos más cargados, derecho hacia abajo.
  const paso = 0.03;
  renglones.forEach((g, i) => {
    for (let s = g.centro - g.largo / 2; s <= g.centro + g.largo / 2; s += paso) {
      const j = Math.round(s / paso);
      const mx = s + (r.valor(j * 3.7, i * 9.1 + 2) - 0.5) * paso;
      const carga = presion(mx, g.base - letra / 2);
      if (r.valor(j * 2.3 + 0.5, i * 5.7 + 11) > 0.22 + 0.3 * carga) continue;
      // El punto más bajo del trazo en esa columna, dentro del renglón.
      const px = Math.round(mx * l.k);
      if (px < 0 || px >= l.ancho) continue;
      let fondo = -1;
      const yDesde = Math.max(0, Math.floor((g.base - letra * 0.6) * l.k));
      const yHasta = Math.min(l.alto - 1, Math.ceil((g.base + grosor * 1.5) * l.k));
      for (let py = yDesde; py <= yHasta; py++) if (mascara[py * l.ancho + px] > 128) fondo = py;
      if (fondo < 0) continue;
      const inicio = (fondo + 0.5) / l.k - grosor * 0.25;
      const largo = Math.min((0.02 + 0.08 * r.valor(j * 6.1, i * 3.3 + 7)) * (0.5 + 0.5 * carga), def.alto - 0.03 - inicio);
      if (largo <= 0.005) continue;
      const fin = inicio + largo;
      const xFin = mx + (r.valor(j * 1.9, i * 7.7 + 3) - 0.5) * 0.004;
      const ancho = grosor * (0.22 + 0.12 * r.valor(j * 4.4, i + 1));
      l.trazo(mx, inicio, xFin, fin, ancho, SANGRE, (t) => 0.82 - 0.2 * t);
      // La cabeza del chorreón: ahí se juntó lo que bajaba antes de secarse.
      const cabeza = ancho * 0.85;
      l.cadaPixelCerca(xFin, fin, cabeza * 1.5, (x, y, qx, qy) => {
        const d = distancia(qx - xFin, (qy - fin) * 0.85) / cabeza;
        if (d < 1.2) l.sobre(x, y, SANGRE_BORDE, (1 - suave(0.7, 1.05, d)) * 0.85);
      });
    }
  });
}

/**
 * Humedad roja en un techo: algo empapó el entrepiso y se filtró. El yeso se manchó en anillos (cada vez que
 * se secó quedó un borde más oscuro), con el centro más cargado, una grieta por donde baja y unas gotas
 * colgando, a punto de caer. Se corrió hacia ARRIBA del dibujo: por donde siguió lo que pasó en el piso de arriba.
 */
function pintarHumedad(l: Lamina, r: Ruido2D, def: DefHumedad): void {
  const W = def.ancho;
  const H = def.alto;
  const cx = W * 0.5;
  const cy = H * 0.58;
  const radio = Math.min(W, H) * 0.36;

  l.cadaPixel((x, y, mx, my) => {
    const u = mx / W;
    const v = my / H;
    const n1 = r.fractal(u * 4, v * 4, 3, 256);
    const n2 = r.fractal(u * 4 + 40, v * 4 + 23, 3, 256);
    // El contorno irregular, estirado hacia arriba del dibujo (hacia donde se corrió).
    const qx = mx + (n1 - 0.5) * radio * 0.7;
    const qy = my + (n2 - 0.5) * radio * 0.7;
    const d = distancia((qx - cx) / radio, (qy - cy) / (radio * (qy < cy ? 1.45 : 1)));
    if (d > 1.05) return;
    const cuerpo = 1 - suave(0.9, 1.0, d);
    // Los anillos de marea: cada secado dejó un borde más oscuro. El de afuera es el borde de la mancha; los de
    // adentro se corren por su cuenta y se cortan a trechos (parejos y concéntricos parecían una diana).
    let anillos = 0;
    [0.97, 0.72, 0.48].forEach((frente, i) => {
      const corrido = (r.fractal(u * 6 + i * 17, v * 6 + i * 29, 2, 256) - 0.5) * (i === 0 ? 0.04 : 0.24);
      const entero = i === 0 ? 1 : suave(0.32, 0.56, r.fractal(u * 3 + i * 41, v * 3 + i * 7, 2, 256));
      anillos = Math.max(anillos, (1 - suave(0, 0.045, Math.abs(d - frente + corrido))) * entero);
    });
    const centro = 1 - suave(0, 0.55, d);
    const grano = 0.85 + 0.3 * r.valor(x * 0.5, y * 0.5);
    const color = mezclar(mezclar(HUMEDAD, SANGRE, centro * 0.8), SANGRE_BORDE, anillos * 0.6);
    l.sobre(x, y, escalar(color, grano), Math.min(0.92, cuerpo * (0.22 + 0.2 * n2 + 0.3 * centro + anillos * 0.35)));
  });

  // La grieta por donde se filtró: una línea quebrada que cruza el centro.
  const grieta = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return [cx - W * 0.32 + W * 0.64 * t, cy + (t - 0.5) * H * 0.18 + (r.valor(i * 2.3, 9.9) - 0.5) * 0.05] as const;
  });
  for (let i = 0; i < grieta.length - 1; i++) {
    const [ax, ay] = grieta[i];
    const [bx, by] = grieta[i + 1];
    l.trazo(ax, ay, bx, by, 0.0025, SANGRE_BORDE, (t) => 0.55 * suave(0.2, 0.6, r.valor((ax + (bx - ax) * t) * 80, 4.4)));
  }

  // Las gotas colgando, donde más se cargó: cerca del centro.
  for (let i = 0; i < 5; i++) {
    const ang = r.valor(i * 5.3, 2.7) * Math.PI * 2;
    const dist = radio * 0.45 * r.valor(i * 3.9, 6.1);
    const gx = cx + Math.cos(ang) * dist;
    const gy = cy + Math.sin(ang) * dist;
    const g = 0.007 + 0.009 * r.valor(i * 8.1, 1.7);
    l.cadaPixelCerca(gx, gy, g * 1.6, (x, y, mx, my) => {
      const dg = distancia(mx - gx, my - gy) / g;
      if (dg < 1.5) l.sobre(x, y, SANGRE_BORDE, (1 - suave(0.7, 1.0, dg)) * 0.9 + (1 - suave(1.0, 1.5, dg)) * 0.15);
    });
  }
}
