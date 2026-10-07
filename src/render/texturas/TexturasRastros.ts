// Aquí paso un rastro pintado (PintorRastros, lógica pura) a una textura del navegador. Lo único que hago
// aquí y no allá es escribir, porque las letras necesitan un lienzo de verdad: las de lápiz de la estatura las
// escribo en una capa aparte y la pongo DEBAJO del rastro (la mancha y el restregado tapan el lápiz); las de
// una frase las trazo como máscara y el pintor las vuelve sangre.
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { DefRastro } from '../../pisos/TiposPiso';
import { GRAFITO, pintarRastro, ponerDebajo, type PinturaRastro, type RenglonFrase } from './PintorRastros';

/** Letra a mano: la que haya en el sistema (Windows, Mac/iPhone, y la cursiva genérica en Android). */
const LETRA_A_MANO = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
/** Mayúsculas de palo, como salen con el dedo: la que haya en el sistema. */
const LETRA_DE_PALO = 'Arial, Helvetica, Roboto, "Liberation Sans", sans-serif';
/** Qué parte del tamaño de la fuente ocupan las mayúsculas (en las de palo, casi tres cuartos). */
const ALTO_MAYUSCULA = 0.72;

/** Pinto un rastro y lo convierto en textura. `escala` sigue la calidad de las texturas del juego. */
export function texturaRastro(def: DefRastro, escala: number, anisotropia: number): CanvasTexture {
  const pintura = pintarRastro(def, escala, trazarLetras);
  const lienzo = document.createElement('canvas');
  lienzo.width = pintura.ancho;
  lienzo.height = pintura.alto;
  const c = lienzo.getContext('2d', { willReadFrequently: pintura.letras.length > 0 });
  if (!c) throw new Error('No pude crear un contexto 2D para los rastros.');
  let datos = pintura.datos;
  if (pintura.letras.length > 0) {
    escribirLetras(c, pintura);
    datos = ponerDebajo(datos, c.getImageData(0, 0, pintura.ancho, pintura.alto).data);
  }
  c.putImageData(new ImageData(new Uint8ClampedArray(datos), pintura.ancho, pintura.alto), 0, 0);
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = anisotropia;
  return textura;
}

/** Un número de 0 a 1 que sale siempre igual para la misma semilla y la misma letra. */
function azar(semilla: number, i: number, canal: number): number {
  const s = Math.sin(semilla * 12.9898 + i * 78.233 + canal * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Las letras de una frase como máscara: relleno y contorno grueso de punta redonda, que es lo que deja un dedo.
 * Cada letra va un poco torcida, corrida y de su propio tamaño, como escrita a mano contra una pared. Si un
 * renglón no cabe, lo aprieto a lo ancho (nunca se sale del cuadro).
 */
function trazarLetras(renglones: readonly RenglonFrase[], ancho: number, alto: number): Uint8ClampedArray {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const c = lienzo.getContext('2d', { willReadFrequently: true });
  if (!c) throw new Error('No pude crear un contexto 2D para las letras de una frase.');
  c.fillStyle = '#fff';
  c.strokeStyle = '#fff';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  for (const r of renglones) {
    c.save();
    c.translate(r.x, r.y);
    c.rotate(r.inclinacion);
    c.font = `${Math.max(6, Math.round(r.alto / ALTO_MAYUSCULA))}px ${LETRA_DE_PALO}`;
    c.lineWidth = Math.max(1, r.grosor * 0.55);
    const anchos = [...r.texto].map((letra) => c.measureText(letra).width);
    const total = anchos.reduce((a, b) => a + b, 0) + c.lineWidth;
    const apretar = Math.min(1, r.anchoMax / total);
    let x = (-total * apretar) / 2 + (c.lineWidth * apretar) / 2;
    [...r.texto].forEach((letra, i) => {
      const w = anchos[i] * apretar;
      if (letra !== ' ') {
        c.save();
        c.translate(x + w / 2, (azar(r.semilla, i, 1) - 0.5) * r.alto * 0.1);
        c.rotate((azar(r.semilla, i, 2) - 0.5) * 0.14);
        c.scale(apretar * (0.94 + 0.1 * azar(r.semilla, i, 3)), 0.93 + 0.12 * azar(r.semilla, i, 4));
        c.fillText(letra, 0, 0);
        c.strokeText(letra, 0, 0);
        c.restore();
      }
      x += w;
    });
    c.restore();
  }
  const rgba = c.getImageData(0, 0, ancho, alto).data;
  const cobertura = new Uint8ClampedArray(ancho * alto);
  for (let i = 0; i < cobertura.length; i++) cobertura[i] = rgba[i * 4 + 3];
  return cobertura;
}

/** Lo escrito a lápiz junto a cada raya: un poco torcido, como lo escribe alguien agachado contra la pared. */
function escribirLetras(c: CanvasRenderingContext2D, pintura: PinturaRastro): void {
  c.fillStyle = `rgba(${GRAFITO[0]}, ${GRAFITO[1]}, ${GRAFITO[2]}, 0.78)`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  pintura.letras.forEach((l, i) => {
    c.save();
    c.translate(l.x, l.y);
    c.rotate((i % 2 === 0 ? -1.5 : 1) * (Math.PI / 180));
    c.font = `${Math.max(6, Math.round(l.alto))}px ${LETRA_A_MANO}`;
    c.fillText(l.texto, 0, 0);
    c.restore();
  });
}
