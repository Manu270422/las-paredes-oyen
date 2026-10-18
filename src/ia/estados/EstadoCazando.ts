// Estado "CAZANDO": me oyó claramente y viene por mí.
// Es un poco más lento que yo corriendo, pero correr hace ruido y lo mantiene
// sobre mi rastro. Para escapar tengo que CORTAR el sonido: cerrar puertas,
// agacharme, contener la respiración... y confiar en que pierda mi pista.
// Nunca se lanza de inmediato: primero el aviso, después la carrera.
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Ruido } from '../../nucleo/Eventos';
import type { Entidad } from '../Entidad';
import type { EstadoIA } from '../TiposIA';

// El aviso (ctx.dificultad.avisoCaza): se endereza, gira hacia mí y jadea, y RECIÉN ENTONCES corre. Es lo que
// exige la regla de justicia: sin él, una caza que empieza a 3 m es una muerte sin oportunidad (1.3 s en las
// pruebas). Ninguna dificultad lo baja de 0.5 s (lo prueba dificultad.test.ts). Mientras dura, NO atrapa aunque esté
// encima (entidad.avisando): una caza que empieza pegada al jugador, como cuando cae dentro de la cabina, también avisa.

export class EstadoCazando implements EstadoIA {
  readonly nombre = 'cazando' as const;
  private recalcular = 0;
  private ultimoContacto = 0;
  private arranque = 0;

  entrar(entidad: Entidad, ctx: ContextoJuego): void {
    this.recalcular = 0;
    this.arranque = ctx.dificultad.avisoCaza;
    entidad.avisando = true;
    this.ultimoContacto = ctx.programador.ahora;
    entidad.pose = 'quieto';
    entidad.velocidadActual = 0;
    const p = entidad.posicion;
    ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x: p.x, y: 2, z: p.z }, volumen: 1, tono: 1.25 });
    ctx.bus.emit('interferencia', { intensidad: 0.6, duracion: 0.5 });
    ctx.jugador.sobresaltar(0.5);
    ctx.memoria.persecuciones++;
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    const j = ctx.jugador.posicion;
    const ahora = ctx.programador.ahora;
    if (this.arranque > 0) {
      this.arranque -= dt;
      if (this.arranque <= 0) entidad.avisando = false;
      this.ultimoContacto = ahora;
      entidad.pose = 'quieto';
      entidad.velocidadActual = 0;
      entidad.mirarHacia(j.x, j.z, dt, 6);
      return;
    }
    const cerca = entidad.distanciaAlJugador(ctx) < ctx.dificultad.radioPresencia * 1.6;
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
    const resultado = entidad.avanzar(dt, ctx.dificultad.velocidadCaza, ctx, true);
    // Ya en su celda: el camino termina en el centro, y si él está quieto cerca de una esquina queda hasta a 0.92 m,
    // más de lo que alcanzo (CONFIG.entidad.distanciaAtrapar, 0.85). Me quedaba pegada sin tocarlo, y la caza no
    // terminaba nunca (en la puerta del Piso 1 eso dejaba la salida esperando para siempre). Si sé dónde está, doy el
    // último paso hasta él (dentro de una celda no hay muros).
    if (resultado === 'llego' && conoce) {
      entidad.deslizarHacia(j.x, j.z, ctx.dificultad.velocidadCaza, dt);
      return;
    }
    if ((resultado === 'llego' || resultado === 'sin-camino') && !conoce) {
      // Perdí su rastro: vuelvo a buscar escuchando.
      entidad.cambiarEstado('investigando', ctx);
      return;
    }
    // Si la persecución se alarga sin contacto, me rindo por ahora.
    if (ahora - this.ultimoContacto > 9) entidad.cambiarEstado('retirada', ctx);
  }

  salir(entidad: Entidad): void {
    entidad.avisando = false;
  }

  alOir(_entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    if (ruido.origen === 'jugador' && percibido > CONFIG.entidad.umbralAudicion * 1.5) this.ultimoContacto = ctx.programador.ahora;
  }
}
