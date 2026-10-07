// Aquí están las dificultades del juego: sus nombres y la TABLA de valores de cada una (como FIRMAS en
// ia/FirmaSonora.ts). El motor no pregunta "¿qué dificultad es?": lee su valor de ctx.dificultad.
//
// Reglas (docs/propuestas/T4-dificultad.md):
// - Normal es EXACTAMENTE el juego congelado para el Gate 1 (etiqueta gate1-congelado). Lo vigilan la foto de
//   pruebas/unitarias/dificultad.test.ts y el golden master del director (pruebas/recorridos/directorNormal.spec.ts).
// - Los demás valores son PROVISIONALES hasta el Gate 1: se afinan con datos de jugadores, no a ojo.
// - Ninguna dificultad baja del piso de justicia (aviso antes de cazar, encuentro sobrevivible...): lo prueba
//   la misma prueba unitaria.
// - Cada valor entró cuando el motor ya lo leía (pasos 1 a 3 de la Tarea 4).
// - La accesibilidad NO depende de la dificultad: Ajustes puede devolver lo que una dificultad quita.
import type { PaquetePiso } from '../pisos/TiposPiso';

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

/** Cómo afloja el director cuando alguien muere seguido sin avanzar (para que no se rinda). */
export interface ParametrosAlivio {
  /** Cuánto afloja por cada muerte seguida, a partir de la segunda (0.15 = 15 %). */
  readonly porMuerte: number;
  /** El alivio máximo: nunca vuelvo inofensivo al director. */
  readonly tope: number;
  /**
   * 'techo': baja la carga que acepta cada fase (caben menos sustos; con mucho alivio, ninguno fuerte).
   * 'intervalos': el techo no cambia, pero los eventos se espacian (siguen pasando cosas, con más aire).
   * En los dos, la calma y la relajación duran más.
   */
  readonly modo: 'techo' | 'intervalos';
}

/** Los valores de una dificultad. Cada uno dice dónde lo lee el motor. */
export interface ValoresDificultad {
  /** Segundos que tarda en lanzarse a cazar: se endereza, gira y jadea (ia/estados/EstadoCazando). */
  readonly avisoCaza: number;
  /** Multiplica el ruido que le llega a la criatura (ia/Entidad.oir). */
  readonly oido: number;
  /** Metros a los que te siente sin ruido si te mueves: rompe su propia regla (estados de la criatura). */
  readonly radioPresencia: number;
  /** Metros por segundo cuando caza (ia/estados/EstadoCazando). */
  readonly velocidadCaza: number;
  /** Cuánto dura el encuentro, en segundos (rango al azar) (ia/estados/EstadoInvestigando). */
  readonly duracionEncuentro: readonly [number, number];
  /** Segundos en que su inhalación tapa tu respiración al empezar el encuentro: la ventana para reaccionar. */
  readonly graciaEncuentro: number;
  /** Segundos de batería completa de la linterna (jugador/Linterna). */
  readonly bateria: number;
  /** Multiplica la carga que acepta cada fase del director (director/PresupuestoTension). */
  readonly presupuesto: number;
  /** Cómo afloja el director tras muertes seguidas (director/DirectorTerror.reiniciar). */
  readonly alivio: ParametrosAlivio;
  /**
   * Qué banderas crean un punto de control (nucleo/Juego, al marcarse una bandera):
   * 'todos' los del paquete; 'mayores' solo los de `puntosControlMayores` (medir un apartamento);
   * 'ninguno': la partida NO se guarda ni se borra (morir es empezar de cero) y la guardada de otra
   * dificultad queda intacta (guardado/SistemaGuardado.sinGuardado).
   */
  readonly puntosControl: 'todos' | 'mayores' | 'ninguno';
  /** Las pistas de tutorial del guion ("Pulsa F para…") (ui/hud/HUD). */
  readonly pistas: boolean;
  /** El indicador del aire al contener la respiración. Ajustes → Accesibilidad lo devuelve siempre (ui/hud). */
  readonly indicadorAire: boolean;
  /** La ayuda visual del aire (borde que late y aviso antes del jadeo). Ajustes → Accesibilidad la enciende en cualquiera. */
  readonly ayudaAire: boolean;
  /**
   * A cuál se OFRECE bajar tras 3 muertes seguidas sin avanzar (pantalla de muerte): un solo escalón, y nunca
   * se baja sola. null: no se ofrece (Historia ya es la más fácil; Pesadilla se eligió a conciencia).
   */
  readonly ofrecerBajarA: IdDificultad | null;
}

