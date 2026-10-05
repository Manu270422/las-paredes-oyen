// Aquí están los pisos que existen. Es el ÚNICO lugar que conoce a cada paquete por su nombre:
// el motor pide un piso por aquí y nunca importa una carpeta de piso directamente.
import { PISO_4 } from './piso4';
import type { PaquetePiso } from './TiposPiso';

export const PISOS: readonly PaquetePiso[] = [PISO_4];

/** El piso con el que empieza una partida nueva. */
export const PISO_INICIAL: PaquetePiso = PISO_4;
