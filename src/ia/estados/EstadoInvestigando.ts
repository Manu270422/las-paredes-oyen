// Estado "INVESTIGANDO": tiene cuerpo y va hacia donde oyó algo.
// Al llegar se detiene y ESCUCHA (ladea la cabeza). Si no oye nada, revisa
// cerca y luego los lugares favoritos del jugador.
//
// ENCUENTRO DE PRESENCIA (la regla de justicia más importante del juego):
// antes, si el jugador hacía ruido y se quedaba quieto donde lo hizo, la
// criatura caminaba hasta su celda y lo mataba "sin razón": justo lo que el
// juego le enseñaba a hacer. Ahora, si llego a pocos metros de él y está
// QUIETO, no camino encima: me detengo y escucho. Ese es SU momento:
// - Si contiene la respiración y no se mueve, me voy (me hundo en la pared).
// - Si hace el menor ruido (respirar agitado, jadear), lo cazo.
// - Si se mueve cerca de mí, lo siento aunque no haga ruido: la excepción.
// Es el momento que quiero que recuerde: "estaba a dos metros, respirando".
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Ruido } from '../../nucleo/Eventos';
import type { Entidad } from '../Entidad';
import type { EstadoIA } from '../TiposIA';
import { aleatorio } from '../../utilidades/Matematicas';

/** A esta distancia de un jugador quieto dejo de caminar y escucho (igual en todas las dificultades). */
export const RADIO_ENCUENTRO = 2.6;
// Cuánto dura el encuentro (ctx.dificultad.duracionEncuentro): lo justo para que contener el aire sea posible
// pero angustioso. Y la gracia (ctx.dificultad.graciaEncuentro): mientras ella inhala para escuchar, su propia
// respiración tapa la mía. Es la ventana para reaccionar (contener el aire): sin ella, con mucho miedo exhalo
// cada 0.6 s y moriría antes de poder hacer nada. Solo cubre mi respiración: los pasos se oyen igual.

export class EstadoInvestigando implements EstadoIA {
  readonly nombre = 'investigando' as const;
  private escuchando = 0;
  private busquedas = 0;
  /** Segundos que me quedan escuchando al jugador de cerca (0 = no hay encuentro). */
  private encuentro = 0;
  private gracia = 0;
  /** Recién salida del muro: me quedo quieta escuchando antes de caminar hacia el ruido. */
  private pausa = 0;

  entrar(entidad: Entidad, ctx: ContextoJuego): void {
    this.busquedas = 0;
    this.escuchando = 0;
    this.encuentro = 0;
    entidad.enEncuentro = false;
    this.pausa = entidad.pausaSalida;
    entidad.pausaSalida = 0;
    const r = entidad.memoria.ultimoRuido;
    if (r) entidad.irHacia(r.x, r.z, ctx);
  }

