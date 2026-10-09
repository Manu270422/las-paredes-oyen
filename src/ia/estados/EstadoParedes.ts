// Estado "EN LAS PAREDES": sin cuerpo, se desliza por dentro de los muros.
// - Va hacia el último ruido que oyó; si no hay, deriva hacia el jugador
//   (cuando el director lo permite) o merodea.
// - Deja pistas: rasguños y golpes que salen de la pared más cercana a ella.
//   Escuchando con atención, el jugador puede rastrearla.
// - Si la sospecha es alta y la historia lo permite, sale por un punto oculto.
// - MIENTRAS MIDO, me escucha escuchar: se desliza por los muros hacia mí y
//   los rasguños se acercan... hasta que paran. El silencio significa que
//   llegó, que está al otro lado del muro. Medir nunca es seguro.
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Ruido } from '../../nucleo/Eventos';
import type { Entidad } from '../Entidad';
import type { EstadoIA } from '../TiposIA';
import { aleatorio, distancia2D } from '../../utilidades/Matematicas';

/** Distancia (m) a la que dejo de rascar mientras el jugador mide: ya llegué, solo escucho. */
const DISTANCIA_LLEGADA_MEDICION = 2.6;
/** Salgo del muro al menos a esta distancia del jugador: que alcance a oír cómo me desprendo. */
const DISTANCIA_SALIDA = 5;
/**
 * Al salir me quedo quieta escuchando antes de caminar. Es el aviso ("salió")
 * y es aire: si el jugador acaba de jadear, sin esta pausa llegaba al
 * encuentro con 58 % de aire, que no alcanza para uno de cada tres encuentros.
 */
const PAUSA_SALIDA = 1.5;
/**
 * Mientras mide, llego a escuchar en este tiempo (s) desde donde esté: la medición dura 6 s y a la velocidad
 * normal (1.6 m/s) desde 20 m no llegaba nunca (ronda 1: en 3 de 4 partidas medir no tuvo nada). Así los
 * rasguños se acercan y paran ANTES de que termine. Dentro del muro nadie me ve correr.
 */
const LLEGADA_MEDICION = 4;
/** Tope de esa prisa (m/s): desde la otra punta del piso se oye venir más rápido, pero no aparece de golpe. */
const VELOCIDAD_MAXIMA_MEDICION = 7;

export class EstadoParedes implements EstadoIA {
  readonly nombre = 'paredes' as const;
  private temporizadorPista = 8;
  private deriva: { x: number; z: number } | null = null;
  private atraidaAntes = false;
  /** La velocidad de esta medición: se fija al empezar (recalcularla cada fotograma la frenaba y nunca llegaba). */
  private velocidadMedicion = 0;

