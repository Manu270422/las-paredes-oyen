// Aquí están las dificultades del juego. Por ahora solo sus NOMBRES y su orden: la tabla de valores de
// cada una (aviso antes de cazar, oído de la criatura, batería, puntos de control...) llega con la Tarea 4
// del Sprint 4. Mientras tanto, el juego de siempre es "normal", y el perfil ya guarda en cuál se superó
// cada piso.
export const DIFICULTADES = ['historia', 'normal', 'dificil', 'pesadilla'] as const;
export type IdDificultad = (typeof DIFICULTADES)[number];

/** La dificultad de hoy: el juego tal como era antes de que existieran dificultades. */
export const DIFICULTAD_POR_DEFECTO: IdDificultad = 'normal';

/** Cómo se llama cada una para el jugador. */
export const NOMBRE_DIFICULTAD: Readonly<Record<IdDificultad, string>> = {
  historia: 'Historia',
  normal: 'Normal',
  dificil: 'Difícil',
  pesadilla: 'Pesadilla',
};

export const esDificultad = (v: unknown): v is IdDificultad => typeof v === 'string' && (DIFICULTADES as readonly string[]).includes(v);

/** La más difícil de las dos (el orden es el de DIFICULTADES). */
export const masDificil = (a: IdDificultad, b: IdDificultad): IdDificultad => (DIFICULTADES.indexOf(a) >= DIFICULTADES.indexOf(b) ? a : b);
