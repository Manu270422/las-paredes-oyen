// Aquí está un encuentro de presencia SIN su cuerpo a la vista: ella escucha desde un lugar fijo donde no la veo (el
// techo de la cabina detenida del Piso 2). Son las MISMAS reglas que el encuentro de EstadoInvestigando, para que lo
// aprendido en el resto del edificio valga aquí:
// 1. Primero se acerca (se arrastra, rasca). Su propio ruido tapa mi respiración, también si jadeo; solo me delata
//    algo fuerte, lo que en cualquier otro lado ya basta para cazar (caminar, correr, una puerta: umbralCaza).
// 2. Cuando se queda quieta a escuchar, empieza el encuentro: la gracia (su inhalación tapa mi respiración) y después,
//    lo que dure según la dificultad, CUALQUIER ruido mío que le llegue me delata.
// 3. La justicia del aire: no se pone a escuchar mientras estoy aguantando ni con el aire a medias. Con miedo máximo el
//    aire alcanza para el encuentro más largo por 0.35 s (Respiracion), así que si me adelanté a aguantar, sigue
//    rascando hasta que lo suelte y lo recupere. Con un tope, para que no se eternice.
// Yo solo escucho y aviso cómo terminó (superado o fallido, con lo que me delató). Qué suena, qué se ve y qué pasa
// después lo decide quien me usa (el guion).
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { CausaRuido, Ruido } from '../nucleo/Eventos';
import { aleatorio } from '../utilidades/Matematicas';
import { Percepcion } from './Percepcion';

/** Lo menos (s) que se arrastra antes de quedarse a escuchar: lo justo para entender que está encima. */
export const ACERCARSE_MINIMO = 2;
/** Lo más (s) que se arrastra esperando que yo tenga el aire: después escucha igual. */
export const ACERCARSE_MAXIMO = 9;
/** El aire que necesito para que se ponga a escuchar (de 0 a 1): casi lleno. */
export const AIRE_PARA_ESCUCHAR = 0.95;

/** Cómo terminó: lo superé (no oyó nada) o me oyó, con lo que me delató. */
export type ResultadoEncuentro = { readonly superado: true } | { readonly superado: false; readonly causa: CausaRuido; readonly pared: boolean };

export type FaseEncuentro = 'acercandose' | 'escuchando' | 'terminado';

export class EncuentroSinCuerpo {
  fase: FaseEncuentro = 'acercandose';
  private tiempo = 0;
  private duracion = 0;
  private gracia = 0;
  private cancelar: (() => void) | null = null;
  private readonly percepcion = new Percepcion();

  /**
   * `donde`: desde dónde escucha, en metros (sobre el piso del nivel). `alEscuchar`: se quedó quieta y empieza el
   * encuentro (para su inhalación y su subtítulo). `alTerminar`: cómo terminó, una sola vez.
   */
  constructor(
    private readonly donde: { readonly x: number; readonly z: number },
    private readonly alTerminar: (resultado: ResultadoEncuentro) => void,
    private readonly alEscuchar?: () => void,
  ) {}

  /** Empiezo a escuchar los ruidos (llega arrastrándose). */
  empezar(ctx: ContextoJuego): void {
    this.cancelar = ctx.bus.on('ruido', (ruido) => this.oir(ruido, ctx));
  }

  /** Dejo de escuchar sin avisar nada (al cargar una partida o salir del piso). */
  detener(): void {
    this.cancelar?.();
    this.cancelar = null;
    this.fase = 'terminado';
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.tiempo += dt;
    if (this.fase === 'acercandose') {
      const r = ctx.jugador.respiracion;
      const listo = !r.aguantando && r.aire >= AIRE_PARA_ESCUCHAR;
      if ((this.tiempo >= ACERCARSE_MINIMO && listo) || this.tiempo >= ACERCARSE_MAXIMO) this.escuchar(ctx);
      return;
    }
    if (this.fase !== 'escuchando') return;
    this.duracion -= dt;
    this.gracia -= dt;
    if (this.duracion <= 0) {
      ctx.bus.emit('encuentro', { estado: 'superado', distancia: this.distancia(ctx) });
      this.terminar({ superado: true });
    }
  }

  /** Se queda quieta encima, escuchando: la misma duración y la misma gracia que cualquier encuentro. */
  private escuchar(ctx: ContextoJuego): void {
    this.fase = 'escuchando';
    this.duracion = aleatorio(...ctx.dificultad.duracionEncuentro);
    this.gracia = ctx.dificultad.graciaEncuentro;
    ctx.bus.emit('encuentro', { estado: 'inicio', distancia: this.distancia(ctx) });
    ctx.jugador.sumarEstres(0.25);
    this.alEscuchar?.();
  }

  private oir(ruido: Ruido, ctx: ContextoJuego): void {
    if (ruido.origen !== 'jugador' || this.fase === 'terminado') return;
    const percibido = this.percepcion.percibir(ruido, this.donde.x, this.donde.z, false, ctx) * ctx.dificultad.oido;
    if (this.fase === 'acercandose') {
      // Mientras rasca, su ruido tapa mi respiración (aunque jadee): solo lo fuerte la hace bajar.
      if (ruido.causa === 'respiracion' || ruido.causa === 'jadeo') return;
      if (percibido >= CONFIG.entidad.umbralCaza) this.fallar(ruido, ctx);
      return;
    }
    // Escuchando: mientras inhala, mi respiración se pierde en la suya; cualquier otro ruido que le llegue me delata.
    if (ruido.causa === 'respiracion' && this.gracia > 0) return;
    if (percibido >= CONFIG.entidad.umbralAudicion) this.fallar(ruido, ctx);
  }

  private fallar(ruido: Ruido, ctx: ContextoJuego): void {
    ctx.bus.emit('encuentro', { estado: 'fallido', distancia: this.distancia(ctx) });
    this.terminar({ superado: false, causa: ruido.causa, pared: ruido.pared ?? false });
  }

  private terminar(resultado: ResultadoEncuentro): void {
    this.detener();
    this.alTerminar(resultado);
  }

  private distancia(ctx: ContextoJuego): number {
    const j = ctx.jugador.posicion;
    return Math.hypot(j.x - this.donde.x, j.z - this.donde.z);
  }
}
