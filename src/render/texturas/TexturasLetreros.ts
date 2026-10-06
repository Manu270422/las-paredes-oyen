// Aquí pinto en un lienzo los letreros de un piso: la placa de latón con el número de un apartamento y
// la cifra pintada con plantilla en un muro. NO brillan (nada de texto luminoso flotando): son colores
// para un material normal, así que solo se leen cuando les llega luz, sobre todo la de la linterna.
import { CanvasTexture, NoColorSpace, SRGBColorSpace } from 'three';
import { Ruido2D } from '../../utilidades/Ruido';

/** Letra de las cifras: una de palo seco del sistema (cambia un poco entre Android, iPhone y Windows). */
const FAMILIA = 'Arial, Helvetica, "Liberation Sans", sans-serif';
/** Con poca anisotropía la placa se emborrona en cuanto se mira de lado. Son pocas texturas: sale barato. */
const ANISOTROPIA = 4;

type Rgb = readonly [number, number, number];

function crearLienzo(ancho: number, alto: number): { lienzo: HTMLCanvasElement; c: CanvasRenderingContext2D } {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const c = lienzo.getContext('2d');
  if (!c) throw new Error('No pude crear un contexto 2D para los letreros.');
  return { lienzo, c };
}

function textura(lienzo: HTMLCanvasElement, esColor = true): CanvasTexture {
  const t = new CanvasTexture(lienzo);
  t.colorSpace = esColor ? SRGBColorSpace : NoColorSpace;
  t.anisotropy = ANISOTROPIA;
  return t;
}

/** Una semilla estable por texto: cada placa se gasta distinto, pero siempre igual. */
function semillaDe(texto: string): number {
  let h = 7;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) % 100_003;
  return h + 1;
}

/**
 * Dibujo el texto centrado en (cx, cy) con las cifras de EXACTAMENTE `altoCifras` px de alto (mido el
 * dibujo, no el tamaño de letra) y sin pasar de `anchoMaximo`: si no cabe, lo estrecho, como los números
 * condensados de las placas reales. Cada capa es una pasada desplazada (relieve) con su color.
 */
function trazarCifras(
  c: CanvasRenderingContext2D,
  texto: string,
  cx: number,
  cy: number,
  altoCifras: number,
  anchoMaximo: number,
  capas: ReadonlyArray<{ dx: number; dy: number; color: string }>,
): void {
  c.font = `bold 100px ${FAMILIA}`;
  const prueba = c.measureText(texto);
  const tamano = (100 * altoCifras) / (prueba.actualBoundingBoxAscent + prueba.actualBoundingBoxDescent);
  c.font = `bold ${tamano}px ${FAMILIA}`;
  const m = c.measureText(texto);
  const estrechar = Math.min(1, anchoMaximo / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight));
  const base = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  for (const capa of capas) {
    c.save();
    c.translate(cx + capa.dx, cy + capa.dy);
    c.scale(estrechar, 1);
    c.fillStyle = capa.color;
    c.fillText(texto, 0, base);
    c.restore();
  }
}

const mezclar = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const LATON: Rgb = [146, 113, 61];
const LATON_OSCURO: Rgb = [86, 76, 50];
const RANURA = 'rgb(30, 24, 16)';
const BRILLO_LATON = 'rgb(214, 184, 124)';

/** Rugosidad (canal verde) y metal (canal azul) del latón y del surco de las cifras, de 0 a 255. */
const MATERIAL_LATON = 'rgb(0, 115, 128)';
const MATERIAL_SURCO = 'rgb(0, 255, 255)';

/** Las dos texturas de una placa: el color y el mapa de material (rugosidad en verde, metal en azul). */
export interface TexturasPlaca {
  color: CanvasTexture;
  material: CanvasTexture;
}

/**
 * La placa de latón gastado de un apartamento: oxidada en manchas, más sucia hacia los bordes (donde
 * nadie limpia), con dos tornillos y el número GRABADO (oscuro, con el canto de abajo brillando).
 * `proporcion` es alto / ancho de la placa; `fraccionCifras`, qué parte del alto ocupan las cifras.
 *
 * El surco de las cifras es mugre MATE y sin metal (mapa de material): así el reflejo de la linterna de
 * cerca cae sobre el latón y no sobre los números. Antes compartían material y de cerca se veían grises.
 */
