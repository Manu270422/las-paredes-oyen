// Aquí está el clímax del Piso 2 (P2-guion, momento 7): bajando al 1, la cabina frena de golpe entre pisos. Algo cae
// sobre el techo, se arrastra encima y se queda escuchando. Quieto y sin aire: si aguanto, se va trepando por el pozo
// y la cabina sigue; si me oye, revienta la trampilla y cae adentro, con el aviso de caza de siempre.
//
// Las reglas del encuentro son las del resto del juego (ia/EncuentroSinCuerpo: se arrastra, se queda quieta, gracia,
// duración según la dificultad, y no escucha hasta que tengo el aire). Aquí está lo que se oye, lo que se lee y el
// orden. La luz de la cabina parpadea todo el rato que está encima: es la señal de siempre ("está cerca").
// Pasa una sola vez: superarla marca CABINA_SUPERADA. Morir aquí devuelve al 202 con la llave en el bolsillo (el punto
// de control de la llave) y, al volver a bajar, pasa otra vez.
import { EncuentroSinCuerpo, type ResultadoEncuentro } from '../../ia/EncuentroSinCuerpo';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { CausaRuido } from '../../nucleo/Eventos';
import { aleatorio } from '../../utilidades/Matematicas';
import { PARADA_AL_1 } from '../paradasAscensor';

/** Ya pasó: aguanté y se fue. No se repite (la cabina sigue hasta abajo). */
export const CABINA_SUPERADA = 'cabina:superada';
/** A qué parte del viaje frena la cabina (0 al partir, 1 al llegar): pasada la mitad, cuando ya no hay vuelta. */
export const AVANCE_PARA_FRENAR = 0.55;
/** Segundos entre el frenazo y el golpe en el techo. */
const GOLPE_EN_EL_TECHO = 0.9;
/** A qué altura suena lo de encima (el techo de la cabina), en metros. */
const ALTURA_TECHO = 2.55;
/** Cada cuánto (s) rasca mientras se arrastra. */
const RASGUNO_CADA: readonly [number, number] = [0.8, 1.5];
/** Cada cuánto (s) titila la luz mientras está encima. */
const LUZ_CADA = 0.3;
/** Segundos desde que se va hasta que la cabina sigue bajando. */
const SIGUE_TRAS_IRSE = 1.8;
/** La lámpara de la cabina (en el mapa del Piso 2). */
const LUZ_CABINA = 'luzAscensor';

/** Lo que se lee. BORRADOR (2026-10-14): lo revisa el creador. */
export const TEXTOS_CABINA = {
  frenazo: '[La cabina frena de golpe entre dos pisos]',
  golpe: 'algo cae sobre el techo de la cabina',
  arrastra: 'algo se arrastra sobre el techo',
  escucha: 'algo se detiene encima de ti y escucha',
  seVa: '[Se va trepando por el pozo, hacia arriba]',
  trampilla: '[La trampilla del techo revienta]',
  pista: 'Está encima de ti. Cuando se quede quieta escuchando, no te muevas y aguanta el aire ({aguantar}).',
} as const;

export class CabinaDetenida {
  private encuentro: EncuentroSinCuerpo | null = null;
  /** Ya frené en este intento (hasta que muera o cargue). */
  private activa = false;
  private hastaRasguno = 0;
  private hastaLuz = 0;
  private rascoAntes = false;

  /** Al cargar, al morir o al salir del piso: nada queda escuchando. */
  reiniciar(): void {
    this.encuentro?.detener();
    this.encuentro = null;
    this.activa = false;
    this.rascoAntes = false;
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    const ascensor = ctx.nivel.ascensor;
    if (!ascensor) return;
    if (!this.activa) {
      const bajandoAlUno = ascensor.viajandoHacia === PARADA_AL_1.hacia && ascensor.avanceViaje >= AVANCE_PARA_FRENAR;
      if (bajandoAlUno && !ctx.progreso.tiene(CABINA_SUPERADA)) this.frenar(ctx);
      return;
    }
    const e = this.encuentro;
    if (!e || e.fase === 'terminado') return;
    e.actualizar(dt, ctx);
    // Mientras está encima, la luz de la cabina titila: la señal de siempre.
    this.hastaLuz -= dt;
    if (this.hastaLuz <= 0) {
      this.hastaLuz = LUZ_CADA;
      ctx.nivel.lamparas.find((l) => l.id === LUZ_CABINA)?.interferir(0.4);
    }
    if (e.fase !== 'acercandose') return;
    this.hastaRasguno -= dt;
    if (this.hastaRasguno <= 0) {
      this.hastaRasguno = aleatorio(...RASGUNO_CADA);
      this.sonarEncima(ctx, 'rasguno', 0.7, aleatorio(-0.45, 0.45), this.rascoAntes ? '' : TEXTOS_CABINA.arrastra);
      this.rascoAntes = true;
    }
  }

