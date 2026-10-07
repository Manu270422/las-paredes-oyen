// Aquí está el Piso 4 del Edificio Almendros armado como paquete. Todo el piso vive en esta carpeta:
// el mapa, los objetivos, los documentos, las cintas y el guion. Ningún archivo del motor nombra sus
// apartamentos ni sus banderas (lo vigilan motorSinPisos y motorSinContenido).
import type { PaquetePiso } from '../TiposPiso';
import { DOCUMENTOS } from './documentos';
import { GuionPiso4 } from './guion';
import { MAPA_PISO_4 } from './mapa';
import { OBJETIVOS } from './objetivos';
import { TRANSCRIPCIONES } from './transcripciones';

export const PISO_4: PaquetePiso = {
  id: 'piso4',
  nombre: 'Piso 4',
  mapa: MAPA_PISO_4,
  objetivos: OBJETIVOS,
  documentos: DOCUMENTOS,
  transcripciones: TRANSCRIPCIONES,
  // Medir el 401 despierta a la criatura (y desbloquea el señuelo); medir el 403 revela su imitación completa.
  // Leer la orden de trabajo pone a trabajar al director.
  reglas: { directorDesde: 'leyo:orden_trabajo', despiertaCon: 'medido:401', imitacionCompletaCon: 'medido:403' },
  objetos: {
    pilas: {
      modelo: 'pilas',
      texto: 'Recoger pilas',
      mensaje: 'Pilas. La linterna durará un poco más.',
      duracionMensaje: 2.5,
      recargaLinterna: 0.5,
    },
    // La llave que abre el 402. Está en el estudio del 403: el mismo id lo pide la puerta del 402 en el mapa.
    llave_402: {
      modelo: 'llave',
      texto: 'Tomar la llave del 402',
      mensaje: 'Una llave con una etiqueta de cartón: «402».',
      duracionMensaje: 3,
      guardaEnInventario: true,
    },
  },
  puntoInicial: 'escalera',
  puntosControl: {
    'leyo:orden_trabajo': 'escalera',
    'medido:401': 'sala401',
    'medido:403': 'sala403',
    tablero_activado: 'servicio',
    'objeto:llave_402': 'estudio403',
  },
  // En Difícil solo guardan las mediciones: el tablero y la llave hay que conseguirlos sin morir.
  puntosControlMayores: ['medido:401', 'medido:403'],
  luzPorBandera: {
    // El tablero devuelve la luz a todo el piso... menos al 402, donde nunca hay luz.
    tablero_activado: { circuitos: { general: 'encendida' }, lamparas: { lampara402: 'rota' } },
    // El apagón del pasillo: las cinco lámparas revientan (el guion las revienta una a una hacia el jugador).
    apagon_pasillo: { lamparas: { pasillo1: 'rota', pasillo2: 'rota', pasillo3: 'rota', pasillo4: 'rota', pasillo5: 'rota' } },
    // Al medir el 402 el edificio queda oscuro: el circuito general apagado, solo la emergencia de la escalera.
    'medido:402': { circuitos: { general: 'apagada', fantasma: 'apagada' }, lamparas: { lampara402: 'rota', emergencia: 'encendida' } },
  },
  // Los números en la cara de pasillo de cada puerta. Sin ellos, la llave del 402 (que está en el 403)
  // confundía: no había cómo saber en qué apartamento estabas.
  placas: [
    { puerta: 'p401', texto: '401', lugar: 'Apartamento 401' },
    { puerta: 'p403', texto: '403', lugar: 'Apartamento 403' },
    { puerta: 'p402', texto: '402', lugar: 'Apartamento 402' },
  ],
  // El "4" pintado en la pared norte de la escalera, bajo la luz de emergencia: se lee siempre, en rojo.
  rotulos: [{ texto: '4', x: 2.45, y: 8, altura: 1.6, rot: 0, alto: 0.45 }],
  // Lo que pasó en el 402, contado sin palabras. Ninguno brilla ni sale en la interfaz: casi no se ven sin
  // la linterna, y cada uno está donde el jugador ya va a mirar (la reja, la puerta, la mesita, la silla).
  rastros: [
    // Al entrar al 402: alguien limpió un charco con un trapo y no pudo con todo. El arrastre sale hacia la
    // puerta (al norte) y llega casi al umbral: lo que sangraba aquí lo sacaron por donde entra el jugador,
    // que lo tiene a los pies apenas abre.
    { tipo: 'charco', id: 'charco_402', x: 14.5, y: 12.69, rot: 180, ancho: 1.3, alto: 1.75 },
    // En el muro oeste del descanso, justo antes de la reja: una mano que se apoyó y se fue arrastrando hacia
    // abajo, hacia la reja del tramo que baja. Lo bajaron por aquí. Queda a la espalda del jugador al
    // empezar: con la luz roja apenas se adivina; la linterna la descubre al darse vuelta.
    { tipo: 'mano', id: 'mano_escalera', x: 1, y: 10.55, rot: 90, altura: 0.95, ancho: 1.0, alto: 0.9 },
    // En el dormitorio, junto a la mesita de la carta: las rayas de estatura del niño. Alguien restregó la
    // pared y no se fue. La última raya no tiene número, y encima hay una mancha que nadie pudo quitar.
    {
      tipo: 'estatura',
      id: 'estatura_andres',
      x: 11.5,
      y: 17,
      rot: 0,
      altura: 1.15,
      ancho: 0.52,
      alto: 0.6,
      mancha: 1.23,
      marcas: [
        { altura: 1.02, texto: 'Andrés 4 años' },
        { altura: 1.09, texto: '5' },
        { altura: 1.15, texto: '6' },
        { altura: 1.21, texto: '7 años' },
        { altura: 1.27, texto: '' },
      ],
    },
    // En el cuarto, frente a la silla que mira la pared: a la altura de los ojos de un niño sentado, días
    // contados con la uña en el yeso. Treinta y siete. El último quedó a medias.
    { tipo: 'conteo', id: 'conteo_402', x: 18.2, y: 19, rot: 180, altura: 0.95, ancho: 0.55, alto: 0.24, cuenta: 37 },
  ],
  escaleras: [{ id: 'bajada', hacia: 'piso3', llegada: 'escalera', x: 1.5, y: 10.5, texto: 'Bajar al Piso 3', requiere: 'objeto:llave_escalera', cerrada: 'La cadena está dada vuelta con candado.' }],
  // Al terminar el piso, el jugador "despierta" con esta llave en la mano, en este punto de control.
  despertar: { objeto: 'llave_escalera', punto: 'escalera' },
  guion: (acciones) => new GuionPiso4(acciones),
  menu: {
    camara: { x: 4.4, y: 10.5, angulo: -90 },
    figura: { x: 15.5, y: 10.5, angulo: -90 },
  },
};
