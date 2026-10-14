// Aquí están los papeles del Piso 2 (P2-guion). El 4 cuenta lo que el edificio oyó; el 3, lo que nadie quiso oír.
// El 2 es de quien se encargó de que no se oyera: Hernando, el administrador. Contestaba todas las quejas con
// "son las tuberías", cerró el tercer piso, tapió la escalera y forró su apartamento con colchones para no oír.
//
// El libro de quejas dice quién tapó todo; la lista de las llaves, qué falta (la del ascensor); el cuaderno de
// Hernando, por qué se encerró. Como en los otros pisos, no explico qué vive en la pared.
// BORRADOR (2026-10-13): estos textos los revisa el creador antes de publicarlos.
import type { Documento } from '../../narrativa/TiposNarrativa';

export const DOCUMENTOS: Record<string, Documento> = {
  libro_quejas: {
    id: 'libro_quejas',
    titulo: 'Libro de quejas del edificio',
    tipo: 'diario',
    accion: 'Leer el libro de quejas',
    paginas: [
      '(Un libro de actas de tapa dura. En la primera hoja, a máquina: EDIFICIO ALMENDROS — QUEJAS Y RECLAMOS. Cada queja tiene otra letra. Las respuestas, siempre la misma.)\n\n14 de marzo — 302: «Golpes en la pared del cuarto del niño, de noche.»\nRespuesta: Son las tuberías. — H.\n\n2 de abril — 402: «Se oye a alguien caminando adentro del muro.»\nRespuesta: Son las tuberías. — H.',
      '19 de mayo — 301: «El niño del 302 llora y alguien le contesta desde la pared. No es el papá.»\nRespuesta: Son las tuberías. — H.\n\n7 de junio — 403: «La radio repite lo que digo. Con mi voz.»\nRespuesta: Son las tuberías. — H.\n\n(La tinta de las respuestas está más fresca que la de las quejas. Como si las hubiera escrito todas el mismo día.)',
      '28 de octubre — 302: (la queja está tachada hasta no poder leerse)\nRespuesta: Se cierra el tercer piso. La familia del 302 sube al 402.\n\n(La última hoja escrita no tiene fecha. Es la letra de las respuestas, pero torcida:)\n\nYa no lo oigo.\nTapié la escalera para que no baje.\nO para que no suba. Ya no sé de qué lado está.',
    ],
  },
  lista_llaves: {
    id: 'lista_llaves',
    titulo: 'Lista de llaves de la administración',
    tipo: 'nota',
    accion: 'Leer la lista de las llaves',
    paginas: [
      '(Una hoja pegada con cinta junto a la puerta, a máquina. Las llaves que guarda la administración.)\n\n301 · 302 · 303\n401 · 402 · 403\nCuarto de servicio · Terraza · Contadores\nAscensor (servicio)\n\n(La del ascensor está tachada. Al lado, a lápiz: «La tengo yo. Que nadie baje. — H.»)',
    ],
  },
  cuaderno_hernando: {
    id: 'cuaderno_hernando',
    titulo: 'Cuaderno de Hernando',
    tipo: 'diario',
    accion: 'Leer el cuaderno',
    paginas: [
      '(Un cuaderno de cuentas. Las primeras hojas son de la administración: recibos, pagos, el plomero. Después la letra cambia.)\n\nLo oigo arriba, en el 302. Rasca como si buscara por dónde salir.\n\nCompré los primeros colchones en la plaza y los clavé en la pared del cuarto. Esa noche dormí.',
      'Ya forré la sala y el techo. Aquí adentro no se oye nada. Ni mi respiración.\n\nLo malo es que yo tampoco lo oigo a él. No sé si está en la pared o en la puerta.\n\nDejé la radio a todo volumen en el pasillo, para que crea que estoy allá.',
      'Hoy me habló desde el colchón. Con mi voz.\n\nMe dijo: «Son las tuberías.»\n\nEscondí la llave del ascensor entre los colchones, donde no la pueda oír. Que nadie baje.',
    ],
  },
};
