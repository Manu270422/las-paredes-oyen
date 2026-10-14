// Aquí están los pisos que existen. Es el ÚNICO lugar que conoce a cada paquete por su nombre:
// el motor pide un piso por aquí y nunca importa una carpeta de piso directamente.
import { PISO_2 } from './piso2';
import { PISO_3 } from './piso3';
import { PISO_4 } from './piso4';
import type { PaquetePiso } from './TiposPiso';

export const PISOS: readonly PaquetePiso[] = [PISO_4, PISO_3, PISO_2];

/** El piso con el que empieza una partida nueva. */
export const PISO_INICIAL: PaquetePiso = PISO_4;

/** El piso con ese id, o undefined si no está en el catálogo (una partida de una versión que lo tenía). */
export function pisoPorId(id: string): PaquetePiso | undefined {
  return PISOS.find((p) => p.id === id);
}

/** El piso del catálogo que lleva a `id` como su `siguiente` (el último que existe antes de uno por hacer), o undefined. */
export function pisoAntesDe(id: string): PaquetePiso | undefined {
  return PISOS.find((p) => p.siguiente?.id === id);
}

/** Qué sigue después de un piso: su nombre y si ya existe en el catálogo (se puede jugar). */
export function siguienteDe(piso: PaquetePiso): { nombre: string; disponible: boolean } | null {
  const s = piso.siguiente;
  return s ? { nombre: s.nombre, disponible: PISOS.some((p) => p.id === s.id) } : null;
}
