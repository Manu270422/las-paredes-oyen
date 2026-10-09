// Piso 3 del Edificio Almendros. Mismo esqueleto que el Piso 4 (el 302 está directamente debajo del 402),
// pero el circuito eléctrico falló antes: solo la emergencia enciende. La criatura ya está despierta al
// llegar: 'llego:piso3' se marca en silencio antes de ponerEnPunto(), y el director arranca de inmediato.
// Aquí se junta la libreta de Andrés (el cuaderno del 302 y las hojas que le arrancaron, en el 301 y el 303).
// El guion completo (propuesta P3-guion): el golpe al llegar, el apagón al juntar la libreta, grabar la pared del
// cuarto de Andrés, ella en el pasillo al volver y el final en la escalera. Falta el ascensor (solo su sonido).
import type { PaquetePiso } from '../TiposPiso';
import { DOCUMENTOS } from './documentos';
import { EXAMINABLES } from './examinables';
import { CINTA_302, FINAL_PISO_3, GuionPiso3, LIBRETA_COMPLETA } from './guion';
import { TRANSCRIPCIONES } from './transcripciones';
import { MAPA_PISO_3 } from './mapa';

export const PISO_3: PaquetePiso = {
  id: 'piso3',
  nombre: 'Piso 3',
  mapa: MAPA_PISO_3,
  // 'llegar' se cumple en silencio al llegar (banderasAlLlegar), así que su texto no se ve nunca: el primero que
  // se lee es 'averiguar'. La carta que lo cumple está en el 301, el primer apartamento desde la escalera.
  // 'juntar' lo cumple el guion: marca 'imitacion:piso3' cuando las tres partes de la libreta están leídas.
  objetivos: [
    { id: 'llegar', texto: 'Bajar al Piso 3', bandera: 'llego:piso3' },
    { id: 'averiguar', texto: 'Averigua por qué cerraron este piso', bandera: 'leyo:carta_admin_301' },
    { id: 'juntar', texto: 'Junta las hojas del cuaderno de Andrés, el niño del 302', bandera: LIBRETA_COMPLETA },
    { id: 'grabar', texto: 'Graba la pared del cuarto de Andrés: la X está en el dormitorio del 302', bandera: 'medido:302' },
    // 'huir' se cumple al empezar el final, en la escalera: su texto es lo último que se lee en el piso.
    { id: 'huir', texto: 'Vuelve a la escalera', bandera: FINAL_PISO_3 },
  ],
  documentos: DOCUMENTOS,
  transcripciones: TRANSCRIPCIONES,
  examinables: EXAMINABLES,
  // llego:piso3 se marca en silencio al llegar (banderasAlLlegar). Con ella el director ya está activo
  // y la criatura ya despierta: el Piso 3 es más agresivo que el 4 desde el primer segundo.
  // La imitación completa (etapa 3: repite mi ritmo al detenerme) llega al juntar la libreta: ahí se entiende
  // que él habla por Andrés.
  reglas: { directorDesde: 'llego:piso3', despiertaCon: 'llego:piso3', imitacionCompletaCon: LIBRETA_COMPLETA },
  banderasAlLlegar: ['llego:piso3'],
  objetos: {
    pilas: {
      modelo: 'pilas',
      texto: 'Recoger pilas',
      mensaje: 'Pilas. La linterna durará un poco más.',
      duracionMensaje: 2.5,
      recargaLinterna: 0.5,
    },
  },
  puntoInicial: 'escalera',
  // Leer el cuaderno guarda en el cuarto del 302: lo que pase al juntar la libreta no me devuelve a la escalera.
  // En Difícil también cuenta (es el hito del 302, como medir un apartamento en el Piso 4).
  // Grabar la pared guarda en el dormitorio: ella espera en el pasillo, y morir ahí no devuelve a la libreta.
  puntosControl: { 'llego:piso3': 'escalera', 'leyo:libreta_302': 'cuarto302', 'medido:302': 'dormitorio302', [CINTA_302]: 'dormitorio302' },
  puntosControlMayores: ['leyo:libreta_302', 'medido:302'],
  // Al juntar la libreta revienta la única luz del piso: la emergencia de la escalera.
  luzPorBandera: { [LIBRETA_COMPLETA]: { lamparas: { emergencia: 'rota' } } },
  placas: [
    { puerta: 'p301', texto: '301', lugar: 'Apartamento 301' },
    { puerta: 'p303', texto: '303', lugar: 'Apartamento 303' },
    { puerta: 'p302', texto: '302', lugar: 'Apartamento 302' },
  ],
  rotulos: [{ texto: '3', x: 2.45, y: 8, altura: 1.6, rot: 0, alto: 0.45 }],
  // El piso lo cerraron con gente adentro: las frases, la humedad, lo que pasó en el 303 y lo del 302.
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
    // En el dormitorio del 302, en el mismo muro que las del 402 de arriba: las rayas de cuando Andrés vivía
    // aquí. Llegan hasta los 6 años (en el 402 las siguen). Sin mancha: aquí todavía no había pasado.
    {
      tipo: 'estatura',
      id: 'estatura_andres_302',
      x: 11.5,
      y: 17,
      rot: 0,
      altura: 1.1,
      ancho: 0.52,
      alto: 0.5,
      marcas: [
        { altura: 1.02, texto: 'Andrés 4 años' },
        { altura: 1.09, texto: '5' },
        { altura: 1.15, texto: '6 años' },
      ],
    },
    // Justo debajo del charco del 402, pero al revés: arriba lo que sangraba lo sacaron hacia la puerta; aquí
    // lo ENTRARON. El charco queda en el umbral y el arrastre va hacia el cuarto pequeño (donde está el cuaderno).
    { tipo: 'charco', id: 'charco_302', x: 14.7, y: 13.11, rot: 52.8, ancho: 1.0, alto: 1.6 },
  ],
  // El tramo de la escalera que sube al Piso 4 está abierto (el jugador acaba de bajar por aquí).
  // La reja de abajo (Piso 2, todavía cerrado) sí se muestra.
  opcionesEscalera: { rejaAbajo: true, escombrosArriba: false },
  // El tramo que sube está a la derecha de la boca (celda x 3); el de la izquierda (x 1) baja, con su reja al Piso 2.
  escaleras: [{ id: 'subida', hacia: 'piso4', llegada: 'escalera', x: 3.5, y: 10.5, texto: 'Subir al Piso 4' }],
  siguiente: { id: 'piso2', nombre: 'Piso 2' },
  guion: (acciones) => new GuionPiso3(acciones),
  menu: {
    camara: { x: 4.4, y: 10.5, angulo: -90 },
    figura: { x: 15.5, y: 10.5, angulo: -90 },
  },
};
