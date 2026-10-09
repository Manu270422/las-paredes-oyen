// Aquí defino la cadena de objetivos del vertical slice. Cada objetivo se
// completa con una bandera de progreso. Los mantengo cortos y diegéticos:
// son las tareas de un técnico de sonido, no "misiones" de videojuego.
import type { Objetivo } from '../../narrativa/TiposNarrativa';

export const OBJETIVOS: readonly Objetivo[] = [
  { id: 'orden', texto: 'Lee la orden de trabajo en la escalera', bandera: 'leyo:orden_trabajo' },
  { id: 'medir401', texto: 'Mide la sala del apartamento 401', bandera: 'medido:401' },
  { id: 'medir403', texto: 'Mide la sala del apartamento 403', bandera: 'medido:403' },
  { id: 'tablero', texto: 'Restablece la luz: el tablero está en el cuarto de servicio, al fondo del pasillo', bandera: 'tablero_activado' },
  // La orden de trabajo dice que la llave la tenía el vecino del 403; en su estudio, la nota dice dónde está.
  { id: 'llave', texto: 'Busca la llave del 402: Hernando se la dejó al vecino del 403', bandera: 'leyo:nota_escritorio' },
  { id: 'llave401', texto: 'La llave del 402 está en el cajón de la mesita del 401', bandera: 'objeto:llave_402' },
  { id: 'medir402', texto: 'Mide la sala del apartamento 402', bandera: 'medido:402' },
  { id: 'bajar', texto: 'Encuentra cómo bajar', bandera: 'objeto:llave_escalera' },
];
