// Estado "EN LAS PAREDES": sin cuerpo, se desliza por dentro de los muros.
// - Va hacia el último ruido que oyó; si no hay, deriva hacia el jugador
//   (cuando el director lo permite) o merodea.
// - Deja pistas: rasguños y golpes que salen de la pared más cercana a ella.
//   Escuchando con atención, el jugador puede rastrearla.
// - Si la sospecha es alta y la historia lo permite, sale por un punto oculto.
// - MIENTRAS MIDO, me escucha escuchar: se desliza por los muros hacia mí y
//   los rasguños se acercan... hasta que paran. El silencio significa que
//   llegó, que está al otro lado del muro. Medir nunca es seguro.
// - EL CUARTO SORDO (P2-guion): a través de los colchones no lo oigo, ni
//   siquiera escuchar (medir ahí no me atrae), y no salgo de un muro
//   acolchado. Pero no es refugio: si se queda mucho adentro, salgo AFUERA y
//   entro caminando por la puerta a buscarlo. Adentro solo me delatan las luces.
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
/**
 * Segundos seguidos del jugador en un cuarto acolchado antes de que salga a buscarlo caminando. No lo oigo, pero sé
 * dónde se esconde. Con menos, cruzar el 202 para grabar y buscar la llave sería una caza segura; con más, el cuarto
 * sordo sería el refugio que el juego evita (P2-guion, pregunta 2).
 */
export const ENTRA_A_BUSCAR = 25;
/** Hasta qué distancia del jugador busco por dónde salir, fuera de los cuartos acolchados (m). */
const RADIO_SALIDA_SORDO = 9;
/**
 * LA PUERTA PRINCIPAL (P1-guion, tanda 3): "la puerta la llama". Si lo último que oí fue una de sus cerraduras (causa
 * 'cerradura': solo existe en la salida del edificio), voy por los muros como cuando él mide: rápido (llego en estos
 * segundos desde donde esté) y haciéndome oír, para que sepa que voy. Medido con el robot: sin esto, abrir las tres
 * seguidas ganaba en 6 s, porque recién cargado el director no me deja salir y desde lejos no alcanzaba a llegar.
 */
export const LLEGADA_PUERTA = 3;
/** Cerca de la puerta salgo aunque el director no quiera (la salida del edificio es mía), así de cerca de él (m). */
export const DISTANCIA_SALIDA_PUERTA = 3.5;
/** Y escucho menos antes de caminar (s): ya sé dónde está. */
const PAUSA_SALIDA_PUERTA = 0.8;
/** Cada cuánto rasco mientras voy hacia la puerta (s). */
const RASGUNO_PUERTA = 0.8;

export class EstadoParedes implements EstadoIA {
  readonly nombre = 'paredes' as const;
  private temporizadorPista = 8;
  private deriva: { x: number; z: number } | null = null;
  private atraidaAntes = false;
  /** La velocidad de esta medición: se fija al empezar (recalcularla cada fotograma la frenaba y nunca llegaba). */
  private velocidadMedicion = 0;
  /** Segundos seguidos que el jugador lleva en un cuarto acolchado. */
  private enSordo = 0;
  /** La cerradura que me llamó (su momento) y la prisa que llevo hacia ella; y la última a la que ya salí. */
  private puertaOida = -1;
  private velocidadPuerta = 0;
  private puertaAtendida = -1;

