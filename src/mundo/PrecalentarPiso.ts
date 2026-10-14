// Aquí pinto, durante la carga, los dibujos de los pisos a los que todavía no he llegado: sus rastros y sus
// letreros, lo más caro de armar un piso. Quedan guardados (LienzosGuardados), así que cruzar a ese piso por la
// escalera caminando no tiene que pintarlos en el momento: el cambio de piso queda en un parpadeo.
import type { PaquetePiso } from '../pisos/TiposPiso';
import { precalentarLetreros } from './Letreros';
import { precalentarRastro, type DetalleTexturas } from './Rastros';

export function precalentarPiso(piso: PaquetePiso, detalle: DetalleTexturas): void {
  for (const d of piso.rastros ?? []) precalentarRastro(d, detalle);
  precalentarLetreros(piso.placas ?? [], piso.rotulos ?? []);
}
