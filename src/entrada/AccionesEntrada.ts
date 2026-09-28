// Aquí defino las ACCIONES del juego, independientes del dispositivo.
// El jugador no "pulsa la W": el jugador "se mueve hacia adelante".
// Así teclado, mando y pantalla táctil alimentan exactamente lo mismo.

export interface EstadoEntrada {
  /** Movimiento lateral (-1 izquierda, 1 derecha). */
  moverX: number;
  /** Movimiento frontal (1 adelante, -1 atrás). */
  moverY: number;
  /** Giro horizontal en radianes durante este fotograma. */
  mirarX: number;
  /** Giro vertical en radianes durante este fotograma. */
  mirarY: number;
  correr: boolean;
  /** true solo en el fotograma en que se pulsa (alterna agachado). */
  agacharse: boolean;
  /** Se mantiene mientras el botón está presionado. */
  aguantar: boolean;
  escuchar: boolean;
  interactuar: boolean;
  linterna: boolean;
  senuelo: boolean;
  pausa: boolean;
}

export type ModoEntrada = 'teclado' | 'tactil' | 'mando';

export function crearEstadoVacio(): EstadoEntrada {
  return {
    moverX: 0,
    moverY: 0,
    mirarX: 0,
    mirarY: 0,
    correr: false,
    agacharse: false,
    aguantar: false,
    escuchar: false,
    interactuar: false,
    linterna: false,
    senuelo: false,
    pausa: false,
  };
}

/** Reinicio el estado al comenzar cada fotograma. */
export function limpiarEstado(estado: EstadoEntrada): void {
  Object.assign(estado, crearEstadoVacio());
}
