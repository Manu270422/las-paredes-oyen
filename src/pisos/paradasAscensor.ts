// Aquí están los botones del panel del ascensor que se repiten en varios pisos. El edificio tiene UN ascensor: su
// panel es el mismo en todos los pisos (EnlacesAscensor lo exige), y lo que pide cada botón no debe escribirse
// distinto en cada paquete. Cada piso declara a cuáles lleva desde él.
import type { ParadaAscensor } from './TiposPiso';

/**
 * Al Piso 2, desde arriba. El botón no se enciende hasta que llegué al 2 por la escalera: la primera bajada a un
 * piso es caminando (decisión del creador del 2026-10-12, para el 4 y el 3, que vale igual aquí).
 */
export const PARADA_AL_2: ParadaAscensor = {
  hacia: 'piso2',
  texto: 'Bajar al Piso 2',
  requiere: 'visitado:piso2',
  cerrada: 'El botón del 2 no se enciende.',
};

/**
 * Al Piso 1, desde el 2: el único camino abajo (la escalera del 2 está tapiada). El botón tiene cerradura: pide la
 * llave de servicio del 202. Bajando, la cabina se detiene entre pisos con ella encima (el clímax del Piso 2).
 */
export const PARADA_AL_1: ParadaAscensor = {
  hacia: 'piso1',
  texto: 'Bajar al Piso 1',
  requiere: 'objeto:llave_servicio',
  cerrada: 'El botón del 1 tiene una cerradura. Hace falta una llave de servicio.',
};

/**
 * Al Piso 1, desde el 3 y el 4: no se enciende. La bajada al 1 es la del 2 (la cabina detenida no se salta) y del 1
 * no se vuelve a subir (allá el ascensor se queda sin corriente), así que "haber estado en el 1" no se cumple nunca
 * desde aquí arriba.
 */
export const PARADA_AL_1_DESDE_ARRIBA: ParadaAscensor = {
  hacia: 'piso1',
  texto: 'Bajar al Piso 1',
  requiere: 'visitado:piso1',
  cerrada: 'El botón del 1 no se enciende desde este piso.',
};
