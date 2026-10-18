// Aquí están los papeles del Piso 1 (P1-guion). El 4 cuenta lo que el edificio oyó; el 3, lo que nadie quiso oír;
// el 2, quien se encargó de que no se oyera. El 1 es del que lo oyó todo: don Aurelio, el portero. Desde la portería
// contestaba el citófono de cada apartamento, de día y de noche, y fue el último que siguió contestando.
// El libro de minuta dice qué pasó con él; su nota, dónde están las llaves de la puerta.
// BORRADOR (2026-10-14): estos textos los revisa el creador antes de publicarlos.
import type { Documento } from '../../narrativa/TiposNarrativa';

export const DOCUMENTOS: Record<string, Documento> = {
  minuta_aurelio: {
    id: 'minuta_aurelio',
    titulo: 'Libro de minuta de la portería',
    tipo: 'diario',
    accion: 'Leer el libro de minuta',
    paginas: [
      '(Un libro de minuta de tapa dura, con el sello del edificio. Turnos, visitas, recibos. La letra es pareja, de alguien que escribió ahí treinta años.)\n\n03:10 — Llamó el 402 por el citófono. Nadie habló. Se oía un niño respirando.\n03:40 — Subí. En el 402 dormían todos. Bajé.\n\n02:14 — Llamó el 302. Ese piso está cerrado desde el primero.',
      '(Al margen, con otra tinta, de cuando todo era normal:) Truco de portero: cuando los muchachos se meten a jugar al vestíbulo, les timbro a los contadores. Van a ver qué suena y me dejan la entrada en paz.\n\nDon Hernando dice que no conteste el citófono de los pisos cerrados. Que son las tuberías.\n\nLas tuberías no dicen mi nombre.\n\n(Las páginas siguientes son solo horas, sin nada al lado: 01:12, 01:40, 02:14, 02:14, 02:14.)',
      '(La última anotación. La misma letra, temblando:)\n\nHoy contesté.\nEra la voz de mi señora, que se murió hace seis años. Me dijo que bajara a abrirle.\n\nNo le abrí.\nCerré la puerta con cadena, cerrojo y llave. Que nadie salga y que nadie entre.\nYo me quedo aquí, contestando.',
    ],
  },
  nota_aurelio: {
    id: 'nota_aurelio',
    titulo: 'Nota de don Aurelio',
    tipo: 'nota',
    accion: 'Leer la nota',
    paginas: [
      '(Un papel doblado junto a la cama, con la misma letra pareja del libro.)\n\nSi alguien lee esto: las llaves quedaron en la cama, con el cinturón. La de la puerta es la grande.\n\nSi el citófono suena, no conteste. Sabe hablar como mi señora.',
    ],
  },
};
