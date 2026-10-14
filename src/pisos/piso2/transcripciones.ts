// Lo que la grabadora capta al grabar el cuarto sordo del 202 (P2-guion, momento 5). En los otros pisos la cinta
// trae golpes y voces desde la pared; aquí, primero nada: ni el siseo. Después, una voz desde adentro de los
// colchones con el tono de Hernando (ella aprendió también la voz que mandaba a callar). Al final, algo de metal
// cae entre los colchones: la llave de servicio que él escondió (aparece cuando termina la cinta).
// BORRADOR (2026-10-13): el creador revisa estos textos.
import type { LineaTranscripcion } from '../../narrativa/TiposNarrativa';

export const TRANSCRIPCIONES: Record<string, LineaTranscripcion[]> = {
  '202': [
    { t: 0.2, texto: '[Reproduces la grabación del cuarto sordo]', sonido: 'bip' },
    { t: 1.3, texto: '[Nada. Ni siquiera el siseo de la cinta]' },
    { t: 5.8, texto: 'Una voz de hombre, desde adentro de los colchones, muy cerca: «Son las tuberías.»', sonido: 'susurro', volumen: 0.6 },
    { t: 9.4, texto: '[Algo de metal cae entre los colchones, en el rincón de la sala]', sonido: 'llave', volumen: 0.6 },
  ],
};
