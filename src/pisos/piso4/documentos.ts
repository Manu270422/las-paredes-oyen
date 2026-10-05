// Aquí están los textos que el jugador encuentra. La historia nunca se
// cuenta completa: se arma con fragmentos que no siempre coinciden.
//
// El tema: en el Edificio Almendros todos oyeron durante años lo que pasaba
// en el 402 (los gritos, los golpes) y todos subieron el volumen del televisor.
// Lo que nadie dijo no se fue a ningún lado. Se quedó en las paredes, oyendo.
// "Las paredes oyen": ¿es una criatura, o es la culpa del edificio entero?
// No lo respondo. Dejo que el jugador decida.
import type { Documento } from '../../narrativa/TiposNarrativa';

export const DOCUMENTOS: Record<string, Documento> = {
  orden_trabajo: {
    id: 'orden_trabajo',
    titulo: 'Orden de trabajo N.º 0413',
    tipo: 'orden',
    paginas: [
      'CONSTRUCTORA HORIZONTE S.A.S.\nORDEN DE TRABAJO N.º 0413\n\nEdificio Almendros — Cra. 27 con Calle 41, Bucaramanga.\nServicio: medición acústica previa a demolición.\nPiso 4: apartamentos 401, 402 y 403.\n\nProcedimiento: registrar seis (6) segundos de tono de sala en el punto marcado con cinta roja en cada sala. El técnico debe permanecer inmóvil y en silencio durante toda la grabación.\n\nEl edificio se encuentra desocupado desde marzo.',
      'Ingeniero:\n\nLa luz del piso está cortada. El tablero queda en el cuarto de servicio, al fondo del pasillo.\n\nLa llave del 402 la dejé en el estudio del 403, encima del escritorio.\n\nSi oye golpes, son las tuberías.\n\nSon las tuberías.\n\n— Hernando, administración',
    ],
  },
  diario_rosalba: {
    id: 'diario_rosalba',
    titulo: 'Diario — apartamento 401',
    tipo: 'diario',
    paginas: [
      '12 de agosto\n\nOtra vez los tres golpes. Siempre después de las once. Don Hernando dice que es el calentador del 402.\n\nEl 402 no tiene calentador. El 402 no tiene a nadie desde que se llevaron al muchacho.',
      '3 de septiembre\n\nLe contesté. No sé por qué lo hice. Golpeé tres veces en la pared del cuarto y paró. Toda la noche paró.\n\nDormí como no dormía desde hace años.',
      '4 de septiembre\n\nHoy golpearon desde el otro lado. Desde el lado donde no hay nada.\n\nEntre mi cuarto y el 403 no hay apartamento. Hay pared. Medí con la cinta de costura: casi cuatro metros de pared.\n\nAlgo vive en cuatro metros de pared.',
      '19 de septiembre\n\nAprendí a caminar por el centro de la casa. Por el centro no me oye. Pegada a las paredes, sí. Las paredes le llevan todo.\n\nYa no hablo en la casa. Si hablo, al rato lo repite. Con mi voz.\n\nY lo repite mejor que yo.',
      '(La última página está escrita con otra letra. Temblorosa.)\n\nno le conteste\nno le conteste\nno le conteste\nno le conteste',
    ],
  },
  nota_nevera: {
    id: 'nota_nevera',
    titulo: 'Nota pegada en la nevera',
    tipo: 'nota',
    paginas: ['Papá:\n\nNo deje la radio prendida cuando salga.\n\nÉl aprende las voces.\nYa se sabe la suya.\n\n— M.'],
  },
  cinta_403: {
    id: 'cinta_403',
    titulo: 'Casete — «PARED NORTE 14/XI»',
    tipo: 'cinta',
    paginas: [
      '[Transcripción del casete]\n\n[Siseo de cinta]\n\nHOMBRE (403): Prueba. Catorce de noviembre, once y veinte de la noche. Voy a golpear tres veces.\n\n[Tres golpes secos]\n\n[Silencio: cuarenta segundos]',
      '[Tres golpes. Más lejos. Como si vinieran desde adentro del muro.]\n\nHOMBRE: ¿Rosalba? ¿Es usted?\n\n[Silencio]\n\nHOMBRE: No es Rosalba. Ella golpea con los nudillos.\nEsto no tiene nudillos.',
      'HOMBRE: ¿Quién es?\n\n[Pausa larga]\n\nVOZ IDÉNTICA A LA DEL HOMBRE: ¿Quién es?\n\n[La grabación se corta y vuelve: ruido de muebles arrastrados]\n\nHOMBRE (susurrando, muy cerca del micrófono): Esa fue mi voz. Pero yo no lo dije. Yo no lo dije.',
      '[Escrito a mano en la carátula del casete]\n\nAprende de lo que oye. No hay que darle nada.\nNi pasos. Ni voces.\n\nNi luz: la linterna zumba cuando la pila está baja,\ny ÉL LO OYE.',
    ],
  },
  carta_402: {
    id: 'carta_402',
    titulo: 'Carta sin enviar',
    tipo: 'carta',
    paginas: [
      'Señores de la Constructora:\n\nUstedes preguntan por qué nadie quiere quedarse en el Almendros. Les contesto yo, que viví aquí veintidós años.\n\nEn este edificio todo se oye. Los platos del 301. La tos del 503. El televisor del 401 a todo volumen.',
      'Y se oía también lo del 402. Los gritos del señor. Los golpes contra la pared. El niño llorando despacito para que no le pegaran más.\n\nTodos lo oímos. Durante años.\n\nY todos subimos el volumen del televisor.',
      'Nadie dijo nada. Ni una vez.\n\nYo creo que todo eso que nos callamos no se fue a ningún lado. Se quedó en las paredes. Oyendo. Aprendiendo.\n\nY ahora que ya no queda nadie a quien escuchar...\n\ntiene hambre.\n\n— (firma ilegible)',
    ],
  },
};
