// Aquí defino la forma de los datos de una sesión de prueba (playtesting).
// Reglas que me impuse:
// - Todo es LOCAL: se guarda en este dispositivo y solo sale si yo lo exporto.
// - Nada personal: ni nombre, ni navegador exacto, ni ubicación. Solo cómo
//   se jugó (tiempos, eventos, decisiones) y en qué tipo de equipo.
// - Es opcional y viene apagado: se activa en Ajustes → Pruebas o con ?telemetria=1.
import type { ModoEntrada } from '../entrada/AccionesEntrada';
import type { NivelCalidad } from '../config/PerfilesCalidad';

export type ValorDato = string | number | boolean | null;

/** Un evento con su momento (segundos de juego desde que empezó la sesión). */
export interface RegistroEvento {
  t: number;
  tipo: string;
  datos?: Record<string, ValorDato>;
}

/** Una foto del estado cada pocos segundos: con esto dibujo la "curva del miedo" de la sesión. */
export interface MuestraCurva {
  t: number;
  /** Estrés del jugador (0..1): sube con sustos y cercanía, baja con calma. */
  estres: number;
  /** Tensión del director (0..1). */
  tension: number;
  fase: string;
  habitacion: string | null;
  entidad: string | null;
  /** Metros hasta la criatura si tiene cuerpo; null si está en las paredes. */
  distancia: number | null;
  fps: number;
}

export interface EntornoSesion {
  entrada: ModoEntrada;
  tactil: boolean;
  calidad: NivelCalidad;
  /** Proporción de la pantalla (ancho/alto) redondeada. */
  aspecto: number;
  hrtf: boolean;
}

/** Cómo terminó la sesión. */
export type FinSesion = 'fin' | 'menu' | 'cierre' | 'en-curso';

export interface SesionTelemetria {
  version: 1;
  id: string;
  /** Fecha y hora de inicio (ISO). */
  inicio: string;
  /** Segundos de juego (sin contar pausas ni menús). */
  duracion: number;
  /** Segundos reales desde el inicio hasta el cierre. */
  duracionReal: number;
  terminada: FinSesion;
  puntoInicio: string;
  entorno: EntornoSesion;
  eventos: RegistroEvento[];
  curva: MuestraCurva[];
  /** Contadores de estilo de juego: ruidos por causa, segundos agachado, corriendo... */
  contadores: Record<string, number>;
  resumen: ResumenSesion | null;
}

/** Métricas derivadas que calculo al cerrar la sesión (lo primero que miro al analizar). */
export interface ResumenSesion {
  tiempoPrimerMovimiento: number | null;
  tiempoPrimerRuido: number | null;
  tiempoPrimeraMedicion: number | null;
  tiempoPrimeraAparicion: number | null;
  tiempoPrimerSusto: number | null;
  /** La primera vez que el jugador REACCIONÓ fuerte (se giró de golpe, se congeló...). */
  tiempoPrimeraReaccionFuerte: number | null;
  muertes: number;
  causasMuerte: Record<string, number>;
  medicionesCompletas: number;
  medicionesCanceladas: number;
  motivosCancelacion: Record<string, number>;
  senuelosUsados: number;
  regresos: number;
  tiempoPorHabitacion: Record<string, number>;
  eventosDirector: Record<string, number>;
  eventosVistos: number;
  eventosNoVistos: number;
  reaccionesFuertes: number;
  reaccionesTotales: number;
  encuentros: { iniciados: number; superados: number; fallidos: number };
  imitaciones: Record<string, number>;
  marcasObservador: number;
  estresMedio: number;
  estresMaximo: number;
  fpsMedio: number;
}
