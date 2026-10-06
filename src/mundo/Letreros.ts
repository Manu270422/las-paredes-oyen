// Aquí armo los letreros de un piso a partir de sus DATOS: la placa con el número en la puerta de cada
// apartamento y lo pintado en los muros (el número del piso en la escalera). Son para orientarse sin
// romper el miedo: no brillan, se leen con la linterna (la cifra de la escalera, con su luz de emergencia).
import { BoxGeometry, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { DefPlaca, DefRotulo } from '../pisos/TiposPiso';
import { texturaPlaca, texturaRotulo } from '../render/texturas/TexturasLetreros';
import { GRADOS } from '../utilidades/Matematicas';
import type { Puerta } from './Puerta';

/**
 * La placa de un apartamento, en metros. Medido en el juego con cifras de 12 cm: frente a la puerta (~1 m)
 * ocupan ~20 px de alto en el perfil de teléfono y ~60 en PC. Desde 3 m por el pasillo (1.3 m de ancho) la
 * placa se ve casi de canto (77°): la cifra queda de menos de 1 px de ancho en el teléfono y no se lee con
 * ningún tamaño. Capturas en docs/media/capturas/placa-*.jpg.
 */
export const PLACA = { ancho: 0.28, alto: 0.15, cifras: 0.12, grosor: 0.006, altura: 1.55 } as const;

/** Qué parte del alto del lienzo ocupa una cifra pintada (el resto es margen para los chorreones). */
const FRACCION_ROTULO = 0.8;
/** Separación de lo pintado respecto al muro: evita el parpadeo de profundidad sin que se note. */
const SEPARACION_MURO = 0.004;

let materialCanto: MeshStandardMaterial | null = null;

/** Cuelgo la placa de la hoja de su puerta, en la cara del pasillo. Se llama "placa:<texto>". */
export function colgarPlaca(def: DefPlaca, puerta: Puerta): Mesh {
  // El canto es latón oscuro, del tono de la cara: café rojizo se leía como una línea roja al verla de lado.
  materialCanto ??= new MeshStandardMaterial({ color: 0x4f4226, metalness: 0.4, roughness: 0.6 });
  const texturas = texturaPlaca(def.texto, PLACA.alto / PLACA.ancho, PLACA.cifras / PLACA.alto);
  // Rugosidad y metal salen del mapa de material: el latón brilla y el surco de las cifras es mate. El
  // latón queda con metal a medias: el juego no tiene mapa de entorno y un metal puro se vería negro.
  const frente = new MeshStandardMaterial({
    map: texturas.color,
    roughnessMap: texturas.material,
    metalnessMap: texturas.material,
    roughness: 1,
    metalness: 1,
  });
  // Las caras de la caja van en orden +X, -X, +Y, -Y, +Z, -Z: el frente es la +Z.
  const placa = new Mesh(new BoxGeometry(PLACA.ancho, PLACA.alto, PLACA.grosor), [
    materialCanto,
    materialCanto,
    materialCanto,
    materialCanto,
    frente,
    materialCanto,
  ]);
  placa.name = `placa:${def.texto}`;
  placa.receiveShadow = true;
  puerta.colgarEnCaraDeEmpuje(placa, PLACA.altura, PLACA.grosor);
  return placa;
}

/** Pinto un rótulo sobre la cara de un muro. Se llama "rotulo:<texto>". */
export function pintarRotulo(def: DefRotulo): Mesh {
  const lado = def.alto / FRACCION_ROTULO;
  const material = new MeshStandardMaterial({
    map: texturaRotulo(def.texto, FRACCION_ROTULO),
    alphaTest: 0.5,
    roughness: 0.9,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const rotulo = new Mesh(new PlaneGeometry(lado, lado), material);
  rotulo.name = `rotulo:${def.texto}`;
  rotulo.receiveShadow = true;
  const angulo = def.rot * GRADOS;
  rotulo.rotation.y = angulo;
  rotulo.position.set(
    def.x * CONFIG.celda + Math.sin(angulo) * SEPARACION_MURO,
    def.altura,
    def.y * CONFIG.celda + Math.cos(angulo) * SEPARACION_MURO,
  );
  return rotulo;
}
