// Aquí paso un rastro pintado (PintorRastros, lógica pura) a una textura del navegador. Lo único que hago
// aquí y no allá es escribir: las letras a lápiz de la estatura necesitan un lienzo de verdad. Las escribo en
// una capa aparte y la pongo DEBAJO del rastro, para que la mancha y el restregado tapen el lápiz.
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { DefRastro } from '../../pisos/TiposPiso';
import { GRAFITO, pintarRastro, ponerDebajo, type PinturaRastro } from './PintorRastros';

/** Letra a mano: la que haya en el sistema (Windows, Mac/iPhone, y la cursiva genérica en Android). */
const LETRA_A_MANO = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

/** Pinto un rastro y lo convierto en textura. `escala` sigue la calidad de las texturas del juego. */
export function texturaRastro(def: DefRastro, escala: number, anisotropia: number): CanvasTexture {
  const pintura = pintarRastro(def, escala);
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
