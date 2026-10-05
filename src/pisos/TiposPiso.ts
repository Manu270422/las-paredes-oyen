// Aquí defino qué es un PISO como paquete: todo lo que el motor necesita saber de un
// piso, entregado como datos. Agregar un piso (o una variante) es crear su carpeta en
// src/pisos/ y anotarlo en catalogo.ts; el motor no se toca.
//
// El tipo CRECE con la migración (A1, ver docs/propuestas/A1-pisos-como-paquetes.md):
// cada campo entra cuando el motor ya lo lee de aquí, para no dejar datos sin dueño.
// Todavía falta: la tarjeta de lugar (Tarea 3).
import type { DefMapa, EstadoLampara, PuntoAparicion } from '../mundo/datos/TiposMapa';
import type { Documento } from '../narrativa/Documentos';
import type { Objetivo } from '../narrativa/Objetivos';
import type { LineaTranscripcion } from '../narrativa/Transcripciones';
import type { AccionesGuion } from '../narrativa/AccionesGuion';
import type { ContextoJuego } from '../nucleo/ContextoJuego';

/** Un objeto que se recoge del piso (unas pilas, una llave): qué es, cómo se ve y qué pasa al tomarlo. */
export interface DefObjetoRecogible {
  /** Su forma 3D (las que existen en interaccion/objetos/Modelos.ts). */
  readonly modelo: 'pilas' | 'llave';
  /** Lo que dice el indicador al mirarlo. */
  readonly texto: string;
  /** El subtítulo al tomarlo, y cuántos segundos se queda. */
  readonly mensaje: string;
  readonly duracionMensaje: number;
  /** Cuánta batería devuelve a la linterna (fracción de 0 a 1). */
  readonly recargaLinterna?: number;
  /** Se guarda en el inventario con su id (las puertas con llave piden ese id). */
  readonly guardaEnInventario?: boolean;
}

/** Las banderas de la historia a las que el motor reacciona, sin saber de qué piso ni de qué apartamento son. */
export interface ReglasPiso {
  /** La bandera desde la que trabaja el director de terror (antes de ella, el piso está en calma total). */
  readonly directorDesde: string;
  /** La bandera que despierta a la criatura: desde ahí puede salir de las paredes, y se desbloquea el señuelo de la grabadora. */
  readonly despiertaCon: string;
  /** La bandera que revela cómo imita: desde ahí su imitación llega a la etapa 3 (repite tu ritmo al detenerte). */
  readonly imitacionCompletaCon: string;
}

/**
 * El guion de un piso: los momentos escritos a mano (cintas, apagones, el final). Es lo único del paquete
 * que es código y no datos. El motor lo crea una vez, lo conecta al bus, lo reinicia al cargar un punto de
 * control y lo actualiza cada fotograma. Un piso sin guion funciona igual, solo con el director.
 */
export interface GuionPiso {
  conectar(ctx: ContextoJuego): void;
  reiniciar(ctx: ContextoJuego): void;
  actualizar(dt: number, ctx: ContextoJuego): void;
}

/** Qué luces cambian cuando se marca una bandera de progreso. */
export interface CambioDeLuz {
  /** Un circuito entero: todas sus lámparas pasan a ese estado. */
  readonly circuitos?: Readonly<Record<string, EstadoLampara>>;
  /** Lámparas sueltas por id (se aplican después de los circuitos: pueden hacer una excepción). */
  readonly lamparas?: Readonly<Record<string, EstadoLampara>>;
}

export interface PaquetePiso {
  /** Identificador estable ('piso4'): es la clave del catálogo y, más adelante, de la partida guardada. */
  readonly id: string;
  /** Cómo se llama el piso para el jugador ("Piso 4"). */
  readonly nombre: string;
  readonly mapa: DefMapa;
  readonly objetivos: readonly Objetivo[];
  readonly documentos: Readonly<Record<string, Documento>>;
  readonly transcripciones: Readonly<Record<string, readonly LineaTranscripcion[]>>;
  readonly reglas: ReglasPiso;
  /** Los objetos que se recogen, por id: el mapa solo dice dónde está cada uno y de cuál es. */
  readonly objetos: Readonly<Record<string, DefObjetoRecogible>>;
  /** El punto de control (de `mapa.puntosControl`) con el que empieza una partida nueva. */
  readonly puntoInicial: string;
  /** Qué banderas crean un punto de control: bandera → nombre del punto donde se reaparece. */
  readonly puntosControl: Readonly<Record<string, string>>;
  /**
   * Las luces que cambian con una bandera. Se aplican al marcarla y al restaurar una partida,
   * en el orden en que están escritas (por eso una bandera posterior puede romper lo que otra encendió).
   */
  readonly luzPorBandera: Readonly<Record<string, CambioDeLuz>>;
  /** El guion del piso (opcional): recibe lo que puede pedirle al juego (fundidos, susto, final). */
  readonly guion?: (acciones: AccionesGuion) => GuionPiso;
  /** El fondo del menú: se dibuja sobre el piso real, con alguien de pie al fondo. */
  readonly menu: {
    /** Dónde está la cámara (en celdas) y hacia dónde mira (grados). */
    readonly camara: PuntoAparicion;
    /** Dónde aparece, de vez en cuando, la figura al fondo (en celdas) y hacia dónde mira (grados). */
    readonly figura: PuntoAparicion;
  };
}
