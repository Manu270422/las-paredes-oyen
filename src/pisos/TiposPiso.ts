// Aquí defino qué es un PISO como paquete: todo lo que el motor necesita saber de un
// piso, entregado como datos. Agregar un piso (o una variante) es crear su carpeta en
// src/pisos/ y anotarlo en catalogo.ts; el motor no se toca.
//
// El tipo CRECE con la migración (A1, ver docs/propuestas/A1-pisos-como-paquetes.md):
// cada campo entra cuando el motor ya lo lee de aquí, para no dejar datos sin dueño.
// Todavía falta: tarjeta de lugar, punto inicial y puntos de control, reglas (qué bandera
// despierta a la criatura), luces por bandera, cámara del menú y el guion opcional.
import type { DefMapa } from '../mundo/datos/TiposMapa';
import type { Documento } from '../narrativa/Documentos';
import type { Objetivo } from '../narrativa/Objetivos';
import type { LineaTranscripcion } from '../narrativa/Transcripciones';

export interface PaquetePiso {
  /** Identificador estable ('piso4'): es la clave del catálogo y, más adelante, de la partida guardada. */
  readonly id: string;
  /** Cómo se llama el piso para el jugador ("Piso 4"). */
  readonly nombre: string;
  readonly mapa: DefMapa;
  readonly objetivos: readonly Objetivo[];
  readonly documentos: Readonly<Record<string, Documento>>;
  readonly transcripciones: Readonly<Record<string, readonly LineaTranscripcion[]>>;
}
