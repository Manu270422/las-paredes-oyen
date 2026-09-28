// Aquí defino los nombres de todos los sonidos y las opciones para reproducirlos.
// Tener los IDs tipados evita errores de "sonido que no existe" en tiempo de juego.

export type IdSonido =
  | 'paso_granito'
  | 'paso_parque'
  | 'paso_azulejo'
  | 'paso_concreto'
  | 'paso_entidad'
  | 'golpe'
  | 'puerta_crujido'
  | 'puerta_lenta'
  | 'puerta_cerrar'
  | 'portazo'
  | 'cerradura'
  | 'llave'
  | 'clic'
  | 'respira_in'
  | 'respira_out'
  | 'jadeo'
  | 'latido'
  | 'estatica'
  | 'susurro'
  | 'zumbido'
  | 'goteo'
  | 'crujido_madera'
  | 'tuberia'
  | 'respira_entidad'
  | 'chillido'
  | 'siseo_cinta'
  | 'bip'
  | 'chispa'
  | 'rasguno'
  | 'papel'
  | 'recoger'
  | 'tablero'
  | 'viento'
  | 'ui';

/** Grupos de mezcla. Cada uno tiene su volumen y reacciona distinto al "escuchar". */
export type NombreBus = 'ambiente' | 'efectos' | 'entidad' | 'voz' | 'interfaz';

export interface Posicion3D {
  x: number;
  y: number;
  z: number;
}

export interface OpcionesSonido {
  bus?: NombreBus;
  volumen?: number;
  /** Velocidad de reproducción (1 = normal). Cambia el tono. */
  tono?: number;
  /** Variación aleatoria de tono (0.05 = ±5 %) para que nada suene repetido. */
  variacion?: number;
  /** Si hay posición, el sonido es 3D. Si no, suena "en mi cabeza". */
  posicion?: Posicion3D | null;
  /** Sonido dentro de la pared: amortiguado, grave y sin dirección clara. */
  dentroPared?: boolean;
  bucle?: boolean;
  /** Segundos de espera antes de sonar. */
  retraso?: number;
  /** Cuánto se envía a la reverberación de la habitación (0..1). */
  reverb?: number;
  /** Distancia a la que el sonido está a volumen completo. */
  distanciaReferencia?: number;
  /** Qué tan rápido cae el volumen con la distancia. */
  caida?: number;
}
