// Aquí reviso que el ascensor de cada piso esté bien puesto y bien enlazado: que su cabina sea la única 'A' de la
// rejilla, con tres lados de muro y una boca hacia el pasillo; que su lámpara esté adentro; que cada parada lleve a
// un piso del catálogo con su cabina EN LA MISMA CELDA y con el mismo panel (la cabina es una sola: el piso cambia
// con las puertas cerradas y nadie debe notar la diferencia), y que desde allá se pueda volver.
// Lo usan las pruebas sobre todo el catálogo: un ascensor roto se descubre antes de jugar, no a mitad de un viaje.
import { bocaDeCabina } from '../mundo/MarcoCabina';
import { Rejilla } from '../mundo/Rejilla';
import { numerosDelPanel } from '../mundo/Ascensor';
import type { PaquetePiso } from './TiposPiso';

/** Lo que está mal en el ascensor de `piso`, contra los pisos que existen (vacío si todo está bien). */
export function problemasDeAscensor(piso: PaquetePiso, pisos: readonly PaquetePiso[]): string[] {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const cabinas: Array<[number, number]> = [];
  for (let gy = 0; gy < rejilla.alto; gy++) for (let gx = 0; gx < rejilla.ancho; gx++) if (rejilla.esCabina(gx, gy)) cabinas.push([gx, gy]);
  const a = piso.ascensor;
  if (!a) return cabinas.length > 0 ? [`${piso.id}: la rejilla tiene una cabina ('A') pero el paquete no declara ascensor`] : [];

  const donde = `${piso.id}/ascensor`;
  const problemas: string[] = [];
  if (cabinas.length !== 1 || cabinas[0][0] !== a.x || cabinas[0][1] !== a.y) {
    problemas.push(`${donde}: la rejilla debe tener una sola 'A', en (${a.x}, ${a.y}); tiene ${JSON.stringify(cabinas)}`);
  }
  if (!bocaDeCabina(rejilla, a.x, a.y)) problemas.push(`${donde}: la cabina necesita tres lados de muro y una sola boca hacia una celda de piso`);
  if (!piso.mapa.habitaciones.some((h) => a.x >= h.x0 && a.x <= h.x1 && a.y >= h.y0 && a.y <= h.y1)) {
    problemas.push(`${donde}: la cabina no está en ninguna habitación del mapa (sin ella no tiene reverberación ni nombre)`);
  }
  const adentro = (x: number, y: number) => Math.floor(x) === a.x && Math.floor(y) === a.y;
  if (a.lampara) {
    const l = piso.mapa.lamparas.find((x) => x.id === a.lampara);
    if (!l) problemas.push(`${donde}: la lámpara "${a.lampara}" no está en el mapa`);
    else if (!adentro(l.x, l.y)) problemas.push(`${donde}: la lámpara "${a.lampara}" no está dentro de la cabina`);
  }
  for (const cosa of [...piso.mapa.muebles, ...piso.mapa.interactuables]) {
    if (adentro(cosa.x, cosa.y)) problemas.push(`${donde}: hay un ${cosa.tipo} dentro de la cabina (no cabe con las puertas)`);
  }
  for (const [nombre, p] of Object.entries(piso.mapa.puntosControl)) {
    if (adentro(p.x, p.y)) problemas.push(`${donde}: el punto de control "${nombre}" está dentro de la cabina (al cargar, las puertas están cerradas)`);
  }
  if (a.muerto && !a.requiere) problemas.push(`${donde}: dice qué pasa cuando está muerto, pero no pide nada para funcionar`);
  if (a.paradas.length === 0) problemas.push(`${donde}: no lleva a ningún piso`);
  if (Number.isNaN(Number(a.numero))) problemas.push(`${donde}: el número del indicador ("${a.numero}") no es un número`);

  const panel = numerosDelPanel(a).join(',');
  for (const parada of a.paradas) {
    const destino = pisos.find((p) => p.id === parada.hacia);
    if (parada.hacia === piso.id) {
      problemas.push(`${donde}: una parada lleva al mismo piso`);
      continue;
    }
    if (!destino) {
      problemas.push(`${donde}: lleva a "${parada.hacia}", que no está en el catálogo`);
      continue;
    }
    const otro = destino.ascensor;
    if (!otro) {
      problemas.push(`${donde}: lleva a "${parada.hacia}", que no tiene ascensor`);
      continue;
    }
    if (otro.x !== a.x || otro.y !== a.y) problemas.push(`${donde}: la cabina de "${parada.hacia}" está en otra celda (tiene que ser la misma)`);
    if (otro.numero === a.numero) problemas.push(`${donde}: "${parada.hacia}" marca el mismo número en el indicador`);
    if (!otro.paradas.some((p) => p.hacia === piso.id)) problemas.push(`${donde}: desde "${parada.hacia}" el ascensor no vuelve aquí`);
    if (numerosDelPanel(otro).join(',') !== panel) problemas.push(`${donde}: el panel de "${parada.hacia}" no es igual a este (la cabina es la misma)`);
  }
  return problemas;
}
