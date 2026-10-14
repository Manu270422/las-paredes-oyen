// Aquí está lo que el audio hace en cada fotograma de juego: el ambiente sigue a las lámparas, a la tensión del
// director y a mi estrés (cuatro veces por segundo: eso no cambia tan rápido), los sonidos del ambiente siguen mi
// posición, el modo escuchar ajusta la mezcla, en un cuarto acolchado el ambiente casi se apaga, el oyente sigue a
// la cámara y la oclusión se recalcula.
// Lo saqué de Juego.ts (que tiene un tope de 700 líneas): todo lo que necesita está en el contexto.
import type { ContextoJuego } from '../nucleo/ContextoJuego';

/** Cada cuánto (segundos) actualizo lo que cambia despacio: lámparas, tensión y estrés. */
const CADA_LENTO = 0.25;

export class MezclaFotograma {
  private hastaLento = 0;

  actualizar(dt: number, ctx: ContextoJuego): void {
    const { ambiente, audio, jugador, nivel } = ctx;
    this.hastaLento -= dt;
    if (this.hastaLento <= 0) {
      this.hastaLento = CADA_LENTO;
      ambiente.sincronizarLamparas(nivel.lamparas);
      ambiente.fijarTension(ctx.director.tension);
      ambiente.fijarEstres(jugador.estres);
    }
    ambiente.actualizar(dt, jugador.posicion.x, jugador.posicion.z, nivel.rejilla);
    audio.fijarEscucha(jugador.nivelEscucha);
    audio.fijarAcolchado(nivel.acolchadoEn(jugador.posicion.x, jugador.posicion.z));
    audio.actualizarOyente(jugador.camara);
    audio.actualizar(dt);
  }
}