  /** El frenazo: la cabina se detiene, ella deja de ser del director (es de este momento) y, enseguida, cae encima. */
  private frenar(ctx: ContextoJuego): void {
    const ascensor = ctx.nivel.ascensor;
    if (!ascensor?.detener(ctx)) return;
    this.activa = true;
    ctx.director.activo = false;
    ctx.director.bloquear(60);
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
    ctx.bus.emit('subtitulo', { texto: TEXTOS_CABINA.frenazo, duracion: 2.5, tipo: 'efecto' });
    ctx.programador.despues(GOLPE_EN_EL_TECHO, () => this.caeEncima(ctx));
  }

  /** Un golpe seco en el techo, justo encima: llegó. Empieza el encuentro (se arrastra, después escucha). */
  private caeEncima(ctx: ContextoJuego): void {
    const c = ctx.nivel.ascensor?.marco;
    if (!c) return;
    this.sonarEncima(ctx, 'golpe', 1, 0, TEXTOS_CABINA.golpe);
    ctx.jugador.efectos.agregarTrauma(0.35);
    ctx.jugador.sobresaltar(0.5);
    ctx.bus.emit('pista', { id: 'cabinaDetenida', texto: TEXTOS_CABINA.pista });
    this.hastaRasguno = 0.5;
    this.encuentro = new EncuentroSinCuerpo(
      { x: c.cx, z: c.cz },
      (r) => this.termino(r, ctx),
      () => {
        const p = { x: c.cx, y: ALTURA_TECHO, z: c.cz };
        ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: p, volumen: 0.5, tono: 0.78, distanciaReferencia: 0.9 });
        ctx.bus.emit('sonido-relevante', { descripcion: TEXTOS_CABINA.escucha, x: c.cx, z: c.cz });
      },
    );
    this.encuentro.empezar(ctx);
  }

  private termino(r: ResultadoEncuentro, ctx: ContextoJuego): void {
    if (r.superado) this.seVa(ctx);
    else this.caeAdentro(r.causa, r.pared, ctx);
  }

  /** Aguanté: trepa por el pozo, hacia arriba, y la cabina sigue bajando. */
  private seVa(ctx: ContextoJuego): void {
    ctx.progreso.marcar(CABINA_SUPERADA);
    this.sonarEncima(ctx, 'rasguno', 0.5, 0.3, '');
    ctx.programador.despues(0.7, () => this.sonarEncima(ctx, 'golpe', 0.45, 0, ''));
    ctx.bus.emit('subtitulo', { texto: TEXTOS_CABINA.seVa, duracion: 3, tipo: 'efecto' });
    ctx.programador.despues(SIGUE_TRAS_IRSE, () => ctx.nivel.ascensor?.reanudar(ctx));
  }

  /**
   * Me oyó: revienta la trampilla y cae adentro. La caza empieza con su aviso (mientras avisa no atrapa, aunque esté
   * encima: Entidad.avisando) y la muerte explica lo que me delató.
   */
  private caeAdentro(causa: CausaRuido, pared: boolean, ctx: ContextoJuego): void {
    const c = ctx.nivel.ascensor?.marco;
    if (!c) return;
    this.sonarEncima(ctx, 'golpe', 1, 0, '');
    ctx.bus.emit('subtitulo', { texto: TEXTOS_CABINA.trampilla, duracion: 2.5, tipo: 'efecto' });
    ctx.bus.emit('interferencia', { intensidad: 0.8, duracion: 0.6 });
    const e = ctx.entidad;
    e.puedeManifestarse = true;
    e.manifestar(c.cx, c.cz, ctx);
    e.caerDesde(ALTURA_TECHO - 0.3);
    e.cazar(causa, ctx, pared);
  }

  /** Un sonido sobre el techo de la cabina (corrido `desplazamiento` metros), con su subtítulo si hay. */
  private sonarEncima(ctx: ContextoJuego, id: 'golpe' | 'rasguno', volumen: number, desplazamiento: number, descripcion: string): void {
    const c = ctx.nivel.ascensor?.marco;
    if (!c) return;
    const x = c.cx + desplazamiento;
    const z = c.cz + desplazamiento * 0.6;
    ctx.audio.reproducir(id, { bus: 'entidad', posicion: { x, y: ALTURA_TECHO, z }, volumen, tono: id === 'golpe' ? 0.7 : 1 });
    if (descripcion) ctx.bus.emit('sonido-relevante', { descripcion, x, z });
  }
}
