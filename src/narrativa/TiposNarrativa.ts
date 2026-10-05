// Aquí están las FORMAS de lo que cuenta un piso: documentos, objetivos y líneas de transcripción.
// Los textos de cada piso viven en su paquete (src/pisos/<piso>/); el motor solo conoce estas formas.
import type { IdSonido } from '../audio/TiposAudio';

/** Forma de papel (cambia el modelo 3D y cómo se lee). */
export type TipoDocumento = 'orden' | 'diario' | 'nota' | 'cinta' | 'carta';

export interface Documento {
  id: string;
  titulo: string;
  tipo: TipoDocumento;
  paginas: string[];
}

/** Un objetivo se completa con una bandera de progreso. */
export interface Objetivo {
  id: string;
  texto: string;
  /** Bandera que lo completa. */
  bandera: string;
}

/** Una línea de lo que suena al reproducir una medición. */
export interface LineaTranscripcion {
  /** Segundos desde que empieza la reproducción. */
  t: number;
  texto: string;
  /** Sonido que acompaña a la línea (reproducido "desde la grabadora"). */
  sonido?: IdSonido;
  volumen?: number;
  /** Cuántas veces suena, separadas 0.36 s (los tres golpes). */
  repeticiones?: number;
  /** Captado a través del muro: suena apagado. */
  dentroPared?: boolean;
}