export function texturaPlaca(texto: string, proporcion: number, fraccionCifras: number): TexturasPlaca {
  const W = 512;
  const H = Math.round(W * proporcion);
  const { lienzo, c } = crearLienzo(W, H);
  const ruido = new Ruido2D(semillaDe(texto));

  // 1. El latón, píxel a píxel: manchas de óxido, cepillado horizontal y mugre en los bordes.
  const imagen = c.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const oxido = suave(0.5, 0.78, ruido.fractal(u * 6, v * 6 * proporcion, 4, 256));
      const cepillado = 0.94 + 0.12 * ruido.valor(u * 3, v * 180);
      const borde = Math.min(x, y, W - 1 - x, H - 1 - y);
      const mugre = 1 - 0.4 * (1 - suave(0, 26, borde));
      const [r, g, b] = mezclar(LATON, LATON_OSCURO, oxido);
      const i = (y * W + x) * 4;
      imagen.data[i] = r * cepillado * mugre;
      imagen.data[i + 1] = g * cepillado * mugre;
      imagen.data[i + 2] = b * cepillado * mugre;
      imagen.data[i + 3] = 255;
    }
  }
  c.putImageData(imagen, 0, 0);

  // 2. El bisel: un canto oscuro y, por dentro, una línea de brillo.
  c.lineWidth = 5;
  c.strokeStyle = 'rgb(62, 50, 30)';
  c.strokeRect(3, 3, W - 6, H - 6);
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(220, 190, 130, 0.55)';
  c.strokeRect(10, 10, W - 20, H - 20);

  // 3. Dos tornillos de cabeza ranurada, a los lados.
  const radio = W * 0.024;
  for (const tx of [W * 0.07, W * 0.93]) {
    c.beginPath();
    c.arc(tx, H / 2, radio, 0, Math.PI * 2);
    c.fillStyle = 'rgb(116, 98, 66)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgb(48, 38, 24)';
    c.stroke();
    c.beginPath();
    c.moveTo(tx - radio * 0.7, H / 2 - radio * 0.35);
    c.lineTo(tx + radio * 0.7, H / 2 + radio * 0.35);
    c.lineWidth = 3;
    c.stroke();
  }

  // 4. El número grabado: el canto inferior del surco brilla, el fondo es oscuro.
  trazarCifras(c, texto, W / 2, H / 2, H * fraccionCifras, W * 0.68, [
    { dx: 2, dy: 3, color: BRILLO_LATON },
    { dx: 0, dy: 0, color: RANURA },
  ]);

  // 5. El desgaste encima de todo (también sobre el número): roces y rayones finos.
  const final = c.getImageData(0, 0, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const roce = 0.86 + 0.14 * ruido.fractal(u * 12 + 40, v * 12 * proporcion + 40, 3, 256);
      const rayon = ruido.valor(u * 2 + 90, v * 260) > 0.93 ? 1.18 : 1;
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) final.data[i + k] = Math.min(255, final.data[i + k] * roce * rayon);
    }
  }
  c.putImageData(final, 0, 0);

  // 6. El mapa de material: el mismo trazo de las cifras, mate y sin metal, sobre el latón.
  const material = crearLienzo(W, H);
  material.c.fillStyle = MATERIAL_LATON;
  material.c.fillRect(0, 0, W, H);
  trazarCifras(material.c, texto, W / 2, H / 2, H * fraccionCifras, W * 0.68, [{ dx: 0, dy: 0, color: MATERIAL_SURCO }]);
  return { color: textura(lienzo), material: textura(material.lienzo, false) };
}

/**
 * Una cifra pintada con plantilla sobre un muro: pintura crema descascarada (el muro se ve por los
 * huecos) y un par de chorreones. Fondo TRANSPARENTE: el material la recorta (alphaTest).
 * La cifra ocupa `fraccionCifras` del alto del lienzo.
 */
export function texturaRotulo(texto: string, fraccionCifras: number): CanvasTexture {
  const T = 256;
  const { lienzo, c } = crearLienzo(T, T);
  const ruido = new Ruido2D(semillaDe(texto) + 17);
  trazarCifras(c, texto, T / 2, T / 2, T * fraccionCifras, T * 0.95, [{ dx: 0, dy: 0, color: 'rgb(214, 204, 182)' }]);

  const img = c.getImageData(0, 0, T, T);
  const alfa = (x: number, y: number) => img.data[(y * T + x) * 4 + 3];

  // Los chorreones: bajan desde dos columnas del pie de la cifra.
  const pintadasEn = (y: number) => {
    const xs: number[] = [];
    for (let x = 0; x < T; x++) if (alfa(x, y) > 128) xs.push(x);
    return xs;
  };
  let pie = T - 1;
  while (pie > 0 && pintadasEn(pie).length === 0) pie--;
  const columnas = pintadasEn(pie);
  for (const [n, fraccion] of [[0, 0.2], [1, 0.75]] as const) {
    const x = columnas[Math.floor(columnas.length * fraccion)];
    if (x === undefined) continue;
    const largo = 10 + 22 * ruido.valor(n * 7.3, 3.1);
    for (let y = pie; y < Math.min(T, pie + largo); y++) {
      for (const dx of [0, 1]) {
        const i = (y * T + x + dx) * 4;
        img.data[i] = 205;
        img.data[i + 1] = 195;
        img.data[i + 2] = 172;
        img.data[i + 3] = 255;
      }
    }
  }

  // Lo descascarado: donde el ruido baja, se cae la pintura.
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const i = (y * T + x) * 4;
      if (img.data[i + 3] === 0) continue;
      const escama = ruido.fractal((x / T) * 10, (y / T) * 10, 4, 256);
      if (escama < 0.3) img.data[i + 3] = 0;
      else {
        const sombra = 0.8 + 0.2 * ruido.valor(x * 0.4, y * 0.4);
        for (let k = 0; k < 3; k++) img.data[i + k] *= sombra;
      }
    }
  }
  c.putImageData(img, 0, 0);
  return textura(lienzo);
}
