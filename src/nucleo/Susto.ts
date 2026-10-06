// Aquí está el único susto "directo" del juego: la criatura frente a la cámara,
// con la linterna encendida y el grito. Lo uso al morir y en el final.
// Vivía dentro de Juego.ts; lo saqué porque no es orquestación, es contenido.
import { Vector3 } from 'three';
import type { ContextoJuego } from './ContextoJuego';

const adelante = new Vector3();

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
  modelo.raiz.position.set(camara.position.x + adelante.x * 0.55, camara.position.y - 2.02, camara.position.z + adelante.z * 0.55);
  modelo.raiz.rotation.y = Math.atan2(-adelante.x, -adelante.z);
  modelo.forzarPose('susto');
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
