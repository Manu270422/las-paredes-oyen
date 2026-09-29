// Aquí defino cómo es un "evento de terror" que el director puede lanzar.
// Cada evento declara CUÁNDO tiene sentido (fase, requisitos, condiciones)
// y QUÉ hace. El director elige entre los válidos con pesos y novedad.
import type { ContextoJuego } from '../nucleo/ContextoJuego';

/**
 * El ritmo del miedo, inspirado en el ciclo de tensión clásico:
 * calma → acumulación → pico → relajación (falsa) → calma...
 */
export type FaseDirector = 'calma' | 'acumulacion' | 'pico' | 'relajacion';

/**
 * Cómo juega esta persona (lo mide PerfilJugador, 0..1 cada uno):
 * - pared: camina pegada a los muros (justo lo que el juego castiga).
 * - corre: se mueve corriendo.
 * - acampa: se queda mucho tiempo en el mismo cuarto ("aquí estoy a salvo").
 * - escucha: usa mucho el modo escuchar.
 */
export type RasgoJugador = 'pared' | 'corre' | 'acampa' | 'escucha';

/** Dónde ocurrió un evento (si ocurrió en un lugar concreto). Lo uso para medir si el jugador lo percibió. */
export interface PuntoEvento {
  x: number;
  z: number;
}

export interface EventoTerror {
  id: string;
  fases: readonly FaseDirector[];
  /** 1 = sutil (un sonido), 2 = inquietante (algo cambió), 3 = fuerte (lo vi). */
  intensidad: 1 | 2 | 3;
  peso: number;
  /** Segundos mínimos antes de repetirlo. */
  enfriamiento: number;
  maxUsos?: number;
  /** Segundos que el director espera antes de otro evento. */
  duracion?: number;
  /** Banderas de progreso necesarias. */
  requiere?: readonly string[];
  /**
   * A qué forma de jugar le "responde" este evento. El peso se multiplica por
   * 1 + Σ(afinidad × rasgo): si alguien se pega a las paredes, las paredes contestan.
   */
  afinidad?: Partial<Record<RasgoJugador, number>>;
  puedeOcurrir(ctx: ContextoJuego): boolean;
  /** Ejecuto el evento. Si ocurrió en un punto concreto, lo devuelvo. */
  ejecutar(ctx: ContextoJuego): PuntoEvento | void;
}
