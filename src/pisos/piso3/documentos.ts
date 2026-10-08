// Aquí están los papeles del Piso 3. Si el 4 cuenta lo que el edificio oyó, el 3 cuenta lo que nadie quiso
// oír: a la familia del 302 la subieron al 402 y cerraron el piso "por las tuberías".
//
// El hilo es la libreta de Andrés: su cuaderno quedó en el cuarto del 302, sin hojas; una se la pasó a la
// vecina del 301 por debajo de la puerta y otra se le cayó en el ascensor (la guardó alguien del 303). Leídas
// las tres, se nota lo que no dice ninguna: la última página no tiene su letra.
//
// Como en el Piso 4, los fragmentos no siempre coinciden. No explico qué vive en la pared.
import type { Documento } from '../../narrativa/TiposNarrativa';

export const DOCUMENTOS: Record<string, Documento> = {
  carta_admin_301: {
    id: 'carta_admin_301',
    titulo: 'Carta de la administración',
    tipo: 'carta',
    paginas: [
      'Edificio Almendros — Administración\n28 de octubre\n\nSeñora Inés Cárdenas\nApartamento 301\n\nRespetada señora Inés:\n\nLe confirmo lo que hablamos en la portería. Los ruidos que usted reporta en las paredes son las tuberías. Ya vino el plomero dos veces.',
      'Aun así, por razones de salubridad, el tercer piso queda cerrado a partir del 1 de noviembre. A usted la pasamos al quinto mientras se arregla.\n\nLa familia del 302 sube al 402: ya hablé con el señor.\n\nLe pido el favor de no comentar nada con los demás vecinos. La gente se asusta por nada.\n\n— Hernando, administración',
      '(Al respaldo, con otra letra, temblorosa:)\n\nNo eran las tuberías.\nNunca fueron las tuberías.',
    ],
  },
  hoja_301: {
    id: 'hoja_301',
    titulo: 'Hoja de cuaderno, junto a la puerta',
    tipo: 'hoja',
    paginas: [
      '(Una hoja arrancada de un cuaderno de planas, doblada en cuatro. Letra de niño: grande, torcida, apretada contra el renglón.)\n\nSeñora del 301:\n\nUsted oye cuando mi papá se pone bravo. Yo sé porque después usted sube el televisor.\n\nNo le estoy pidiendo nada.\nSolo que no lo prenda tan duro.\n\nAndrés, del 302',
      '(Por detrás, con letra de adulto, una respuesta que nadie terminó:)\n\nMijo, yo no me puedo meter en',
    ],
  },
  hoja_303: {
    id: 'hoja_303',
    titulo: 'Hoja de cuaderno, en el escritorio',
    tipo: 'hoja',
    paginas: [
      '(Otra hoja del mismo cuaderno de planas. La misma letra de niño, grande y torcida. En la esquina, un pasillo largo dibujado con muchas puertas.)\n\nEl de la pared me mide cuando duermo.\nEmpieza por los pies.\n\nDice que cuando esté completo ya no voy a tener que estar aquí.\n\nYo le dije que sí.',
      '(Engrapado atrás, un papelito con letra de adulto:)\n\nSe le cayó al niño del 302 en el ascensor. No sé a quién devolvérsela.\n\nAl papá no.',
    ],
  },
  libreta_302: {
    id: 'libreta_302',
    titulo: 'Cuaderno de Andrés',
    tipo: 'diario',
    accion: 'Leer el cuaderno',
    paginas: [
      '(Un cuaderno de planas. Le arrancaron hojas: quedan los bordes. Letra de niño: grande, torcida, apretada contra el renglón.)\n\nMi casa es el 302.\nMi papá trabaja de noche y duerme de día. En el día no se puede hacer ruido.\n\nEn la noche tampoco.',
      'En la pared de mi cuarto vive uno.\nYo no le tengo miedo. Él no grita.\n\nCuando mi papá se pone bravo, el de la pared se queda quietico, oyendo. Después golpea tres veces, despacio, para que yo sepa que oyó.',
      'Le escribí a la señora del 301 y le pasé la hoja por debajo de la puerta. No me contestó.\n\nOtra hoja se me cayó en el ascensor. Ojalá nadie la lea.\n\nYa no hablo en la casa. No hace falta.\nÉl habla por mí. Le sale igualito.',
      '(La última página es una plana: la misma frase una y otra vez, con una letra pareja, muy cuidada. Ningún renglón se sale.)\n\nHOY MI MAMÁ ME MIDIÓ EN LA PARED DEL CUARTO\nHOY MI MAMÁ ME MIDIÓ EN LA PARED DEL CUARTO\nHOY MI MAMÁ ME MIDIÓ EN LA PARED DEL CUARTO\nHOY MI MAMÁ ME MIDIÓ EN LA PARED DEL CUARTO\n\nOTRAUC LED DERAP AL NE ÓIDIM EM ÁMAM IM YOH',
    ],
  },
  carta_madre_302: {
    id: 'carta_madre_302',
    titulo: 'Carta a la doctora, sin enviar',
    tipo: 'carta',
    paginas: [
      'Doctora Mantilla:\n\nLe escribo porque en la cita no me dejan hablar. Andrés lleva tres semanas sin dormir. Dice que alguien en la pared lo mide.\n\nSu papá dice que son mañas.',
      'Anoche lo encontré parado contra la pared del cuarto, derechito, como cuando lo mido. Le pregunté qué hacía.\n\nMe contestó desde la cama.\n\nLa cama estaba a cuatro pasos, doctora. Él estaba ahí, contra la pared. Y la voz salió de la cama.',
      'Nos vamos a vivir al cuarto piso. Su papá dice que allá se le quitan las mañas.\n\nYo no sé a quién más decirle.\n\n— Luz Dary, mamá de Andrés\n\n(Dentro de un sobre sin estampilla. Nunca se envió.)',
    ],
  },
};
