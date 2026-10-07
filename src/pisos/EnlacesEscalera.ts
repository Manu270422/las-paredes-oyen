// Aquí reviso que las escaleras de los pisos estén bien enlazadas: que cada tramo arranque al borde de un
// hueco, lleve a un piso que existe y deje al jugador en un punto de control que ese piso tiene. Y que
// ninguna escalera sea de ida sola: si bajo a un piso, desde él puedo volver a subir.
// Lo usan las pruebas sobre todo el catálogo: un enlace roto se descubre antes de jugar, no al pisar el tramo.
import { esArranqueDeTramo } from '../mundo/HuecoEscalera';
import { Rejilla } from '../mundo/Rejilla';
import type { PaquetePiso } from './TiposPiso';

/** Lo que está mal en las escaleras de `piso`, contra los pisos que existen (vacío si todo está bien). */
export function problemasDeEscaleras(piso: PaquetePiso, pisos: readonly PaquetePiso[]): string[] {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const otrosIds = new Set([...piso.mapa.interactuables.map((i) => i.id), ...piso.mapa.puertas.map((p) => p.id)]);
  const vistos = new Set<string>();
  const problemas: string[] = [];
  for (const e of piso.escaleras ?? []) {
    const donde = `${piso.id}/${e.id}`;
    if (vistos.has(e.id) || otrosIds.has(e.id)) problemas.push(`${donde}: el id se repite en el piso`);
    vistos.add(e.id);
    if (!esArranqueDeTramo(rejilla, Math.floor(e.x), Math.floor(e.y))) {
      problemas.push(`${donde}: (${e.x}, ${e.y}) no es una celda transitable al borde de un hueco de escalera`);
    }
    if (e.hacia === piso.id) {
      problemas.push(`${donde}: lleva al mismo piso`);
      continue;
    }
    const destino = pisos.find((p) => p.id === e.hacia);
    if (!destino) problemas.push(`${donde}: lleva a "${e.hacia}", que no está en el catálogo`);
    else if (!(e.llegada in destino.mapa.puntosControl)) problemas.push(`${donde}: "${e.hacia}" no tiene el punto de control "${e.llegada}"`);
  }
  return problemas;
}

/** Las escaleras de ida sola: llevan de A a B, pero B no tiene ninguna que vuelva a A. */
export function escalerasSinVuelta(pisos: readonly PaquetePiso[]): string[] {
  return pisos.flatMap((piso) =>
    (piso.escaleras ?? [])
      .filter((e) => {
        const destino = pisos.find((p) => p.id === e.hacia);
        return destino !== undefined && !(destino.escaleras ?? []).some((vuelta) => vuelta.hacia === piso.id);
      })
      .map((e) => `${piso.id}/${e.id}: baja (o sube) a "${e.hacia}", pero desde ahí no hay escalera de vuelta`),
  );
}
