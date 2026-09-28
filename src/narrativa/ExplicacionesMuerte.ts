// Aquí decido qué le digo al jugador cuando la criatura lo atrapa.
// Regla de diseño: la muerte debe sentirse "fue culpa mía", no "el juego me
// mató porque sí". Por eso NO muestro una pista al azar: digo lo que ELLA
// oyó, y además lo hago SONAR como ella lo oyó (apagado, a través del muro).
// El consejo práctico solo aparece la primera vez por cada causa: la segunda
// vez basta con oír el sonido. No quiero explicarlo todo con texto.
import type { MotivoCaza } from '../nucleo/Eventos';
import type { IdSonido } from '../audio/TiposAudio';

/** El sonido que la criatura oyó, repetido en la pantalla de muerte. */
export interface EcoMuerte {
  id: IdSonido;
  repeticiones: number;
  /** Segundos entre repeticiones. */
  intervalo: number;
  volumen: number;
  tono?: number;
}

export interface ExplicacionMuerte {
  /** Clave para recordar si ya di este consejo. */
  clave: string;
  titulo: string;
  /** Lo que oyó (o sintió). Siempre se muestra: es información, no tutorial. */
  linea: string;
  /** Cómo evitarlo. Solo la primera vez. */
  consejo: string;
  eco: EcoMuerte | null;
}

/** Consejos genéricos para cuando no sé bien qué pasó. */
const CONSEJOS_GENERALES = [
  'Las paredes llevan el sonido. Camina por el centro de los cuartos.',
  'Si la ves y no haces ruido, a veces se va.',
  'Una puerta cerrada la retrasa y apaga tus pasos.',
  'La grabadora puede sonar por ti.',
];

export function explicarMuerte(motivo: MotivoCaza, enPared: boolean): ExplicacionMuerte {
  switch (motivo) {
    case 'carrera':
      return {
        clave: enPared ? 'carrera-pared' : 'carrera',
        titulo: 'Te oyó.',
        linea: enPared ? 'Oyó tus pasos corriendo contra la pared.' : 'Oyó tus pasos corriendo.',
        consejo: 'Correr la trae directo hacia ti. Corre solo cuando ya te encontró.',
        eco: { id: 'paso_granito', repeticiones: 4, intervalo: 0.27, volumen: 0.8 },
      };
    case 'paso':
      return enPared
        ? {
            clave: 'paso-pared',
            titulo: 'Te oyó.',
            linea: 'Oyó tus pasos pegados a la pared.',
            consejo: 'Las paredes llevan el sonido. Camina por el centro de los cuartos.',
            eco: { id: 'paso_granito', repeticiones: 3, intervalo: 0.45, volumen: 0.75 },
          }
        : {
            clave: 'paso',
            titulo: 'Te oyó.',
            linea: 'Oyó tus pasos.',
            consejo: 'Agachado haces menos ruido. Cuanto más cerca está, menos ruido necesita.',
            eco: { id: 'paso_granito', repeticiones: 3, intervalo: 0.45, volumen: 0.6 },
          };
    case 'respiracion':
      return {
        clave: 'respiracion',
        titulo: 'Te oyó.',
        linea: 'Oyó tu respiración.',
        consejo: 'Con miedo respiras más fuerte. Cuando esté cerca, contén la respiración.',
        eco: { id: 'respira_out', repeticiones: 2, intervalo: 1.1, volumen: 0.9 },
      };
    case 'jadeo':
      return {
        clave: 'jadeo',
        titulo: 'Te oyó.',
        linea: 'Oyó tu jadeo.',
        consejo: 'Si aguantas el aire hasta el final, jadeas sin control. Suéltalo antes de que se acabe.',
        eco: { id: 'jadeo', repeticiones: 1, intervalo: 0, volumen: 0.8 },
      };
    case 'linterna-zumbido':
      return {
        clave: 'linterna-zumbido',
        titulo: 'Te oyó.',
        linea: 'Oyó el zumbido de tu linterna.',
        consejo: 'Con la pila baja, la linterna zumba. Apágala o cambia las pilas.',
        eco: { id: 'zumbido', repeticiones: 2, intervalo: 1.2, volumen: 0.5, tono: 4 },
      };
    case 'linterna-clic':
      return {
        clave: 'linterna-clic',
        titulo: 'Te oyó.',
        linea: 'Oyó el clic de tu linterna.',
        consejo: 'Encender o apagar la linterna también suena. Hazlo lejos de ella.',
        eco: { id: 'clic', repeticiones: 1, intervalo: 0, volumen: 0.9 },
      };
    case 'puerta':
      return {
        clave: 'puerta',
        titulo: 'Te oyó.',
        linea: 'Oyó la puerta.',
        consejo: 'Agachado abres y cierras las puertas despacio, casi sin ruido.',
        eco: { id: 'puerta_crujido', repeticiones: 1, intervalo: 0, volumen: 0.7 },
      };
    case 'presencia':
      return {
        clave: 'presencia',
        titulo: 'Te sintió.',
        linea: 'Te moviste demasiado cerca de ella.',
        consejo: 'Muy cerca no necesita oírte: te siente. Si está a tu lado, no te muevas.',
        // Lo único que se oye es mi propio corazón.
        eco: { id: 'latido', repeticiones: 3, intervalo: 0.55, volumen: 0.9 },
      };
    default:
      return {
        clave: 'general',
        titulo: 'Te oyó.',
        linea: 'Te encontró.',
        consejo: CONSEJOS_GENERALES[Math.floor(Math.random() * CONSEJOS_GENERALES.length)],
        eco: null,
      };
  }
}
