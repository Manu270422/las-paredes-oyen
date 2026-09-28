// Aquí mido si el jugador REACCIONÓ a algo: en los segundos siguientes, ¿giró
// la cabeza de golpe? ¿se congeló? ¿se puso a escuchar? ¿contuvo el aire?
// Es mi mejor aproximación desde dentro del juego a "¿esto le dio miedo?".
// No reemplaza mirarle la cara al probador, pero me dice qué sustos pasan
// desapercibidos y cuáles lo paralizan.
import type { Jugador } from '../jugador/Jugador';
import { normalizarAngulo } from '../utilidades/Matematicas';

/** Segundos que observo después del estímulo. */
const VENTANA = 3;
/** Un giro de cabeza de más de esto (grados) cuenta como reacción fuerte. */
const GIRO_FUERTE = 75;
/** Si venía caminando y se detuvo antes de esto (s), se "congeló". */
const TIEMPO_CONGELARSE = 1.5;

export interface ResultadoReaccion {
  /** Mayor giro de cabeza en grados. */
  giro: number;
  seDetuvo: boolean;
  escucho: boolean;
  aguanto: boolean;
  fuerte: boolean;
}

export class ReaccionPendiente {
  private transcurrido = 0;
  private giroMaximo = 0;
  private seDetuvo = false;
  private escucho = false;
  private aguanto = false;
  private readonly yawInicial: number;
  private readonly veniaMoviendose: boolean;

  constructor(
    readonly estimulo: string,
    jugador: Jugador,
  ) {
    this.yawInicial = jugador.yaw;
    this.veniaMoviendose = jugador.rapidez > 0.3;
  }

  /** Avanzo la observación. Cuando termina la ventana, devuelvo el resultado. */
  actualizar(dt: number, jugador: Jugador): ResultadoReaccion | null {
    this.transcurrido += dt;
    const giro = Math.abs(normalizarAngulo(jugador.yaw - this.yawInicial)) * (180 / Math.PI);
    this.giroMaximo = Math.max(this.giroMaximo, giro);
    if (this.veniaMoviendose && jugador.rapidez < 0.1 && this.transcurrido < TIEMPO_CONGELARSE) this.seDetuvo = true;
    if (jugador.escuchando) this.escucho = true;
    if (jugador.respiracion.aguantando) this.aguanto = true;
    if (this.transcurrido < VENTANA) return null;
    return {
      giro: Math.round(this.giroMaximo),
      seDetuvo: this.seDetuvo,
      escucho: this.escucho,
      aguanto: this.aguanto,
      fuerte: this.giroMaximo >= GIRO_FUERTE || this.seDetuvo || this.aguanto,
    };
  }
}
