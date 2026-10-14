// Aquí guardo los lienzos ya pintados (rastros, placas, rótulos). Pintarlos cuesta: van píxel por píxel, y en la
// carga de un piso eran más de la mitad del tiempo. Un piso se arma cada vez que llego a él por una escalera; al
// irme, el nivel suelta sus texturas de la GPU, pero el dibujo queda aquí y, al volver, solo se sube otra vez.
// Así cruzar el descanso caminando es un parpadeo y no un segundo de negro.

const guardados = new Map<string, HTMLCanvasElement[]>();

/** Los lienzos de `clave`: los pinto la primera vez y después devuelvo los mismos (no hay que pintar encima). */
export function lienzosGuardados(clave: string, pintar: () => HTMLCanvasElement[]): HTMLCanvasElement[] {
  let lienzos = guardados.get(clave);
  if (!lienzos) {
    lienzos = pintar();
    guardados.set(clave, lienzos);
  }
  return lienzos;
}
