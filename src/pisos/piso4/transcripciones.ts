// Aquí están las transcripciones de lo que la grabadora captó en cada
// medición. La idea central: lo que grabo no es lo que oí. Al reproducir,
// aparece algo que no estaba (o que estaba y no escuché).
// Estas son las líneas de la HISTORIA (siempre iguales). Lo que la cinta captó
// de verdad en cada medición lo agrega CapturaGrabadora (jugador/), que es del motor.
import type { LineaTranscripcion } from '../../narrativa/TiposNarrativa';

export const TRANSCRIPCIONES: Record<string, LineaTranscripcion[]> = {
  '401': [
    { t: 0.2, texto: '[Reproduces la medición del 401]', sonido: 'bip' },
    { t: 1.2, texto: '[Siseo de cinta]' },
    { t: 3.0, texto: '[Tres golpes. Muy cerca del micrófono]', sonido: 'golpe', volumen: 0.5, repeticiones: 3 },
    { t: 5.4, texto: '[Algo respira junto al micrófono]', sonido: 'respira_entidad', volumen: 0.35 },
    { t: 8.6, texto: 'Una voz de mujer, muy despacio: «...no le contestes...»', sonido: 'susurro', volumen: 0.6 },
  ],
  '403': [
    { t: 0.2, texto: '[Reproduces la medición del 403]', sonido: 'bip' },
    { t: 1.4, texto: '[Siseo de cinta]' },
    { t: 3.0, texto: '[Pasos. Tus pasos. Pero estabas quieto]', sonido: 'paso_parque', volumen: 0.5 },
    { t: 3.7, texto: '', sonido: 'paso_parque', volumen: 0.55 },
    { t: 4.4, texto: '', sonido: 'paso_parque', volumen: 0.6 },
    { t: 6.4, texto: 'Una voz de hombre, idéntica a la del casete: «¿Quién es?»', sonido: 'susurro', volumen: 0.7 },
  ],
};
