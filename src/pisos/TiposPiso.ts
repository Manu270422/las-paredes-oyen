// Aquí defino qué es un PISO como paquete: todo lo que el motor necesita saber de un
// piso, entregado como datos. Agregar un piso (o una variante) es crear su carpeta en
// src/pisos/ y anotarlo en catalogo.ts; el motor no se toca.
//
// El tipo CRECE con la migración (A1, ver docs/propuestas/A1-pisos-como-paquetes.md):
// cada campo entra cuando el motor ya lo lee de aquí, para no dejar datos sin dueño.
// Todavía falta: tarjeta de lugar, los objetos del mapa y el guion opcional.
import type { DefMapa, EstadoLampara, PuntoAparicion } from '../mundo/datos/TiposMapa';
import type { Documento } from '../narrativa/Documentos';
import type { Objetivo } from '../narrativa/Objetivos';
import type { LineaTranscripcion } from '../narrativa/Transcripciones';

/** Las banderas de la historia a las que el motor reacciona, sin saber de qué piso ni de qué apartamento son. */
export interface ReglasPiso {
  /** La bandera que despierta a la criatura: desde ahí puede salir de las paredes, y se desbloquea el señuelo de la grabadora. */
  readonly despiertaCon: string;
  /** La bandera que revela cómo imita: desde ahí su imitación llega a la etapa 3 (repite tu ritmo al detenerte). */
  readonly imitacionCompletaCon: string;
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
  /** El punto de control (de `mapa.puntosControl`) con el que empieza una partida nueva. */
  readonly puntoInicial: string;
  /** Qué banderas crean un punto de control: bandera → nombre del punto donde se reaparece. */
  readonly puntosControl: Readonly<Record<string, string>>;
  /**
   * Las luces que cambian con una bandera. Se aplican al marcarla y al restaurar una partida,
   * en el orden en que están escritas (por eso una bandera posterior puede romper lo que otra encendió).
   */
  readonly luzPorBandera: Readonly<Record<string, CambioDeLuz>>;
  /** El fondo del menú: se dibuja sobre el piso real, con alguien de pie al fondo. */
  readonly menu: {
    /** Dónde está la cámara (en celdas) y hacia dónde mira (grados). */
    readonly camara: PuntoAparicion;
    /** Dónde aparece, de vez en cuando, la figura al fondo (en celdas) y hacia dónde mira (grados). */
    readonly figura: PuntoAparicion;
  };
}
