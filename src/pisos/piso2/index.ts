// Piso 2 del Edificio Almendros (P2-guion): el piso de Hernando, el administrador. Mismo esqueleto que el 3 y el
// 4. Se llega caminando: al final del Piso 3 la reja de abajo se abre sola. La escalera que sigue bajando está
// tapiada con ladrillo nuevo: el único camino al Piso 1 es el ascensor, con la llave de servicio que Hernando
// escondió entre los colchones del 202. Ella ya está despierta al llegar ('llego:piso2' se marca en silencio).
import { PARADA_AL_1 } from '../paradasAscensor';
import type { PaquetePiso } from '../TiposPiso';
import { DOCUMENTOS } from './documentos';
import { CINTA_202, FINAL_PISO_2, GuionPiso2 } from './guion';
import { MAPA_PISO_2 } from './mapa';
import { TRANSCRIPCIONES } from './transcripciones';

export const PISO_2: PaquetePiso = {
  id: 'piso2',
  nombre: 'Piso 2',
  mapa: MAPA_PISO_2,
  // 'llegar' se cumple en silencio al llegar, así que el primero que se lee es 'averiguar'. La X del 202 no deja
  // grabar antes de leer el libro (y dice qué falta). La llave aparece al terminar la cinta del cuarto sordo.
  objetivos: [
    { id: 'llegar', texto: 'Baja al Piso 2', bandera: 'llego:piso2' },
    { id: 'averiguar', texto: 'Averigua quién tapó todo esto: la administración es el 201', bandera: 'leyo:libro_quejas' },
    { id: 'grabar', texto: 'Graba el cuarto sordo: la X está en la sala del 202', bandera: 'medido:202' },
    { id: 'llave', texto: 'En la cinta sonó algo de metal, en el rincón de la sala del 202. Búscalo', bandera: 'objeto:llave_servicio' },
    { id: 'bajar', texto: 'Baja al Piso 1 en el ascensor: el botón del 1 pide la llave de servicio', bandera: FINAL_PISO_2 },
  ],
  documentos: DOCUMENTOS,
  transcripciones: TRANSCRIPCIONES,
  // Como en el 3, ella ya está despierta y el director trabaja desde que llego. La imitación completa llega al
  // grabar el cuarto sordo: ahí se oye que aprendió también la voz de Hernando.
  reglas: { directorDesde: 'llego:piso2', despiertaCon: 'llego:piso2', imitacionCompletaCon: 'medido:202' },
  banderasAlLlegar: ['llego:piso2'],
  objetos: {
    pilas: {
      modelo: 'pilas',
      texto: 'Recoger pilas',
      mensaje: 'Pilas. La linterna durará un poco más.',
      duracionMensaje: 2.5,
      recargaLinterna: 0.5,
    },
    llave_servicio: {
      modelo: 'llave',
      texto: 'Tomar la llave',
      mensaje: 'Una llave pequeña con una etiqueta: «Ascensor — servicio».',
      duracionMensaje: 3.5,
      guardaEnInventario: true,
    },
  },
  puntoInicial: 'escalera',
  // Leer el libro guarda en la oficina. Grabar y tomar la llave guardan en la sala del 202: si muero bajando en el
  // ascensor, vuelvo ahí con la llave en el bolsillo (P2-guion, pregunta 4).
  puntosControl: {
    'llego:piso2': 'escalera',
    'leyo:libro_quejas': 'oficina201',
    'medido:202': 'sala202',
    [CINTA_202]: 'sala202',
    'objeto:llave_servicio': 'sala202',
  },
  puntosControlMayores: ['leyo:libro_quejas', 'medido:202'],
  luzPorBandera: {},
  placas: [
    { puerta: 'p201', texto: '201', lugar: 'Administración' },
    { puerta: 'p203', texto: '203', lugar: 'Apartamento 203' },
    { puerta: 'p202', texto: '202', lugar: 'Apartamento 202' },
  ],
  rotulos: [{ texto: '2', x: 2.45, y: 8, altura: 1.6, rot: 0, alto: 0.45 }],
  // El tramo que sube está abierto (por ahí bajé); el que baja, tapiado con ladrillo nuevo.
  opcionesEscalera: { escombrosArriba: false, tapiadaAbajo: true },
  escaleras: [{ id: 'subida', hacia: 'piso3', llegada: 'escalera', x: 3.5, y: 10.5, texto: 'Subir al Piso 3' }],
  // El mismo ascensor que en el 3 y el 4. Sube a los dos desde el principio; al 1, con la llave de servicio.
  ascensor: {
    x: 5,
    y: 11,
    numero: '2',
    paradas: [{ hacia: 'piso3', texto: 'Subir al Piso 3' }, { hacia: 'piso4', texto: 'Subir al Piso 4' }, PARADA_AL_1],
    lampara: 'luzAscensor',
  },
  siguiente: { id: 'piso1', nombre: 'Piso 1' },
  guion: (acciones) => new GuionPiso2(acciones),
  menu: {
    camara: { x: 4.4, y: 10.5, angulo: -90 },
    figura: { x: 15.5, y: 10.5, angulo: -90 },
  },
};
