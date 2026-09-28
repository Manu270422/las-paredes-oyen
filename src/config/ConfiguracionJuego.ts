// Aquí centralizo las constantes de diseño del juego.
// Si quiero que el jugador camine más lento o que la criatura oiga mejor,
// lo cambio aquí y no tengo que buscar números sueltos por el código.

export const CONFIG = {
  // --- Mundo ---
  /** Tamaño de cada celda del mapa en metros. 1.3 m hace pasillos estrechos y opresivos. */
  celda: 1.3,
  /** Altura del techo en metros (edificio viejo de techos altos). */
  alturaTecho: 2.7,
  /** Altura del vano de las puertas. */
  alturaPuerta: 2.1,
  /** Ancho libre de las puertas (el resto de la celda es muro). */
  anchoVano: 0.95,

  // --- Jugador ---
  alturaOjos: 1.62,
  alturaOjosAgachado: 1.0,
  radioJugador: 0.28,
  velocidadCaminar: 1.85,
  velocidadCorrer: 3.6,
  velocidadAgachado: 0.9,
  velocidadEscuchando: 0.6,
  /** Segundos de carrera antes de agotarme. */
  duracionEstamina: 6,
  /** Segundos que aguanto la respiración estando tranquilo. */
  duracionAire: 9,
  /** Metros que avanzo por cada paso (define el ritmo de los pasos). */
  longitudPaso: 0.72,
  distanciaInteraccion: 2.3,

  // --- Linterna ---
  /** Segundos de batería completa. */
  duracionBateria: 480,

  // --- Ruido (0..1): cuánto ruido hago con cada acción ---
  ruido: {
    pasoAgachado: 0.12,
    pasoCaminando: 0.38,
    pasoCorriendo: 0.9,
    /** Multiplicador si estoy pegado a una pared: la regla central del juego. */
    multiplicadorPared: 1.6,
    distanciaPared: 0.55,
    puertaNormal: 0.4,
    puertaLenta: 0.12,
    puertaCerrada: 0.3,
    clicLinterna: 0.1,
    zumbidoLinterna: 0.16,
    jadeo: 0.7,
    senuelo: 0.85,
  },

  // --- Criatura ---
  entidad: {
    velocidadParedes: 1.6,
    velocidadInvestigar: 1.15,
    velocidadAcechar: 1.25,
    velocidadCazar: 3.15,
    velocidadRetirada: 1.0,
    distanciaAtrapar: 0.85,
    /** Por debajo de este valor percibido ignoro el ruido. */
    umbralAudicion: 0.05,
    /** Ruido percibido a partir del cual empiezo a cazar. */
    umbralCaza: 0.3,
    /** Distancia a la que siento al jugador aunque no haga ruido (rompe su propia regla). */
    radioPresencia: 1.9,
    alturaModelo: 2.25,
  },
} as const;
