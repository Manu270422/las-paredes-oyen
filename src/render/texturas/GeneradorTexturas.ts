// Aquí genero texturas por código (procedurales): color, relieve (normal map)
// y rugosidad. Así el vertical slice no depende de descargar assets y cada
// superficie tiene manchas, humedad y desgaste sin repetirse de forma obvia.
// Más adelante puedo reemplazar cualquier receta por una textura escaneada.
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { Ruido2D } from '../../utilidades/Ruido';

/** El píxel que cada receta rellena. Colores de 0 a 255; altura y rugosidad de 0 a 1. */
export interface Pixel {
  r: number;
  g: number;
  b: number;
  altura: number;
  rugosidad: number;
}

export type FuncionReceta = (u: number, v: number, ruido: Ruido2D, px: Pixel) => void;

export interface RecetaTextura {
  semilla: number;
  /** Qué tanto relieve muestra el normal map. */
  fuerzaNormal: number;
  pintar: FuncionReceta;
}

export interface ConjuntoTexturas {
  color: CanvasTexture;
  normal: CanvasTexture;
  rugosidad: CanvasTexture;
}

function crearLienzo(tamano: number, datos: Uint8ClampedArray): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = tamano;
  lienzo.height = tamano;
  const contexto = lienzo.getContext('2d');
  if (!contexto) throw new Error('No pude crear un contexto 2D para las texturas.');
  const imagen = new ImageData(new Uint8ClampedArray(datos), tamano, tamano);
  contexto.putImageData(imagen, 0, 0);
  return lienzo;
}

function configurar(textura: CanvasTexture, anisotropia: number, esColor: boolean): CanvasTexture {
  textura.wrapS = RepeatWrapping;
  textura.wrapT = RepeatWrapping;
  textura.anisotropy = anisotropia;
  textura.colorSpace = esColor ? SRGBColorSpace : NoColorSpace;
  textura.needsUpdate = true;
  return textura;
}

/** Ejecuto una receta y obtengo las tres texturas que necesita un material PBR. */
export function generarConjunto(receta: RecetaTextura, tamano: number, anisotropia: number): ConjuntoTexturas {
  const ruido = new Ruido2D(receta.semilla);
  const total = tamano * tamano;
  const color = new Uint8ClampedArray(total * 4);
  const rugosidad = new Uint8ClampedArray(total * 4);
  const altura = new Float32Array(total);
  const px: Pixel = { r: 0, g: 0, b: 0, altura: 0, rugosidad: 1 };

  for (let y = 0; y < tamano; y++) {
    // La fila 0 del lienzo es la parte de ARRIBA de la textura (v = 1).
    const v = 1 - (y + 0.5) / tamano;
    for (let x = 0; x < tamano; x++) {
      const u = (x + 0.5) / tamano;
      receta.pintar(u, v, ruido, px);
      const i = y * tamano + x;
      color[i * 4] = px.r;
      color[i * 4 + 1] = px.g;
      color[i * 4 + 2] = px.b;
      color[i * 4 + 3] = 255;
      const rug = Math.round(Math.min(1, Math.max(0, px.rugosidad)) * 255);
      // Three.js lee la rugosidad del canal verde.
      rugosidad[i * 4] = rug;
      rugosidad[i * 4 + 1] = rug;
      rugosidad[i * 4 + 2] = rug;
      rugosidad[i * 4 + 3] = 255;
      altura[i] = px.altura;
    }
  }

  // Calculo el normal map a partir de la altura (diferencias con los vecinos, envolviendo bordes).
  const normal = new Uint8ClampedArray(total * 4);
  const fuerza = receta.fuerzaNormal * (tamano / 256);
  const h = (x: number, y: number) => altura[((y + tamano) % tamano) * tamano + ((x + tamano) % tamano)];
  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      const dhdu = (h(x + 1, y) - h(x - 1, y)) * 0.5 * fuerza;
      // "v" crece hacia arriba, que es la fila anterior del lienzo.
      const dhdv = (h(x, y - 1) - h(x, y + 1)) * 0.5 * fuerza;
      const nx = -dhdu;
      const ny = -dhdv;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (y * tamano + x) * 4;
      normal[i] = (nx * inv * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      normal[i + 2] = (inv * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
    }
  }

  return {
    color: configurar(new CanvasTexture(crearLienzo(tamano, color)), anisotropia, true),
    normal: configurar(new CanvasTexture(crearLienzo(tamano, normal)), anisotropia, false),
    rugosidad: configurar(new CanvasTexture(crearLienzo(tamano, rugosidad)), anisotropia, false),
  };
}
