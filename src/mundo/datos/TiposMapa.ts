// Aquí defino la forma de los datos de un nivel. Los niveles son DATOS,
// no código: así puedo diseñar pisos nuevos (o hacer un editor) sin tocar
// la lógica del juego. Todas las posiciones están en unidades de celda.

export type TipoReverb = 'pasillo' | 'sala' | 'habitacion' | 'bano' | 'escalera' | 'ducto';
export type AcabadoPared = 'pintura' | 'papel' | 'azulejo' | 'concreto';
export type AcabadoPiso = 'granito' | 'parque' | 'azulejo' | 'concreto';

export interface DefHabitacion {
  id: string;
  nombre: string;
  /** Rectángulo inclusivo en celdas. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  reverb: TipoReverb;
  pared: AcabadoPared;
  piso: AcabadoPiso;
  /** A qué apartamento pertenece (para medir y para la memoria del director). */
  apartamento?: string;
}

export type Direccion = 'n' | 's' | 'e' | 'o';

export interface DefPuerta {
  id: string;
  x: number;
  y: number;
  /** Hacia dónde gira al abrirse. */
  abreHacia?: Direccion;
  abierta?: boolean;
  /** Si tiene llave, el id del objeto que la abre. */
  llave?: string;
}

export type TipoLampara = 'bombillo' | 'tubo' | 'emergencia';
export type EstadoLampara = 'encendida' | 'apagada' | 'parpadeante' | 'rota';

export interface DefLampara {
  id: string;
  x: number;
  y: number;
  /** Altura en metros (por defecto, colgando del techo). */
  altura?: number;
  tipo: TipoLampara;
  circuito: string;
  estado: EstadoLampara;
  color?: number;
  intensidad?: number;
}

export type TipoMueble =
  | 'sofa'
  | 'sillon'
  | 'mesa'
  | 'silla'
  | 'cama'
  | 'armario'
  | 'caja'
  | 'nevera'
  | 'escritorio'
  | 'estante'
  | 'tina'
  | 'tuberia'
  | 'bolsa'
  | 'baranda'
  | 'televisor'
  | 'mesita'
  | 'figura'
  | 'cuadro';

export interface DefMueble {
  tipo: TipoMueble;
  x: number;
  y: number;
  /** Rotación en grados alrededor del eje vertical. */
  rot?: number;
  /** Cubierto con sábana (la mitad de los muebles del edificio lo están). */
  cubierto?: boolean;
  /** Id para que el director pueda moverlo ("esa silla no estaba así"). */
  id?: string;
  movible?: boolean;
}

export type TipoInteractuable = 'documento' | 'recogible' | 'medicion' | 'tablero' | 'radio';

export interface DefInteractuable {
  tipo: TipoInteractuable;
  id: string;
  x: number;
  y: number;
  /** Altura en metros sobre el piso. */
  altura?: number;
  rot?: number;
  /** Documento que abre (tipo documento). */
  documento?: string;
  /** Id del objeto que entrega (tipo recogible): una clave de `objetos` del paquete del piso. */
  objeto?: string;
  /** Apartamento que se mide (tipo medicion). */
  apartamento?: string;
}

export interface PuntoAparicion {
  x: number;
  y: number;
  /** Ángulo de la mirada en grados (0 = mirando hacia -Z / norte). */
  angulo: number;
}

export interface DefMapa {
  nombre: string;
  /** Filas del mapa: '#' muro, '.' piso, 'P' puerta. */
  rejilla: readonly string[];
  habitaciones: readonly DefHabitacion[];
  puertas: readonly DefPuerta[];
  lamparas: readonly DefLampara[];
  muebles: readonly DefMueble[];
  interactuables: readonly DefInteractuable[];
  puntosControl: Readonly<Record<string, PuntoAparicion>>;
  /** Dónde espera la criatura al empezar (dentro de las paredes). */
  guaridaEntidad: { x: number; y: number };
}
