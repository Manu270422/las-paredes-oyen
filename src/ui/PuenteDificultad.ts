// Aquí defino lo que la interfaz puede pedirle al juego sobre la dificultad (la pantalla para elegirla y
// Ajustes → Juego). La UI no conoce la partida: solo este contrato.
import type { IdDificultad } from '../config/Dificultad';

export interface PuenteDificultad {
  /** La dificultad de la partida en curso, o null si no hay (Ajustes solo se abre desde el menú o desde la pausa). */
  enCurso(): IdDificultad | null;
  /** La partida en curso no tiene guardado propio (Pesadilla, o recién bajada de ella): reintentar es empezar de cero. */
  enCursoSinGuardado(): boolean;
  /** La dificultad de la partida guardada, o null si no hay. */
  guardada(): IdDificultad | null;
  /** ¿Terminó algún piso? Desbloquea la dificultad que no guarda (Pesadilla). */
  pesadillaDesbloqueada(): boolean;
  /** La cambio en plena partida: se aplica al instante (bajar nunca se bloquea). */
  cambiarEnCurso(id: IdDificultad, motivo: 'ajustes' | 'oferta'): void;
  /** Tras 3 muertes seguidas sin avanzar: a cuál se ofrece bajar (un escalón), o null si no toca. */
  ofertaTrasMorir(): IdDificultad | null;
}
