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
  luzPorBandera: {
    // El tablero devuelve la luz a todo el piso... menos al 402, donde nunca hay luz.
    tablero_activado: { circuitos: { general: 'encendida' }, lamparas: { lampara402: 'rota' } },
    // El apagón del pasillo: las cinco lámparas revientan (el guion las revienta una a una hacia el jugador).
    apagon_pasillo: { lamparas: { pasillo1: 'rota', pasillo2: 'rota', pasillo3: 'rota', pasillo4: 'rota', pasillo5: 'rota' } },
  },
  guion: (acciones) => new GuionPiso4(acciones),
  menu: {
    camara: { x: 4.4, y: 10.5, angulo: -90 },
    figura: { x: 15.5, y: 10.5, angulo: -90 },
  },
};
