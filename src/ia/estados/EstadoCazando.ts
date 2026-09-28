// Estado "CAZANDO": me oyó claramente y viene por mí.
// Es un poco más lento que yo corriendo, pero correr hace ruido y lo mantiene
// sobre mi rastro. Para escapar tengo que CORTAR el sonido: cerrar puertas,
// agacharme, contener la respiración... y confiar en que pierda mi pista.
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Ruido } from '../../nucleo/Eventos';
import type { Entidad } from '../Entidad';
import type { EstadoIA } from '../TiposIA';

export class EstadoCazando implements EstadoIA {
  readonly nombre = 'cazando' as const;
  private recalcular = 0;
  private ultimoContacto = 0;

  entrar(entidad: Entidad, ctx: ContextoJuego): void {
    this.recalcular = 0;
    this.ultimoContacto = ctx.programador.ahora;
    entidad.pose = 'correr';
    const p = entidad.posicion;
    ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x: p.x, y: 2, z: p.z }, volumen: 1, tono: 1.25 });
    ctx.bus.emit('interferencia', { intensidad: 0.6, duracion: 0.5 });
    ctx.jugador.sobresaltar(0.5);
    ctx.memoria.persecuciones++;
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    const j = ctx.jugador.posicion;
    const ahora = ctx.programador.ahora;
    const cerca = entidad.distanciaAlJugador(ctx) < CONFIG.entidad.radioPresencia * 1.6;
    if (cerca) this.ultimoContacto = ahora;
    const conoce = ahora - this.ultimoContacto < 2.5;

    this.recalcular -= dt;
    if (this.recalcular <= 0) {
      this.recalcular = 0.4;
      if (conoce) {
        entidad.irHacia(j.x, j.z, ctx);
      } else {
        const ultima = entidad.memoria.ultimaPosicionJugador;
        if (ultima) entidad.irHacia(ultima.x, ultima.z, ctx);
      }
    }

    entidad.pose = 'correr';
    const resultado = entidad.avanzar(dt, CONFIG.entidad.velocidadCazar, ctx, true);
    if ((resultado === 'llego' || resultado === 'sin-camino') && !conoce) {
      // Perdí su rastro: vuelvo a buscar escuchando.
      entidad.cambiarEstado('investigando', ctx);
      return;
    }
    // Si la persecución se alarga sin contacto, me rindo por ahora.
    if (ahora - this.ultimoContacto > 9) entidad.cambiarEstado('retirada', ctx);
  }

  alOir(_entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    if (ruido.origen === 'jugador' && percibido > CONFIG.entidad.umbralAudicion * 1.5) this.ultimoContacto = ctx.programador.ahora;
  }
}
