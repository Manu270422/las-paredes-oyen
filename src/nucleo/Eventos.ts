// Aquí declaro TODOS los eventos que viajan por el bus y qué datos llevan.
// Si un sistema publica algo que no está aquí, TypeScript me avisa.
import type { AcabadoPiso } from '../mundo/datos/TiposMapa';
import type { FaseDirector, RasgoJugador } from '../director/TiposDirector';
import type { IdDificultad } from '../config/Dificultad';

/** 'cine': grande y centrada (por defecto). 'discreta': pequeña, abajo y breve. */
export type EstiloTarjeta = 'cine' | 'discreta';

export type OrigenRuido = 'jugador' | 'puerta' | 'grabadora' | 'entorno' | 'radio';

/**
 * QUÉ produjo un ruido. La criatura no lo "entiende" (solo oye volumen),
 * pero yo sí lo necesito: para explicar una muerte con justicia, para
 * decir por qué falló una medición y para medir cómo juega cada persona.
 */
export type CausaRuido =
  | 'paso'
  | 'carrera'
  | 'respiracion'
  | 'jadeo'
  | 'linterna-clic'
  | 'linterna-zumbido'
  | 'puerta'
  | 'senuelo'
  | 'radio'
  | 'tablero'
  | 'otro';

/** Por qué la criatura empezó a cazarme (lo que me mató, si me atrapa). */
export type MotivoCaza = CausaRuido | 'presencia' | 'desconocido';

/** Un ruido en el mundo. La criatura "escucha" estos eventos. */
export interface Ruido {
  x: number;
  z: number;
  /** 0..1: qué tan fuerte fue en su origen. */
  intensidad: number;
  origen: OrigenRuido;
  causa: CausaRuido;
  /** Si lo hice pegado a una pared (la regla central: el muro lo lleva). */
  pared?: boolean;
}

export interface MapaEventos {
  ruido: Ruido;
  'paso-jugador': { x: number; z: number; superficie: AcabadoPiso; intensidad: number };
  subtitulo: { texto: string; duracion?: number; tipo?: 'voz' | 'efecto' };
  /** Sonido importante para subtítulos de efectos (accesibilidad) con dirección. */
  'sonido-relevante': { descripcion: string; x: number; z: number };
  objetivo: { texto: string; nuevo: boolean };
  bandera: { nombre: string };
  /** Pistas de tutorial. El texto lleva marcas {accion} que la UI traduce a teclas/botones. */
  pista: { id: string; texto: string };
  'habitacion-cambiada': { anterior: string | null; actual: string };
  /** Un momento escrito del guion de un piso (el apagón...): la telemetría mide la reacción del jugador. */
  'momento-guion': { id: string };
  /** Un susto directo (la criatura frente a la cámara). */
  susto: { origen: 'muerte' | 'final' };
  interferencia: { intensidad: number; duracion: number };
  medicion: {
    estado: 'inicio' | 'progreso' | 'cancelada' | 'completa';
    progreso: number;
    apartamento: string;
    /** Por qué se arruinó (solo al cancelar). */
    motivo?: CausaRuido | 'movimiento';
  };
  'entidad-estado': { estado: string; fisica: boolean };
  'jugador-atrapado': { x: number; z: number; motivo: MotivoCaza; enPared: boolean };
  'fin-demo': { tiempo: number };
  documento: { id: string };
  /** El jugador vio un rastro (sangre vieja, lápiz, rayas) de cerca y con luz, por primera vez en el piso. */
  'rastro-visto': { id: string };
  /** La dificultad cambió en plena partida: desde Ajustes, o aceptando la oferta de bajar tras morir seguido. */
  'dificultad-cambiada': { de: IdDificultad; a: IdDificultad; motivo: 'ajustes' | 'oferta' };
  /** Tarjeta de lugar: grande y de cine (lugar y hora), o discreta (al entrar a un apartamento). */
  tarjeta: { titulo: string; subtitulo: string; estilo?: EstiloTarjeta };
  /** El director lanzó un evento de terror (x/z si ocurrió en un punto concreto). */
  'evento-director': { id: string; intensidad: number; fase: FaseDirector; x?: number; z?: number; carga?: number };
  'director-fase': { fase: FaseDirector };
  /** Cambió la forma de jugar dominante (o el alivio tras muertes seguidas). */
  'director-adaptacion': { rasgo: RasgoJugador | null; alivio: number };
  /**
   * La grabadora terminó una medición y captó lo que yo no oí:
   * "huellas" = sonidos del mundo; "presencia" = la criatura cerca en silencio.
   */
  'grabacion-captada': { apartamento: string; huellas: number; presencia: boolean };
  /** Uso del señuelo de la grabadora. */
  grabadora: { accion: 'senuelo-colocado' | 'senuelo-recogido' };
  /** La criatura imitó mis pasos (etapa 1: eco, 2: paso de más, 3: repite mi ritmo cuando paro). */
  imitacion: { etapa: 1 | 2 | 3; conCuerpo: boolean };
  /**
   * Encuentro de presencia: la criatura se detuvo a pocos metros y ESCUCHA.
   * Si me quedo quieto y en silencio, se va. Es el momento central del juego.
   */
  encuentro: { estado: 'inicio' | 'superado' | 'fallido'; distancia: number };
}
