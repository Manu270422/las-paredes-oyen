// Aquí junto el almacenamiento del navegador con el versionado: leo una clave,
// la llevo a la versión actual y, si está dañada, guardo una copia en
// "<clave>:respaldo" antes de que alguien la reemplace. Perder el perfil de
// un jugador por un JSON roto sería imperdonable; con el respaldo, se recupera a mano.
import { escribirJSON, escribirTexto, leerTexto } from '../utilidades/Almacenamiento';
import { cargarVersionado, type Carga, type Migracion } from './Versionado';

export function leerVersionado<T>(
  clave: string,
  actual: number,
  migraciones: readonly Migracion[],
  valido: (datos: Record<string, unknown>) => datos is Record<string, unknown> & T,
): Carga<T> {
  const texto = leerTexto(clave);
  if (texto === null) return { estado: 'vacio' };
  let carga: Carga<T>;
  try {
    carga = cargarVersionado(JSON.parse(texto), actual, migraciones, valido);
  } catch {
    carga = { estado: 'danado' };
  }
  if (carga.estado === 'danado') escribirTexto(`${clave}:respaldo`, texto);
  // Si lo migré, lo guardo ya en el formato nuevo.
  if (carga.estado === 'ok' && carga.migrado) escribirJSON(clave, carga.datos);
  return carga;
}