  salir(entidad: Entidad): void {
    this.encuentro = 0;
    entidad.enEncuentro = false;
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    const distancia = entidad.distanciaAlJugador(ctx);
    // La excepción que rompe su regla: si se mueve cerca de mí, lo siento aunque no haga ruido.
    if (distancia < ctx.dificultad.radioPresencia && ctx.jugador.rapidez > 0.12) {
      this.terminarEncuentro(ctx, 'fallido', distancia);
      entidad.cazar('presencia', ctx);
      return;
    }

    if (this.encuentro > 0) {
      this.actualizarEncuentro(entidad, ctx, dt, distancia);
      return;
    }
    if (distancia < RADIO_ENCUENTRO) {
      this.iniciarEncuentro(entidad, ctx, distancia);
      return;
    }

    if (this.pausa > 0) {
      this.pausa -= dt;
      entidad.pose = 'escuchar';
      entidad.velocidadActual = 0;
      return;
    }

    if (this.escuchando > 0) {
      this.escuchando -= dt;
      entidad.pose = 'escuchar';
      entidad.velocidadActual = 0;
      if (this.escuchando <= 0) this.siguientePunto(entidad, ctx);
      return;
    }

    entidad.pose = 'caminar';
    const resultado = entidad.avanzar(dt, CONFIG.entidad.velocidadInvestigar, ctx);
    if (resultado === 'llego' || resultado === 'sin-camino') {
      this.escuchando = aleatorio(2.5, 5);
      entidad.pose = 'escuchar';
      if (Math.random() < 0.5) {
        const p = entidad.posicion;
        ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x: p.x, y: 2, z: p.z }, volumen: 0.7 });
      }
    }
  }

  /** Me detengo a pocos metros y escucho. Mi firma: inhalo despacio... y contengo el aire, como él. */
  private iniciarEncuentro(entidad: Entidad, ctx: ContextoJuego, distancia: number): void {
    this.encuentro = aleatorio(...ctx.dificultad.duracionEncuentro);
    this.gracia = ctx.dificultad.graciaEncuentro;
    entidad.enEncuentro = true;
    entidad.pose = 'escuchar';
    entidad.velocidadActual = 0;
    const p = entidad.posicion;
    ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x: p.x, y: 2, z: p.z }, volumen: 0.5, tono: 0.78, distanciaReferencia: 0.9 });
    ctx.bus.emit('sonido-relevante', { descripcion: 'algo se detiene muy cerca y escucha', x: p.x, z: p.z });
    ctx.bus.emit('encuentro', { estado: 'inicio', distancia });
    ctx.jugador.sumarEstres(0.25);
  }

  private actualizarEncuentro(entidad: Entidad, ctx: ContextoJuego, dt: number, distancia: number): void {
    this.encuentro -= dt;
    this.gracia -= dt;
    entidad.pose = 'escuchar';
    entidad.velocidadActual = 0;
    // Gira la cabeza hacia mí, muy despacio. No me ve. Pero algo nota.
    const j = ctx.jugador.posicion;
    entidad.mirarHacia(j.x, j.z, dt, 0.8);
    if (this.encuentro <= 0) {
      // No oyó nada: se va. Es la recompensa por aguantar.
      this.terminarEncuentro(ctx, 'superado', distancia);
      entidad.cambiarEstado('retirada', ctx);
    }
  }

  private terminarEncuentro(ctx: ContextoJuego, estado: 'superado' | 'fallido', distancia: number): void {
    if (this.encuentro <= 0 && estado === 'fallido') return;
    this.encuentro = 0;
    ctx.bus.emit('encuentro', { estado, distancia });
  }

  private siguientePunto(entidad: Entidad, ctx: ContextoJuego): void {
    this.busquedas++;
    if (this.busquedas > 3) {
      entidad.cambiarEstado('retirada', ctx);
      return;
    }
    // A veces reviso la habitación favorita del jugador: aprendí sus hábitos.
    const favorita = entidad.memoria.habitacionFavorita();
    const habitacion = favorita ? ctx.nivel.habitacionPorId(favorita) : undefined;
    if (habitacion && Math.random() < 0.4) {
      const C = CONFIG.celda;
      const x = (aleatorio(habitacion.x0, habitacion.x1) + 0.5) * C;
      const z = (aleatorio(habitacion.y0, habitacion.y1) + 0.5) * C;
      if (entidad.irHacia(x, z, ctx)) return;
    }
    for (let i = 0; i < 6; i++) {
      const x = entidad.posicion.x + aleatorio(-5, 5);
      const z = entidad.posicion.z + aleatorio(-5, 5);
      if (entidad.irHacia(x, z, ctx)) return;
    }
  }

  alOir(entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    if (this.encuentro > 0) {
      // Mientras inhalo, su respiración se pierde en la mía.
      if (ruido.causa === 'respiracion' && this.gracia > 0) return;
      // Durante el encuentro, CUALQUIER otro ruido suyo que me llegue lo delata.
      if (ruido.origen === 'jugador') {
        this.terminarEncuentro(ctx, 'fallido', entidad.distanciaAlJugador(ctx));
        entidad.cazar(ruido.causa, ctx, ruido.pared);
        return;
      }
      // Un ruido ajeno (la radio, el señuelo, una puerta) me distrae: voy hacia allá.
      this.encuentro = 0;
      entidad.enEncuentro = false;
      ctx.bus.emit('encuentro', { estado: 'superado', distancia: entidad.distanciaAlJugador(ctx) });
    }
    if (percibido >= CONFIG.entidad.umbralCaza && ruido.origen === 'jugador') {
      entidad.cazar(ruido.causa, ctx, ruido.pared);
      return;
    }
    // Un ruido nuevo reinicia la búsqueda hacia allá.
    this.busquedas = 0;
    this.escuchando = Math.min(this.escuchando, 0.4);
    entidad.irHacia(ruido.x, ruido.z, ctx);
  }
}
