// Aquí reviso si se cumple lo que pide algo del piso para funcionar (un tramo de escalera, el ascensor): una bandera
// de la historia. Si pide un objeto ("objeto:<id>"), miro el bolsillo: la bandera "objeto:" se queda en el piso
// donde lo tomé, pero el objeto viaja conmigo.
import type { Progreso } from './Progreso';

const PREFIJO_OBJETO = 'objeto:';

export function cumpleRequisito(progreso: Pick<Progreso, 'tiene' | 'tieneObjeto'>, requiere: string): boolean {
  if (progreso.tiene(requiere)) return true;
  return requiere.startsWith(PREFIJO_OBJETO) && progreso.tieneObjeto(requiere.slice(PREFIJO_OBJETO.length));
}
