// Aquí el director aprende CÓMO juega esta persona, con las mismas señales
// que mide la telemetría (pero siempre activo y sin guardar nada):
// ¿se pega a las paredes? ¿corre? ¿se atrinchera en un cuarto? ¿escucha mucho?
//
// Cada rasgo es un promedio móvil (0..1) de los últimos ~45 s: refleja lo que
// hace AHORA, no lo que hizo hace diez minutos. Si cambia de estilo, el
// director cambia con él. No es un castigo: es el edificio respondiendo.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { RasgoJugador } from './TiposDirector';
import { CONFIG } from '../config/ConfiguracionJuego';
import { limitar } from '../utilidades/Matematicas';

/** Constante de tiempo del promedio móvil (segundos). */
const MEMORIA = 45;
const CADA_MUESTRA = 0.25;
/** Segundos en el mismo cuarto a partir de los que empiezo a contar "acampar". */
const ACAMPAR_DESDE = 30;
const ACAMPAR_LLENO = 90;
/** Un rasgo por encima de esto lo considero "su estilo". */
const UMBRAL_DOMINANTE = 0.45;

export const RASGOS: readonly RasgoJugador[] = ['pared', 'corre', 'acampa', 'escucha'];

export class PerfilJugador {
  readonly rasgos: Record<RasgoJugador, number> = { pared: 0, corre: 0, acampa: 0, escucha: 0 };
  private muestreo = 0;
  private habitacion: string | null = null;
  private tiempoHabitacion = 0;

  /** El rasgo más marcado ahora mismo (o null si no juega de ninguna forma extrema). */
  get dominante(): RasgoJugador | null {
    let mejor: RasgoJugador | null = null;
    let valor = UMBRAL_DOMINANTE;
    for (const r of RASGOS) {
      if (this.rasgos[r] > valor) {
        valor = this.rasgos[r];
        mejor = r;
      }
    }
    return mejor;
  }

  /** Multiplicador de peso para un evento según su afinidad con mi forma de jugar. */
  multiplicador(afinidad: Partial<Record<RasgoJugador, number>> | undefined): number {
    if (!afinidad) return 1;
    let suma = 0;
    for (const r of RASGOS) suma += (afinidad[r] ?? 0) * this.rasgos[r];
    return 1 + suma;
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    const j = ctx.jugador;
    const actual = ctx.memoria.habitacionActual;
    if (actual !== this.habitacion) {
      this.habitacion = actual;
      this.tiempoHabitacion = 0;
    }
    // El pasillo no es un refugio: ahí no cuento "acampar".
    if (actual !== 'pasillo') this.tiempoHabitacion += dt;

    this.muestreo += dt;
    if (this.muestreo < CADA_MUESTRA) return;
    const paso = this.muestreo;
    this.muestreo = 0;
    const k = 1 - Math.exp(-paso / MEMORIA);

    // Pared y carrera solo se miden mientras se mueve: estar quieto no es "correr poco".
    if (j.rapidez > 0.3) {
      const pegado = ctx.nivel.rejilla.distanciaAPared(j.posicion.x, j.posicion.z) < CONFIG.ruido.distanciaPared;
      this.acercar('pared', pegado ? 1 : 0, k);
      this.acercar('corre', j.corriendo ? 1 : 0, k);
    }
    this.acercar('escucha', j.escuchando ? 1 : 0, k);
    // Acampar sube más rápido que el resto: el tiempo en el cuarto ya es una memoria.
    this.rasgos.acampa = limitar((this.tiempoHabitacion - ACAMPAR_DESDE) / (ACAMPAR_LLENO - ACAMPAR_DESDE), 0, 1);
  }

  /** Una partida nueva es otra persona (o la misma, empezando de cero). */
  olvidar(): void {
    for (const r of RASGOS) this.rasgos[r] = 0;
    this.habitacion = null;
    this.tiempoHabitacion = 0;
    this.muestreo = 0;
  }

  private acercar(rasgo: RasgoJugador, muestra: number, k: number): void {
    this.rasgos[rasgo] += (muestra - this.rasgos[rasgo]) * k;
  }
}
