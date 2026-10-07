// Piso 3 del Edificio Almendros. Mismo esqueleto que el Piso 4 (el 302 está directamente debajo del 402),
// pero el circuito eléctrico falló antes: solo la emergencia enciende. La criatura ya está despierta al
// llegar: 'llego:piso3' se marca en silencio antes de ponerEnPunto(), y el director arranca de inmediato.
// Falta (en este orden): los rastros y documentos del 302, el guion y el ascensor (solo su sonido).
import type { PaquetePiso } from '../TiposPiso';
import { MAPA_PISO_3 } from './mapa';

export const PISO_3: PaquetePiso = {
  id: 'piso3',
  nombre: 'Piso 3',
  mapa: MAPA_PISO_3,
  // Objetivos provisionales hasta que exista el guion. Las tres banderas son distintas para que
  // el test de orden (directorDesde ≤ despiertaCon < imitacionCompletaCon) pase.
  // 'llego:piso3' la marca el motor al llegar (banderasAlLlegar); 'exploro:piso3' e 'imitacion:piso3'
  // las marcará el guion (por ahora nunca se marcan).
  // 'llegar' se cumple en silencio al llegar, así que su texto no se ve nunca: el primero que se lee es 'explorar'.
  objetivos: [
    { id: 'llegar', texto: 'Bajar al Piso 3', bandera: 'llego:piso3' },
    { id: 'explorar', texto: 'Explorar el Piso 3', bandera: 'exploro:piso3' },
    { id: 'descubrir', texto: 'Descubrir qué pasó', bandera: 'imitacion:piso3' },
  ],
  documentos: {},
  transcripciones: {},
  // llego:piso3 se marca en silencio al llegar (banderasAlLlegar). Con ella el director ya está activo
  // y la criatura ya despierta: el Piso 3 es más agresivo que el 4 desde el primer segundo.
  // PENDIENTE (guion del Piso 3): imitacionCompletaCon apunta a 'imitacion:piso3', que nunca se marca
  // hasta que el guion exista. La criatura no llega a la imitación completa
  // (etapa 3) mientras tanto: investigar y acechar funcionan, pero el ritmo no se copia.
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
  // El piso lo cerraron con gente adentro. Lo del 302 (la estatura, el arrastre, el conteo) llega en la
  // siguiente tanda; aquí van las frases, la humedad y lo que pasó en el 303.
  rastros: [
    // En el techo del pasillo, justo debajo del charco que hay arriba frente al 402: se filtró. Corrida hacia
    // la escalera, como siguió el arrastre en el piso de arriba.
    { tipo: 'humedad', id: 'humedad_pasillo', x: 14.5, y: 10.5, rot: -90, ancho: 1.0, alto: 1.4 },
    // En el descanso, a la espalda al llegar: se ve de frente al volver corriendo a la escalera.
    { tipo: 'frase', id: 'frase_descanso3', x: 1, y: 9.5, rot: 90, altura: 1.45, ancho: 0.62, alto: 0.3, lineas: ['HUYE'] },
    // Al final del pasillo, sobre el cuarto de servicio tapiado: ahí ya no había salida.
    { tipo: 'frase', id: 'frase_tapiado', x: 28, y: 10.5, rot: -90, altura: 1.5, ancho: 0.8, alto: 0.29, lineas: ['ESCAPA'] },
    // En la sala del 303, en el muro del hueco donde vive. Quien la escribió no terminó: la mano resbaló hacia
    // abajo y el charco tiene el arrastre hacia la puerta.
    { tipo: 'frase', id: 'frase_hueco303', x: 16, y: 6.6, rot: 90, altura: 1.5, ancho: 0.76, alto: 0.46, lineas: ['VIENE', 'POR TI'] },
    { tipo: 'mano', id: 'mano_303', x: 16, y: 6.75, rot: 90, altura: 0.85, ancho: 0.8, alto: 0.75 },
    { tipo: 'charco', id: 'charco_303', x: 16.9, y: 7.12, rot: 58.8, ancho: 1.0, alto: 1.5 },
  ],
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
