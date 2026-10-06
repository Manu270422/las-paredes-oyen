// Aquí están los pisos que existen. Es el ÚNICO lugar que conoce a cada paquete por su nombre:
// el motor pide un piso por aquí y nunca importa una carpeta de piso directamente.
import { PISO_4 } from './piso4';
import type { PaquetePiso } from './TiposPiso';

export const PISOS: readonly PaquetePiso[] = [PISO_4];

/** El piso con el que empieza una partida nueva. */
export const PISO_INICIAL: PaquetePiso = PISO_4;

/** Qué sigue después de un piso: su nombre y si ya existe en el catálogo (se puede jugar). */
export function siguienteDe(piso: PaquetePiso): { nombre: string; disponible: boolean } | null {
  const s = piso.siguiente;
  return s ? { nombre: s.nombre, disponible: PISOS.some((p) => p.id === s.id) } : null;
}