export const TABLA_DIFICULTAD: Readonly<Record<IdDificultad, ValoresDificultad>> = {
  // PROVISIONAL (Gate 1): más aviso, oye menos, encuentros más cortos, más batería; el alivio espacia los
  // eventos en vez de quitarlos.
  historia: {
    avisoCaza: 1.2,
    oido: 0.8,
    radioPresencia: 1.6,
    velocidadCaza: 2.9,
    duracionEncuentro: [2.4, 3.8],
    graciaEncuentro: 1.1,
    bateria: 720,
    presupuesto: 0.8,
    alivio: { porMuerte: 0.2, tope: 0.6, modo: 'intervalos' },
    puntosControl: 'todos',
    pistas: true,
    indicadorAire: true,
    ayudaAire: true,
    ofrecerBajarA: null,
  },
  // El juego de gate1-congelado, valor por valor. NO SE TOCA: cambiar Normal es cambiar el juego que se probó.
  normal: {
    avisoCaza: 0.8,
    oido: 1,
    radioPresencia: 1.9,
    velocidadCaza: 3.15,
    duracionEncuentro: [2.8, 4.6],
    graciaEncuentro: 0.9,
    bateria: 480,
    presupuesto: 1,
    alivio: { porMuerte: 0.15, tope: 0.45, modo: 'techo' },
    puntosControl: 'todos',
    pistas: true,
    indicadorAire: true,
    ayudaAire: false,
    ofrecerBajarA: 'historia',
  },
  // PROVISIONAL (Gate 1). El encuentro NO se alarga: Normal ya está a 0.35 s del aire con miedo máximo.
  dificil: {
    avisoCaza: 0.65,
    oido: 1.15,
    radioPresencia: 2.0,
    velocidadCaza: 3.3,
    duracionEncuentro: [2.8, 4.6],
    graciaEncuentro: 0.75,
    bateria: 380,
    presupuesto: 1.15,
    alivio: { porMuerte: 0.1, tope: 0.3, modo: 'techo' },
    puntosControl: 'mayores',
    pistas: false,
    indicadorAire: false,
    ayudaAire: false,
    ofrecerBajarA: 'normal',
  },
  // PROVISIONAL (Gate 1). Justo en el piso de justicia, nunca por debajo.
  pesadilla: {
    avisoCaza: 0.5,
    oido: 1.25,
    radioPresencia: 2.1,
    velocidadCaza: 3.4,
    duracionEncuentro: [2.8, 4.6],
    graciaEncuentro: 0.6,
    bateria: 320,
    presupuesto: 1.3,
    alivio: { porMuerte: 0, tope: 0, modo: 'techo' },
    puntosControl: 'ninguno',
    pistas: false,
    indicadorAire: false,
    ayudaAire: false,
    ofrecerBajarA: null,
  },
};

/** El punto de control que crea esa bandera en esta dificultad, o undefined si aquí no crea ninguno. */
export function puntoDeControlDe(piso: PaquetePiso, valores: ValoresDificultad, bandera: string): string | undefined {
  const punto = piso.puntosControl[bandera];
  if (!punto || valores.puntosControl === 'ninguno') return undefined;
  if (valores.puntosControl === 'mayores' && !piso.puntosControlMayores?.includes(bandera)) return undefined;
  return punto;
}

/**
 * ¿Llegar a otro piso guarda la partida? Sí, salvo donde no hay puntos de control (Pesadilla): bajar una
 * escalera es el hito más grande que hay, así que en Difícil (solo los mayores) también cuenta.
 */
export function guardaAlLlegarAOtroPiso(valores: ValoresDificultad): boolean {
  return valores.puntosControl !== 'ninguno';
}

/** La más fácil de las dos (el orden es el de DIFICULTADES). */
export const masFacil = (a: IdDificultad, b: IdDificultad): IdDificultad => (DIFICULTADES.indexOf(a) <= DIFICULTADES.indexOf(b) ? a : b);

/** La más difícil de las dos (el orden es el de DIFICULTADES). */
export const masDificil = (a: IdDificultad, b: IdDificultad): IdDificultad => (DIFICULTADES.indexOf(a) >= DIFICULTADES.indexOf(b) ? a : b);
