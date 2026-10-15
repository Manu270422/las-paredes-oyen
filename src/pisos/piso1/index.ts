// Piso 1 del Edificio Almendros (P1-guion): la planta baja, el piso de don Aurelio, el portero. Se llega en la
// cabina, desde el 2 (después de que se detuvo entre pisos con ella encima). Al abrirse las puertas, el ascensor se
// queda sin corriente y la escalera está tapada: de aquí solo se sale por la puerta principal, con sus tres
// cerraduras. Es el último piso: al salir, "Sobreviviste".
import type { PaquetePiso } from '../TiposPiso';
import { DOCUMENTOS } from './documentos';
import { GuionPiso1, PUERTA_ABIERTA, SIN_CORRIENTE } from './guion';
import { MAPA_PISO_1 } from './mapa';

/** Lo que pide el ascensor del 1 para funcionar: nunca se cumple (se quedó sin corriente al llegar). */
const CORRIENTE = 'corriente:ascensor';
const SIN_CORRIENTE_TEXTO = 'Ningún botón se enciende. El ascensor se quedó sin corriente.';

export const PISO_1: PaquetePiso = {
  id: 'piso1',
  nombre: 'Piso 1',
  mapa: MAPA_PISO_1,
  // 'llegar' se cumple en silencio al llegar, así que el primero que se lee es 'averiguar'.
  objetivos: [
    { id: 'llegar', texto: 'Baja al Piso 1', bandera: 'llego:piso1' },
    { id: 'averiguar', texto: 'Averigua qué pasó con el portero: la portería está al fondo del vestíbulo', bandera: 'leyo:minuta_aurelio' },
    { id: 'llaves', texto: 'Busca las llaves de la puerta: don Aurelio vivía detrás de la portería', bandera: 'objeto:llaves_aurelio' },
    { id: 'salir', texto: 'Abre la puerta principal: la cadena, el cerrojo y la llave. Cada una hace ruido', bandera: PUERTA_ABIERTA },
  ],
  documentos: DOCUMENTOS,
  transcripciones: {},
  // Como en el 3 y el 2, ella ya está despierta al llegar. La imitación completa llega con el libro de minuta: ahí se
  // entiende que sabe hablar con las voces de los que ya no están.
  reglas: { directorDesde: 'llego:piso1', despiertaCon: 'llego:piso1', imitacionCompletaCon: 'leyo:minuta_aurelio' },
  banderasAlLlegar: ['llego:piso1'],
  objetos: {
    pilas: {
      modelo: 'pilas',
      texto: 'Recoger pilas',
      mensaje: 'Pilas. La linterna durará un poco más.',
      duracionMensaje: 2.5,
      recargaLinterna: 0.5,
    },
    llaves_aurelio: {
      modelo: 'llave',
      texto: 'Tomar las llaves',
      mensaje: 'El llavero de don Aurelio. La grande dice «PUERTA».',
      duracionMensaje: 3.5,
      guardaEnInventario: true,
    },
  },
  // Se llega a la cabina (y de ahí, al pasillo si muero antes de otro punto). Leer el libro guarda en la portería.
  // Tomar las llaves guarda ANTES de la puerta, en el vestíbulo (decisión del creador: punto de control antes de la
  // puerta en Normal; en Pesadilla no hay puntos de control). Las cerraduras abiertas no guardan: morir las cierra.
  puntoInicial: 'pasillo',
  puntosControl: { 'llego:piso1': 'pasillo', 'leyo:minuta_aurelio': 'porteria', 'objeto:llaves_aurelio': 'vestibulo' },
  puntosControlMayores: ['leyo:minuta_aurelio', 'objeto:llaves_aurelio'],
  // Al abrirse las puertas de la cabina, su tubo revienta (lo marca el guion).
  luzPorBandera: { [SIN_CORRIENTE]: { lamparas: { luzAscensor: 'rota' } } },
  rotulos: [{ texto: '1', x: 2.45, y: 8, altura: 1.6, rot: 0, alto: 0.45 }],
  // La escalera no sirve: arriba, tablas y escombros; abajo (el sótano, fuera de la 1.0), la reja sin llave.
  opcionesEscalera: { rejaAbajo: true, escombrosArriba: true },
  // El mismo ascensor, pero muerto: llega (en un viaje que empezó arriba) y ya no sale. El panel es el mismo de
  // siempre (la cabina es una sola); ningún botón se enciende.
  ascensor: {
    x: 5,
    y: 11,
    numero: '1',
    paradas: [
      { hacia: 'piso2', texto: 'Subir al Piso 2', requiere: CORRIENTE, cerrada: SIN_CORRIENTE_TEXTO },
      { hacia: 'piso3', texto: 'Subir al Piso 3', requiere: CORRIENTE, cerrada: SIN_CORRIENTE_TEXTO },
      { hacia: 'piso4', texto: 'Subir al Piso 4', requiere: CORRIENTE, cerrada: SIN_CORRIENTE_TEXTO },
    ],
    requiere: CORRIENTE,
    muerto: SIN_CORRIENTE_TEXTO,
    lampara: 'luzAscensor',
  },
  guion: (acciones) => new GuionPiso1(acciones),
  menu: {
    camara: { x: 10, y: 9.5, angulo: -90 },
    figura: { x: 20.5, y: 9.5, angulo: -90 },
  },
};