  entrar(entidad: Entidad): void {
    entidad.desvanecer();
    entidad.pose = 'quieto';
    this.temporizadorPista = aleatorio(6, 12);
    this.deriva = null;
    this.atraidaAntes = false;
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    const memoria = entidad.memoria;
    const j = ctx.jugador.posicion;
    const ahora = ctx.programador.ahora;
    const ruidoReciente = memoria.ultimoRuido && ahora - memoria.ultimoRuido.tiempo < 25 ? memoria.ultimoRuido : null;
    // Después del 401 ya está despierta: la medición la atrae (lo escucha escuchar).
    const atraidaPorMedicion = ctx.grabadora.midiendo !== null && entidad.puedeManifestarse;
    // La medición dura 6 s: el primer rasguño no puede esperar al temporizador normal (6-12 s).
    if (atraidaPorMedicion && !this.atraidaAntes) {
      this.temporizadorPista = Math.min(this.temporizadorPista, aleatorio(0.8, 1.8));
      const falta = entidad.distanciaAlJugador(ctx) - DISTANCIA_LLEGADA_MEDICION;
      this.velocidadMedicion = Math.min(VELOCIDAD_MAXIMA_MEDICION, Math.max(CONFIG.entidad.velocidadParedes, falta / LLEGADA_MEDICION));
    }
    this.atraidaAntes = atraidaPorMedicion;

    // ¿Hacia dónde me deslizo?
    let objetivo: { x: number; z: number };
    if (ruidoReciente) {
      objetivo = ruidoReciente;
    } else if (atraidaPorMedicion || ctx.director.permiteAcercarse) {
      objetivo = { x: j.x, z: j.z };
    } else {
      if (!this.deriva || distancia2D(entidad.posicion.x, entidad.posicion.z, this.deriva.x, this.deriva.z) < 1) {
        this.deriva = { x: j.x + aleatorio(-14, 14), z: j.z + aleatorio(-10, 10) };
      }
      objetivo = this.deriva;
    }
    const velocidad = atraidaPorMedicion ? this.velocidadMedicion : CONFIG.entidad.velocidadParedes * (ruidoReciente ? 1 : 0.5);
    entidad.deslizarHacia(objetivo.x, objetivo.z, velocidad, dt);

    // Pistas sonoras de dónde estoy (solo si estoy cerca del jugador).
    const distancia = entidad.distanciaAlJugador(ctx);
    this.temporizadorPista -= dt;
    if (atraidaPorMedicion && distancia < 14) {
      // Rasguños cada vez más cerca mientras mido. Cuando llego, silencio: estoy escuchando.
      if (distancia > DISTANCIA_LLEGADA_MEDICION && this.temporizadorPista <= 0) {
        this.temporizadorPista = aleatorio(2.2, 3.6);
        entidad.sonarEnPared('rasguno', ctx, 0.55, 'algo se arrastra dentro del muro, acercándose');
      } else if (distancia <= DISTANCIA_LLEGADA_MEDICION) {
        this.temporizadorPista = Math.max(this.temporizadorPista, 4);
      }
    } else if (this.temporizadorPista <= 0 && distancia < 14 && ctx.director.permitePresencia) {
      this.temporizadorPista = aleatorio(7, 16);
      if (Math.random() < 0.6) entidad.sonarEnPared('rasguno', ctx, 0.5, 'algo rasca dentro de la pared');
      else entidad.sonarEnPared('golpe', ctx, 0.6, 'un golpe en la pared');
    }

    // ¿Salgo? Solo si la historia lo permite y no hay otro evento en curso.
    if (!entidad.puedeManifestarse) return;
    const cercaDelObjetivo = distancia2D(entidad.posicion.x, entidad.posicion.z, objetivo.x, objetivo.z) < 3;
    if (entidad.solicitudAcecho && distancia < 14) {
      // El director quiere presión: salgo detrás del jugador, fuera de su vista.
      const atras = { x: j.x + Math.sin(ctx.jugador.yaw) * 7, z: j.z + Math.cos(ctx.jugador.yaw) * 7 };
      const salida = entidad.buscarPuntoSalida(atras.x, atras.z, ctx, 5, 5);
      if (salida) {
        entidad.solicitudAcecho = false;
        entidad.manifestar(salida.x, salida.z, ctx);
        entidad.cambiarEstado('acechando', ctx);
      }
      return;
    }
    if (memoria.sospecha >= 0.75 && ruidoReciente && cercaDelObjetivo && ctx.director.permiteManifestacion) {
      const salida = entidad.buscarPuntoSalida(ruidoReciente.x, ruidoReciente.z, ctx, DISTANCIA_SALIDA, 6);
      if (salida) {
        entidad.manifestar(salida.x, salida.z, ctx);
        entidad.pausaSalida = PAUSA_SALIDA;
        // NUNCA salgo cazando: salgo a BUSCAR. Antes, con sospecha alta salía a
        // 3.5 m ya cazando y mataba en 1.3 s: el jugador no tenía ninguna
        // oportunidad. Ahora camino hacia el ruido y, si el jugador está quieto,
        // llega el encuentro. Si sigue haciendo ruido, la caza nace de ahí.
        entidad.cambiarEstado('investigando', ctx);
      }
    }
  }

  alOir(entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    // Un ruido fuerte me hace responder desde la pared: tres golpes. "Te oí."
    if (percibido > 0.2 && ruido.origen === 'jugador' && Math.random() < 0.35 && ctx.director.permitePresencia) {
      ctx.programador.secuencia(
        [
          [0.6, () => entidad.sonarEnPared('golpe', ctx, 0.7, 'tres golpes en la pared')],
          [0.95, () => entidad.sonarEnPared('golpe', ctx, 0.7, '')],
          [1.3, () => entidad.sonarEnPared('golpe', ctx, 0.7, '')],
        ],
        'entidad',
      );
    }
  }
}
