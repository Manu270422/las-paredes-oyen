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
  puntoInicial: 'escalera',
  puntosControl: {
    'leyo:orden_trabajo': 'escalera',
    'medido:401': 'sala401',
    'medido:403': 'sala403',
    tablero_activado: 'servicio',
    'objeto:llave_402': 'estudio403',
  },
  menu: {
    camara: { x: 4.4, y: 10.5, angulo: -90 },
    figura: { x: 15.5, y: 10.5, angulo: -90 },
  },
};
