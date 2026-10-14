// Aquí está la regla del cuarto sordo (P2-guion): un cuarto con colchones en las paredes AÍSLA el sonido en los dos
// sentidos. Lo que pasa adentro no sale (mis pasos, mi respiración, el jadeo) y lo de afuera no entra (sus rasguños,
// sus pasos, los golpes del director). Dentro del mismo cuarto, el sonido es normal: si ella entra conmigo, me oye y
// la oigo. La usan el audio que oigo, el oído de ella y los subtítulos de sonidos: los tres con la misma regla.
// Es lógica pura (sin three.js) para poder probarla sola.
import type { DefHabitacion } from './datos/TiposMapa';

/** Cuánto pasa a mi oído de un sonido a través de un cuarto acolchado: un golpe sordo, muy lejos. */
export const TRANSMISION_ACOLCHADO = 0.03;
/**
 * Cuánto le llega a ella a través de los colchones: nada. El ruido más fuerte que hago (correr pegado a un muro,
 * 1.44) pegado al muro y con el oído de Pesadilla queda en un tercio de lo que necesita para oír (lo prueba
 * aislamiento.test.ts); con 0.03 quedaba justo en el borde.
 */
export const OIDO_ACOLCHADO = 0.01;

/** ¿Es un cuarto con colchones en las paredes? */
export function esAcolchado(h: DefHabitacion | null | undefined): boolean {
  return h?.pared === 'acolchado';
}

/**
 * ¿Un cuarto acolchado separa estos dos lugares? Sí, si están en cuartos distintos (o uno dentro de un muro, que no es
 * ningún cuarto) y alguno de los dos es acolchado.
 */
export function aislaAcolchado(a: DefHabitacion | null, b: DefHabitacion | null): boolean {
  if (a === b) return false;
  return esAcolchado(a) || esAcolchado(b);
}