  entrar(entidad: Entidad): void {
    entidad.desvanecer();
    entidad.pose = 'quieto';
    this.temporizadorPista = aleatorio(6, 12);
    this.deriva = null;
    this.atraidaAntes = false;
    this.enSordo = 0;
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    const memoria = entidad.memoria;
    const j = ctx.jugador.posicion;
    const ahora = ctx.programador.ahora;
    const ruidoReciente = memoria.ultimoRuido && ahora - memoria.ultimoRuido.tiempo < 25 ? memoria.ultimoRuido : null;
    // Después del 401 ya está despierta: la medición la atrae (lo escucha escuchar). A través de los colchones, no.
    const aislado = ctx.nivel.consultaAislamiento(j.x, j.z, entidad.posicion.x, entidad.posicion.z);
    const atraidaPorMedicion = ctx.grabadora.midiendo !== null && entidad.puedeManifestarse && !aislado;
    this.enSordo = ctx.nivel.acolchadoEn(j.x, j.z) ? this.enSordo + dt : 0;
    // La medición dura 6 s: el primer rasguño no puede esperar al temporizador normal (6-12 s).
    if (atraidaPorMedicion && !this.atraidaAntes) {
      this.temporizadorPista = Math.min(this.temporizadorPista, aleatorio(0.8, 1.8));
      const falta = entidad.distanciaAlJugador(ctx) - DISTANCIA_LLEGADA_MEDICION;
      this.velocidadMedicion = Math.min(VELOCIDAD_MAXIMA_MEDICION, Math.max(CONFIG.entidad.velocidadParedes, falta / LLEGADA_MEDICION));
    }
    this.atraidaAntes = atraidaPorMedicion;
    // ¿Me llama la puerta? Con cada cerradura nueva fijo la prisa (como al medir) y me hago oír desde donde estoy.
    const porLaPuerta = ruidoReciente !== null && ruidoReciente.causa === 'cerradura';
    if (porLaPuerta && ruidoReciente.tiempo !== this.puertaOida) {
      this.puertaOida = ruidoReciente.tiempo;
      const falta = distancia2D(entidad.posicion.x, entidad.posicion.z, ruidoReciente.x, ruidoReciente.z);
      this.velocidadPuerta = Math.min(VELOCIDAD_MAXIMA_MEDICION, Math.max(CONFIG.entidad.velocidadParedes, falta / LLEGADA_PUERTA));
      if (falta > 3) {
        entidad.sonarEnPared('friccion_muro', ctx, 0.8, 'algo corre por dentro del muro, hacia la puerta');
        this.temporizadorPista = RASGUNO_PUERTA;
      }
    }

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
    const velocidad = atraidaPorMedicion
      ? this.velocidadMedicion
      : porLaPuerta
        ? this.velocidadPuerta
        : CONFIG.entidad.velocidadParedes * (ruidoReciente ? 1 : 0.5);
    entidad.deslizarHacia(objetivo.x, objetivo.z, velocidad, dt);
    const cercaDelObjetivo = distancia2D(entidad.posicion.x, entidad.posicion.z, objetivo.x, objetivo.z) < 3;

    // Pistas sonoras de dónde estoy (solo si estoy cerca del jugador).
    const distancia = entidad.distanciaAlJugador(ctx);
    this.temporizadorPista -= dt;
    if (porLaPuerta && !cercaDelObjetivo) {
      // Voy hacia la puerta: rasguños seguidos, que se acercan.
      if (this.temporizadorPista <= 0) {
        this.temporizadorPista = RASGUNO_PUERTA;
        entidad.sonarEnPared('rasguno', ctx, 0.6, '');
      }
    } else if (atraidaPorMedicion && distancia < 14) {
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
    if (this.enSordo > ENTRA_A_BUSCAR && ctx.director.permiteManifestacion) {
      this.entrarCaminando(entidad, ctx);
      return;
    }
    // La puerta me llama: llegué junto a la cerradura y salgo, aunque el director no quiera. Una vez por cerradura:
    // si vuelvo al muro (la busqué y no la oí), no salgo otra vez por la misma, me quedo cerca vigilando.
    if (porLaPuerta && cercaDelObjetivo && ruidoReciente.tiempo !== this.puertaAtendida) {
      const salida = entidad.buscarPuntoSalida(objetivo.x, objetivo.z, ctx, DISTANCIA_SALIDA_PUERTA, 6);
      if (salida) {
        this.puertaAtendida = ruidoReciente.tiempo;
        entidad.manifestar(salida.x, salida.z, ctx);
        entidad.pausaSalida = PAUSA_SALIDA_PUERTA;
        ctx.bus.emit('sonido-relevante', { descripcion: 'algo se desprende del muro, cerca de la puerta', x: salida.x, z: salida.z });
        entidad.cambiarEstado('investigando', ctx);
        return;
      }
    }
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

  /**
   * El cuarto sordo no es refugio: salgo del muro afuera (nunca de un muro acolchado: buscarPuntoSalida los salta),
   * lo más cerca que pueda de él y fuera de su vista, y voy caminando al centro de su cuarto. No lo oigo desde afuera:
   * voy a donde sé que se esconde. Ya adentro, en el mismo cuarto, lo oigo normal (y llega el encuentro).
   */
  private entrarCaminando(entidad: Entidad, ctx: ContextoJuego): void {
    const j = ctx.jugador.posicion;
    const cuarto = ctx.nivel.habitacionEn(j.x, j.z);
    const salida = entidad.buscarPuntoSalida(j.x, j.z, ctx, DISTANCIA_SALIDA, RADIO_SALIDA_SORDO);
    if (!cuarto || !salida) return;
    this.enSordo = 0;
    const C = CONFIG.celda;
    entidad.manifestar(salida.x, salida.z, ctx);
    entidad.pausaSalida = PAUSA_SALIDA;
    entidad.cambiarEstado('investigando', ctx);
    entidad.irHacia(((cuarto.x0 + cuarto.x1) / 2 + 0.5) * C, ((cuarto.y0 + cuarto.y1) / 2 + 0.5) * C, ctx);
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
