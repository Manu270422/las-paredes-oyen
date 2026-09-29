// Aquí está la regla común de TODO lo que guardo (partida, ajustes, perfil):
// cada formato lleva un número de versión y, al cargar, lo subo paso a paso
// (v0 → v1 → v2...) hasta la versión actual. Así una actualización del juego
// nunca borra lo que el jugador ya tenía.
// - Sin versión = v0 (lo que guardaba el juego antes de versionar).
// - Versión MAYOR que la que conozco = "futuro" (alguien volvió a una versión
//   vieja del juego): no lo toco ni lo sobrescribo.
// - Algo que no puedo leer = "dañado": el que llama decide (y guarda un respaldo).

/** Un paso de migración: convierte los datos de la versión "desde" a la siguiente. */
export interface Migracion {
  desde: number;
  migrar(datos: Record<string, unknown>): Record<string, unknown>;
}

export type Carga<T> =
  | { estado: 'vacio' }
  | { estado: 'ok'; datos: T; migrado: boolean }
  | { estado: 'futuro'; version: number }
  | { estado: 'danado' };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Llevo unos datos crudos (lo que salió de JSON.parse) a la versión actual.
 * "valido" confirma que el resultado final tiene la forma que espero.
 */
export function cargarVersionado<T>(
  crudo: unknown,
  actual: number,
  migraciones: readonly Migracion[],
  valido: (datos: Record<string, unknown>) => datos is Record<string, unknown> & T,
): Carga<T> {
  if (crudo === null || crudo === undefined) return { estado: 'vacio' };
  if (!esObjeto(crudo)) return { estado: 'danado' };
  const version = typeof crudo.version === 'number' ? crudo.version : 0;
  if (!Number.isInteger(version) || version < 0) return { estado: 'danado' };
  if (version > actual) return { estado: 'futuro', version };
  let datos: Record<string, unknown> = crudo;
  try {
    for (let v = version; v < actual; v++) {
      const paso = migraciones.find((m) => m.desde === v);
      if (!paso) return { estado: 'danado' };
      datos = { ...paso.migrar(datos), version: v + 1 };
    }
  } catch {
    return { estado: 'danado' };
  }
  return valido(datos) ? { estado: 'ok', datos, migrado: version !== actual } : { estado: 'danado' };
}
