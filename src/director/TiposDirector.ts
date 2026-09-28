// Aquí defino cómo es un "evento de terror" que el director puede lanzar.
// Cada evento declara CUÁNDO tiene sentido (fase, requisitos, condiciones)
// y QUÉ hace. El director elige entre los válidos con pesos y novedad.
import type { ContextoJuego } from '../nucleo/ContextoJuego';

/**
 * El ritmo del miedo, inspirado en el ciclo de tensión clásico:
 * calma → acumulación → pico → relajación (falsa) → calma...
 */
export type FaseDirector = 'calma' | 'acumulacion' | 'pico' | 'relajacion';

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
  puedeOcurrir(ctx: ContextoJuego): boolean;
  /** Ejecuto el evento. Si ocurrió en un punto concreto, lo devuelvo. */
  ejecutar(ctx: ContextoJuego): PuntoEvento | void;
}
