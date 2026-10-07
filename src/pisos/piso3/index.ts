// Piso 3 del Edificio Almendros. Mismo esqueleto que el Piso 4 (el 302 está directamente debajo del 402),
// pero el circuito eléctrico falló antes: solo la emergencia enciende. La criatura ya está despierta al
// llegar: 'llego:piso3' se marca en silencio antes de ponerEnPunto(), y el director arranca de inmediato.
// Tanda 2 añadirá: rastros (las rayas de estatura de Andrés en el 302), documentos, guion y sonido entre pisos.
import type { PaquetePiso } from '../TiposPiso';
import { MAPA_PISO_3 } from './mapa';

export const PISO_3: PaquetePiso = {
  id: 'piso3',
  nombre: 'Piso 3',
  mapa: MAPA_PISO_3,
  // Objetivos provisionales hasta la Tanda 2. Las tres banderas son distintas para que
  // el test de orden (directorDesde ≤ despiertaCon < imitacionCompletaCon) pase.
  // 'llego:piso3' y 'exploro:piso3' los marca el motor (banderasAlLlegar y futuro guion);
  // 'imitacion:piso3' es reservado para Tanda 2 (por ahora nunca se marca).
  objetivos: [
    { id: 'llegar', texto: 'Explorar el Piso 3', bandera: 'llego:piso3' },
    { id: 'explorar', texto: 'Seguir explorando', bandera: 'exploro:piso3' },
    { id: 'descubrir', texto: 'Descubrir qué pasó', bandera: 'imitacion:piso3' },
  ],
  documentos: {},
  transcripciones: {},
  // llego:piso3 se marca en silencio al llegar (banderasAlLlegar). Con ella el director ya está activo
  // y la criatura ya despierta: el Piso 3 es más agresivo que el 4 desde el primer segundo.
  // imitacion:piso3 se marca en Tanda 2 (al descubrir los rastros clave del 302).
  reglas: { directorDesde: 'llego:piso3', despiertaCon: 'llego:piso3', imitacionCompletaCon: 'imitacion:piso3' },
  banderasAlLlegar: ['llego:piso3'],
  objetos: {},
  puntoInicial: 'escalera',
  puntosControl: { 'llego:piso3': 'escalera' },
  luzPorBandera: {},
  placas: [
    { puerta: 'p301', texto: '301', lugar: 'Apartamento 301' },
    { puerta: 'p303', texto: '303', lugar: 'Apartamento 303' },
    { puerta: 'p302', texto: '302', lugar: 'Apartamento 302' },
  ],
  rotulos: [{ texto: '3', x: 2.45, y: 8, altura: 1.6, rot: 0, alto: 0.45 }],
  rastros: [],
  // El tramo de la escalera que sube al Piso 4 está abierto (el jugador acaba de bajar por aquí).
  // La reja de abajo (Piso 2, todavía cerrado) sí se muestra.
  opcionesEscalera: { rejaAbajo: true, escombrosArriba: false },
  escaleras: [{ id: 'subida', hacia: 'piso4', llegada: 'escalera', x: 1.5, y: 10.5, texto: 'Subir al Piso 4' }],
  siguiente: { id: 'piso2', nombre: 'Piso 2' },
  menu: {
    camara: { x: 4.4, y: 10.5, angulo: -90 },
    figura: { x: 15.5, y: 10.5, angulo: -90 },
  },
};
