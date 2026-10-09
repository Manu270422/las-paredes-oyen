// Lo que la grabadora capta al grabar la pared del cuarto de Andrés (P3-guion). Como en el Piso 4: lo que grabo
// no es lo que oí. Estas son las líneas de la historia; lo que el micrófono captó de verdad lo agrega el motor.
// La voz de niño dice lo que escribió en su plana; la segunda frase es la de la hoja del 303 ("cuando esté
// completo"), dicha con mi ritmo: él ya habla por Andrés y está aprendiendo a hablar por mí.
import type { LineaTranscripcion } from '../../narrativa/TiposNarrativa';

export const TRANSCRIPCIONES: Record<string, LineaTranscripcion[]> = {
  '302': [
    { t: 0.2, texto: '[Reproduces la grabación del cuarto de Andrés]', sonido: 'bip' },
    { t: 1.3, texto: '[Siseo de cinta]' },
    { t: 3.0, texto: '[Tres golpes, despacio, desde adentro de la pared]', sonido: 'golpe', volumen: 0.45, repeticiones: 3, dentroPared: true },
    { t: 6.2, texto: 'Una voz de niño, pegada al micrófono: «Hoy mi mamá me midió.»', sonido: 'susurro', volumen: 0.55 },
    { t: 9.6, texto: 'La misma voz, más grave, con el ritmo de tu respiración: «Ya casi estoy completo.»', sonido: 'susurro', volumen: 0.7 },
  ],
};
