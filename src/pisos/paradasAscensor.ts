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
 * Al Piso 1, que todavía no existe: la cabina baja hasta el 2 y su guion cierra la partida (P2-guion: el ascensor
 * es el único camino abajo, porque la escalera del 2 está tapiada). El botón tiene cerradura: pide la llave de
 * servicio del 202, que viaja en el bolsillo (por eso funciona igual desde el 3 o el 4).
 */
export const PARADA_AL_1: ParadaAscensor = {
  hacia: 'piso1',
  numero: '1',
  texto: 'Bajar al Piso 1',
  requiere: 'objeto:llave_servicio',
  cerrada: 'El botón del 1 tiene una cerradura. Hace falta una llave de servicio.',
};
