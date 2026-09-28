// Aquí está la memoria de la criatura. Recuerda:
// - Su nivel de sospecha (sube al oír, baja con el silencio).
// - El último ruido interesante y cuándo fue.
// - La última posición conocida del jugador.
// - El RASTRO del jugador (para acecharlo siguiendo sus pasos).
// - En qué habitaciones pasa más tiempo el jugador: aprende sus hábitos
//   y, con el tiempo, revisa primero esos lugares.
// - QUÉ fue lo último que le oyó al jugador (sus pasos, su respiración...).
//   Ella no lo "entiende", pero yo lo uso para explicar la muerte con justicia.
import type { CausaRuido, Ruido } from '../nucleo/Eventos';

export interface Recuerdo {
  x: number;
  z: number;
  tiempo: number;
  fuerza: number;
}

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

  /** Registro un ruido que alcancé a oír. Si lo hizo el jugador, recuerdo también dónde y qué fue. */
  registrarRuido(x: number, z: number, fuerza: number, tiempo: number, delJugador: Ruido | null): void {
    this.ultimoRuido = { x, z, tiempo, fuerza };
    if (delJugador) {
      this.ultimaPosicionJugador = { x, z, tiempo, fuerza };
      this.ultimaCausaJugador = delJugador.causa;
      this.ultimaCausaEnPared = delJugador.pared ?? false;
    }
    this.sospecha = Math.min(1.2, this.sospecha + fuerza * 2.2);
    this.vecesEscuchado++;
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
      if (t > tiempo && h !== 'pasillo') {
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
    this.ultimaPosicionJugador = null;
    this.ultimaCausaJugador = null;
    this.ultimaCausaEnPared = false;
    this.rastro.length = 0;
  }
}
