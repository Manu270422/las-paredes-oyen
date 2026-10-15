// Aquí está la memoria de la criatura. Recuerda:
// - Su nivel de sospecha (sube al oír, baja con el silencio).
// - El último ruido interesante y cuándo fue.
// - La última posición conocida del jugador.
// - El RASTRO del jugador (para acecharlo siguiendo sus pasos).
// - En qué habitaciones pasa más tiempo el jugador: aprende sus hábitos
//   y, con el tiempo, revisa primero esos lugares.
// - QUÉ fue lo último que le oyó al jugador (sus pasos, su respiración...).
//   Ella no lo "entiende", pero yo lo uso para explicar la muerte con justicia.
// - Si un timbre del citófono la tiene ocupada (P1-guion, tanda 3): el timbre es un señuelo a distancia y, mientras
//   la ocupa, los ruidos débiles no la sacan de ahí. Si no, los pasos lejanos del jugador le "robaban" el timbre al
//   instante (medido con el robot de medirCerraduras: el citófono no alejaba a nadie).
import type { CausaRuido, Ruido } from '../nucleo/Eventos';

export interface Recuerdo {
  x: number;
  z: number;
  tiempo: number;
  fuerza: number;
  /** Qué fue, si se sabe (la puerta principal la llama: 'cerradura'). */
  causa?: CausaRuido | null;
  /** Fue el timbre del citófono (no el botón del jugador): la ocupa un rato. */
  timbre?: boolean;
}

/** Un timbre del citófono la ocupa este tiempo (s) desde que sonó por última vez. */
export const OCUPADA_POR_TIMBRE = 10;
/** Mientras la ocupa, solo la saca de ahí un ruido que le llegue al menos así de fuerte (o más que el timbre). */
export const SACA_DEL_TIMBRE = 0.15;

export class Memoria {
  sospecha = 0;
  ultimoRuido: Recuerdo | null = null;
  ultimaPosicionJugador: Recuerdo | null = null;
  ultimaCausaJugador: CausaRuido | null = null;
  /** Si ese último ruido lo hizo pegado a la pared. */
  ultimaCausaEnPared = false;
  readonly rastro: Array<{ x: number; z: number }> = [];
  private readonly habitos = new Map<string, number>();
  vecesEscuchado = 0;

  /** ¿El último ruido que oí cambió adónde voy? (false: un timbre me tenía ocupada y este era más débil.) */
  atendioUltimo = true;

  /**
   * Registro un ruido que alcancé a oír. Si lo hizo el jugador, recuerdo también dónde y qué fue. `ruido` dice qué
   * fue (sin él, no sé: un ruido que inventa un guion). Devuelve si ahora voy hacia este ruido.
   */
  registrarRuido(x: number, z: number, fuerza: number, tiempo: number, delJugador: Ruido | null, ruido?: Pick<Ruido, 'origen' | 'causa'>): boolean {
    const causa = ruido?.causa ?? delJugador?.causa ?? null;
    const timbre = ruido !== undefined && ruido.origen !== 'jugador' && ruido.causa === 'citofono';
    const actual = this.ultimoRuido;
    const ocupada =
      actual?.timbre === true && !timbre && tiempo - actual.tiempo < OCUPADA_POR_TIMBRE && fuerza < Math.max(actual.fuerza, SACA_DEL_TIMBRE);
    this.atendioUltimo = !ocupada;
    if (!ocupada) this.ultimoRuido = { x, z, tiempo, fuerza, causa, timbre };
    if (delJugador) {
      this.ultimaPosicionJugador = { x, z, tiempo, fuerza };
      this.ultimaCausaJugador = delJugador.causa;
      this.ultimaCausaEnPared = delJugador.pared ?? false;
    }
    this.sospecha = Math.min(1.2, this.sospecha + fuerza * 2.2);
    this.vecesEscuchado++;
    return !ocupada;
  }

  /** Guardo migas de pan del jugador cada metro (máximo 40). */
  registrarRastro(x: number, z: number): void {
    const ultimo = this.rastro[this.rastro.length - 1];
    if (ultimo && Math.hypot(ultimo.x - x, ultimo.z - z) < 1) return;
    this.rastro.push({ x, z });
    if (this.rastro.length > 40) this.rastro.shift();
  }

  registrarHabito(habitacion: string, dt: number): void {
    this.habitos.set(habitacion, (this.habitos.get(habitacion) ?? 0) + dt);
  }

  /** La habitación donde el jugador pasa más tiempo (donde "se siente seguro"). */
  habitacionFavorita(): string | null {
    let mejor: string | null = null;
    let tiempo = 0;
    for (const [h, t] of this.habitos) {
      if (t > tiempo) {
        tiempo = t;
        mejor = h;
      }
    }
    return mejor;
  }

  decaer(dt: number): void {
    this.sospecha = Math.max(0, this.sospecha - dt * 0.05);
  }

  reiniciar(): void {
    this.sospecha = 0;
    this.ultimoRuido = null;
    this.atendioUltimo = true;
    this.ultimaPosicionJugador = null;
    this.ultimaCausaJugador = null;
    this.ultimaCausaEnPared = false;
    this.rastro.length = 0;
  }
}
