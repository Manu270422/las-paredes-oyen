// Aquí reviso si se cumple lo que pide algo del piso para funcionar (un tramo de escalera, el ascensor): una bandera
// de la historia. Si pide un objeto ("objeto:<id>"), miro el bolsillo: la bandera "objeto:" se queda en el piso
// donde lo tomé, pero el objeto viaja conmigo. Si pide un piso ("visitado:<id>"), miro si ya estuve en él: así el
// botón de un piso en el panel del ascensor no se enciende hasta que llegué a ese piso por la escalera.
import type { Progreso } from './Progreso';

const PREFIJO_OBJETO = 'objeto:';
const PREFIJO_PISO = 'visitado:';

export function cumpleRequisito(progreso: Pick<Progreso, 'tiene' | 'tieneObjeto' | 'visitado'>, requiere: string): boolean {
  if (progreso.tiene(requiere)) return true;
  if (requiere.startsWith(PREFIJO_PISO)) return progreso.visitado(requiere.slice(PREFIJO_PISO.length));
  return requiere.startsWith(PREFIJO_OBJETO) && progreso.tieneObjeto(requiere.slice(PREFIJO_OBJETO.length));
}
