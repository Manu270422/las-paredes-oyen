// Aquí traduzco cada acción al símbolo que el jugador debe presionar según
// su dispositivo. Si juega con mando le digo "A", si juega con teclado "E",
// y si juega en el celular le hablo del botón en pantalla.
import type { ModoEntrada } from './AccionesEntrada';

export type AccionConGlifo =
  | 'interactuar'
  | 'linterna'
  | 'agacharse'
  | 'aguantar'
  | 'escuchar'
  | 'senuelo'
  | 'correr'
  | 'pausa';

const GLIFOS: Record<ModoEntrada, Record<AccionConGlifo, string>> = {
  teclado: {
    interactuar: 'E',
    linterna: 'F',
    agacharse: 'C',
    aguantar: 'Q',
    escuchar: 'Clic der.',
    senuelo: 'G',
    correr: 'Shift',
    pausa: 'Esc',
  },
  mando: {
    interactuar: 'A',
    linterna: 'Y',
    agacharse: 'B',
    aguantar: 'RB',
    escuchar: 'LB',
    senuelo: 'X',
    correr: 'L3',
    pausa: 'Start',
  },
  tactil: {
    interactuar: 'la mano',
    linterna: 'la linterna',
    agacharse: 'agacharse',
    aguantar: 'los pulmones',
    escuchar: 'la oreja',
    senuelo: 'la cinta',
    correr: 'el joystick al borde',
    pausa: 'pausa',
  },
};

export function glifo(modo: ModoEntrada, accion: AccionConGlifo): string {
  return GLIFOS[modo][accion];
}

/** Reemplazo las marcas {accion} de un texto por el glifo correcto. */
export function traducirTexto(texto: string, modo: ModoEntrada): string {
  return texto.replace(/\{(\w+)\}/g, (coincidencia, nombre: string) => {
    const tabla = GLIFOS[modo] as Record<string, string>;
    return tabla[nombre] !== undefined ? `[${tabla[nombre]}]` : coincidencia;
  });
}
