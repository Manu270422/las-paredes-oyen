// Estado "ACECHANDO": me sigue a distancia, por donde yo pasé, e IMITA mis
// pasos (con su cuerpo: el eco sale de donde está ella). Cuando me detengo,
// da un paso más. Y si la grabadora ya me reveló que me copia (403), cuando
// me detengo repite mi ritmo completo.
// Si me doy vuelta y la ilumino, se queda inmóvil... mirándome sin ojos.
// Si en ese momento hago ruido, se lanza. Si me quedo en silencio, se hunde
// en la pared. El jugador aprende: "si lo veo, no me muevo".
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Ruido } from '../../nucleo/Eventos';
import type { Entidad } from '../Entidad';
import type { EstadoIA } from '../TiposIA';
import { aleatorio } from '../../utilidades/Matematicas';
import { entidadVisibleParaJugador } from '../../director/Visibilidad';

/** Distancia a la que me siente aunque esté quieto: prácticamente tocándola. */
const DISTANCIA_CONTACTO = 1.2;

export class EstadoAcechando implements EstadoIA {
  readonly nombre = 'acechando' as const;
  private duracion = 30;
  private vista = 0;

  entrar(entidad: Entidad, ctx: ContextoJuego): void {
    this.duracion = aleatorio(20, 38);
    this.vista = 0;
    entidad.pose = 'quieto';
    // Con cuerpo, siempre al menos da el paso de más. La repetición de ritmo
    // llega después de que la grabadora del 403 me mostró "mis pasos estando quieto".
    entidad.imitador.iniciar(ctx, {
      etapa: ctx.progreso.imitacionCompleta ? 3 : 2,
      fuente: () => ({ x: entidad.posicion.x, z: entidad.posicion.z }),
      conCuerpo: true,
      duracion: 60,
    });
  }

  salir(entidad: Entidad): void {
    entidad.imitador.detener();
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    const jugador = ctx.jugador;
    const distancia = entidad.distanciaAlJugador(ctx);
    this.duracion -= dt;

    // La excepción a su regla: si me muevo cerca de ella, me siente aunque no haga ruido.
    // Y si estoy prácticamente encima, me siente aunque esté quieto.
    const moviendome = jugador.rapidez > 0.12;
    if ((distancia < CONFIG.entidad.radioPresencia && moviendome) || distancia < DISTANCIA_CONTACTO) {
      entidad.cazar('presencia', ctx);
      return;
    }

    // ¿Me está viendo?
    if (entidadVisibleParaJugador(ctx)) {
      this.vista += dt;
      entidad.pose = 'quieto';
      entidad.velocidadActual = 0;
      entidad.mirarHacia(jugador.posicion.x, jugador.posicion.z, dt, 3);
      if (this.vista > 1.4) entidad.cambiarEstado('retirada', ctx);
      return;
    }
    this.vista = Math.max(0, this.vista - dt);

    if (this.duracion <= 0) {
      entidad.cambiarEstado('retirada', ctx);
      return;
    }

    // Sigo el rastro del jugador manteniendo 6-8 m de distancia.
    const rastro = entidad.memoria.rastro;
    const objetivo = rastro[Math.max(0, rastro.length - 7)];
    if (distancia > 7.5 && objetivo && jugador.rapidez > 0.1) {
      if (!entidad.tieneCamino) entidad.irHacia(objetivo.x, objetivo.z, ctx);
      entidad.pose = 'caminar';
      entidad.avanzar(dt, Math.min(CONFIG.entidad.velocidadAcechar * 1.4, Math.max(0.6, jugador.rapidez)), ctx);
    } else {
      // Quieta, orientada hacia mí. Los pasos que "da" cuando me detengo los pone el imitador.
      entidad.pose = 'quieto';
      entidad.velocidadActual = 0;
      entidad.mirarHacia(jugador.posicion.x, jugador.posicion.z, dt, 2);
    }
  }

  alOir(entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    // Si me está viendo y hace ruido: se acabó el juego del escondite.
    if (ruido.origen === 'jugador' && (percibido >= CONFIG.entidad.umbralCaza || (this.vista > 0.2 && percibido > 0.12))) {
      entidad.cazar(ruido.causa, ctx, ruido.pared);
    }
  }
}
