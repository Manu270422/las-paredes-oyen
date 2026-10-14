// Aquí está el único susto "directo" del juego: la criatura frente a la cámara,
// con la linterna encendida y el grito. Lo uso al morir y en el final.
// Vivía dentro de Juego.ts; lo saqué porque no es orquestación, es contenido.
import { Vector3 } from 'three';
import type { ContextoJuego } from './ContextoJuego';

const adelante = new Vector3();
const cara = new Vector3();
/**
 * Dónde pongo su CARA (no sus pies: la cabeza le cuelga casi 40 cm por delante del cuerpo): a 50 cm de mis ojos,
 * apenas corrida hacia mi mano derecha y un poco más abajo, DENTRO del cono de la linterna, que sale de la mano
 * (20 cm a la derecha y 17 cm abajo). Antes la ponía por sus pies a 55 cm y 2.02 m abajo: la cabeza quedaba a
 * 20 cm, tapando la vista, por debajo de los ojos y fuera de la luz (una mancha negra).
 */
export const SUSTO = { distancia: 0.5, haciaLaMano: 0.1, bajo: 0.09 } as const;

export function mostrarSusto(ctx: ContextoJuego, origen: 'muerte' | 'final'): void {
  ctx.bus.emit('susto', { origen });
  // Accesibilidad (Ajustes): sin su cara, sin el grito fuerte ni el destello. Queda un grito lejano y apagado,
  // y la secuencia sigue igual (el fundido a negro, la explicación de la muerte, el final).
  if (ctx.ajustes.valores.sinSustosFuertes) {
    // Cuando atrapa, ya está a menos de un metro: también la oculto, para que su cara no quede a la vista.
    ctx.entidad.modelo.fijarVisible(false);
    ctx.audio.reproducir('chillido', { bus: 'entidad', volumen: 0.18, tono: 0.7, reverb: 0.8, variacion: 0 });
    ctx.jugador.sobresaltar(0.3);
    return;
  }
  const camara = ctx.jugador.camara;
  camara.getWorldDirection(adelante);
  adelante.y = 0;
  adelante.normalize();
  const modelo = ctx.entidad.modelo;
  // Primero la pose y el giro (mirándome), con los pies en el origen: así mido dónde le queda la cara.
  modelo.raiz.position.set(0, 0, 0);
  modelo.raiz.rotation.y = Math.atan2(-adelante.x, -adelante.z);
  modelo.forzarPose('susto');
  modelo.raiz.updateMatrixWorld(true);
  modelo.cara.getWorldPosition(cara);
  // Después la muevo para que la cara caiga donde quiero. Mi derecha, en el plano: (−adelante.z, adelante.x).
  modelo.raiz.position.set(
    camara.position.x + adelante.x * SUSTO.distancia - adelante.z * SUSTO.haciaLaMano - cara.x,
    camara.position.y - SUSTO.bajo - cara.y,
    camara.position.z + adelante.z * SUSTO.distancia + adelante.x * SUSTO.haciaLaMano - cara.z,
  );
  modelo.fijarVisible(true);
  const linterna = ctx.linterna;
  linterna.encendida = true;
  linterna.bateria = Math.max(linterna.bateria, 0.3);
  linterna.cancelarApagado();
  ctx.audio.reproducir('chillido', { bus: 'entidad', volumen: 0.85, reverb: 0.3, variacion: 0 });
  ctx.jugador.sobresaltar(1);
  ctx.renderizador.efectos.susto = 1;
  ctx.bus.emit('interferencia', { intensidad: 0.7, duracion: 0.4 });
  ctx.entrada.vibrar(1, 600);
}
