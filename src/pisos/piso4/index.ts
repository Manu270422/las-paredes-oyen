// Aquí está el Piso 4 del Edificio Almendros armado como paquete. Por ahora solo REEXPORTA lo que
// ya existía en sus lugares de siempre (mapa, objetivos, documentos y cintas): los pasos siguientes
// de A1 van moviendo cada pieza aquí y sacándola del motor. Cuando termine, esta carpeta contendrá
// el piso completo y ningún archivo de fuera volverá a nombrar sus apartamentos.
import { MAPA_PISO_4 } from '../../mundo/datos/MapaPiso4';
import { DOCUMENTOS } from '../../narrativa/Documentos';
import { OBJETIVOS } from '../../narrativa/Objetivos';
import { TRANSCRIPCIONES } from '../../narrativa/Transcripciones';
import type { PaquetePiso } from '../TiposPiso';

export const PISO_4: PaquetePiso = {
  id: 'piso4',
  nombre: 'Piso 4',
  mapa: MAPA_PISO_4,
  objetivos: OBJETIVOS,
  documentos: DOCUMENTOS,
  transcripciones: TRANSCRIPCIONES,
};
