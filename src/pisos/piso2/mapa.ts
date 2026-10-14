// El Piso 2 del Edificio Almendros (P2-guion). Mismo esqueleto que el 3 y el 4: la escalera en la misma columna, el
// pasillo en la misma fila, la cabina del ascensor en la misma celda. El 202 está debajo del 302 de Andrés.
// Es el piso de Hernando, el administrador: la oficina de la administración en el 201 y su apartamento en el 202,
// justo debajo de los ruidos que él contestaba con "son las tuberías". La escalera que sigue bajando está tapiada.
// La luz: el circuito general está muerto, como arriba, salvo el 202, que Hernando conectó por su cuenta: él no
// quería oír, pero sí ver. En la oficina, un tubo que titila.
import type { DefMapa } from '../../mundo/datos/TiposMapa';

export const MAPA_PISO_2: DefMapa = {
  nombre: 'Edificio Almendros — Piso 2',
  rejilla: [
    //        1111111111222222222233
    //34567890123456789012345678901
    '################################', // 0
    '#####....#...###.....#.....#####', // 1
    '#####....#...###.....#.....#####', // 2
    '#####....#...###.....#.....#####', // 3
    '######P####P######P#####P#######', // 4
    '#####........###...........#####', // 5
    '#####........###...........#####', // 6
    '#####........###...........#####', // 7
    '#...#........###...........##..#', // 8
    '#...###P############P########..#', // 9
    '#...........................#..#', // 10  (servicio tapiado: sin puerta, celda sellada)
    '#EEE#A########P##############..#', // 11  (A: la cabina del ascensor)
    '#EEE####.............########..#', // 12
    '########.............###########', // 13
    '########.............###########', // 14
    '########.............###########', // 15
    '##########P#######P#############', // 16
    '########......#......###########', // 17
    '########......#......###########', // 18
    '################################', // 19
  ],

  habitaciones: [
    { id: 'escalera', nombre: 'Escalera', x0: 1, y0: 8, x1: 3, y1: 12, reverb: 'escalera', pared: 'concreto', piso: 'concreto' },
    { id: 'pasillo', nombre: 'Pasillo', x0: 4, y0: 10, x1: 27, y1: 10, reverb: 'pasillo', pared: 'concreto', piso: 'granito', paso: true },
    // 201: la administración. La sala es la oficina; el cuarto del fondo, el archivo, ya forrado: ahí empezó Hernando.
    { id: 'oficina201', nombre: 'Oficina de la administración', x0: 5, y0: 5, x1: 12, y1: 8, reverb: 'sala', pared: 'pintura', piso: 'granito', apartamento: '201' },
    { id: 'archivo201', nombre: 'Archivo del 201', x0: 5, y0: 1, x1: 8, y1: 3, reverb: 'acolchado', pared: 'acolchado', piso: 'granito', apartamento: '201' },
    { id: 'bano201', nombre: 'Baño del 201', x0: 10, y0: 1, x1: 12, y1: 3, reverb: 'bano', pared: 'azulejo', piso: 'azulejo', apartamento: '201' },
    // 203: sin forrar, como los pisos de arriba. Lo dejaron con prisa.
    { id: 'sala203', nombre: 'Sala del 203', x0: 16, y0: 5, x1: 26, y1: 8, reverb: 'sala', pared: 'papel', piso: 'parque', apartamento: '203' },
    { id: 'cocina203', nombre: 'Cocina del 203', x0: 16, y0: 1, x1: 20, y1: 3, reverb: 'bano', pared: 'azulejo', piso: 'azulejo', apartamento: '203' },
    { id: 'dormitorio203', nombre: 'Dormitorio del 203', x0: 22, y0: 1, x1: 26, y1: 3, reverb: 'habitacion', pared: 'papel', piso: 'parque', apartamento: '203' },
    // 202: el apartamento de Hernando, debajo del 302, forrado entero con colchones: el cuarto sordo. Adentro no se
    // oye nada de afuera y afuera no se oye nada de adentro (ver mundo/Aislamiento.ts). Aquí se graba (la sala).
    { id: 'sala202', nombre: 'Sala del 202', x0: 8, y0: 12, x1: 20, y1: 15, reverb: 'acolchado', pared: 'acolchado', piso: 'parque', apartamento: '202' },
    { id: 'dormitorio202', nombre: 'Dormitorio del 202', x0: 8, y0: 17, x1: 13, y1: 18, reverb: 'acolchado', pared: 'acolchado', piso: 'parque', apartamento: '202' },
    { id: 'cuarto202', nombre: 'Cuarto pequeño del 202', x0: 15, y0: 17, x1: 20, y1: 18, reverb: 'acolchado', pared: 'acolchado', piso: 'parque', apartamento: '202' },
    // El cuarto de servicio existe pero está tapiado, como en el 3.
    { id: 'servicio', nombre: 'Cuarto de servicio', x0: 29, y0: 8, x1: 30, y1: 12, reverb: 'ducto', pared: 'concreto', piso: 'concreto' },
    // La cabina del ascensor, en la misma celda que la del 3 y la del 4: es la misma cabina.
    { id: 'ascensor', nombre: 'Ascensor', x0: 5, y0: 11, x1: 5, y1: 11, reverb: 'bano', pared: 'concreto', piso: 'concreto' },
  ],

  puertas: [
    // Entradas desde el pasillo (las que llevan la placa).
    { id: 'p201', x: 7, y: 9, abreHacia: 'n' },
    { id: 'p203', x: 20, y: 9, abreHacia: 'n' },
    { id: 'p202', x: 14, y: 11, abreHacia: 's' },
    // Interiores del 201.
    { id: 'pArchivo201', x: 6, y: 4, abreHacia: 'n' },
    { id: 'pBano201', x: 11, y: 4, abreHacia: 'n' },
    // Interiores del 203.
    { id: 'pCocina203', x: 18, y: 4, abreHacia: 'n' },
    { id: 'pDorm203', x: 24, y: 4, abreHacia: 'n' },
    // Interiores del 202.
    { id: 'pDorm202', x: 10, y: 16, abreHacia: 's' },
    { id: 'pCuarto202', x: 18, y: 16, abreHacia: 's' },
  ],

  lamparas: [
    // La emergencia de la escalera, como en el 3 (batería, no circuito general).
    { id: 'emergencia', x: 2.5, y: 8.15, altura: 2.3, tipo: 'emergencia', circuito: 'emergencia', estado: 'encendida', color: 0xff3322, intensidad: 1.3 },
    { id: 'pasillo1', x: 6.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo2', x: 11.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo3', x: 16.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo4', x: 21.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo5', x: 26.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    // La oficina: un tubo viejo que titila sobre el escritorio.
    { id: 'lampara201', x: 8.5, y: 6.5, tipo: 'tubo', circuito: 'oficina', estado: 'parpadeante', intensidad: 0.8 },
    { id: 'lampara203', x: 21.5, y: 6.5, tipo: 'bombillo', circuito: 'general', estado: 'rota' },
    // El 202 tiene luz: Hernando la conectó por su cuenta. Cálida, de bombillo, en la sala y en el dormitorio.
    { id: 'lampara202', x: 14.5, y: 13.5, tipo: 'bombillo', circuito: 'hernando', estado: 'encendida', color: 0xffc98a, intensidad: 0.9 },
    { id: 'lamparaDorm202', x: 10.5, y: 17.5, tipo: 'bombillo', circuito: 'hernando', estado: 'encendida', color: 0xffc98a, intensidad: 0.7 },
    // El tubo de la cabina del ascensor: titila, como en el 3.
    { id: 'luzAscensor', x: 5.5, y: 11.5, tipo: 'tubo', circuito: 'ascensor', estado: 'parpadeante', color: 0xe4ecff, intensidad: 1.1 },
  ],

  muebles: [
    // Escalera
    { tipo: 'caja', x: 1.5, y: 8.6 },
    // Pasillo: más ordenado que el 3 (era el piso de la administración). Siempre pegado a un muro y lejos de las puertas.
    { tipo: 'bolsa', x: 24.2, y: 10.22 },
    { tipo: 'caja', x: 27.6, y: 10.72, rot: 15 },
    // Oficina 201: el escritorio de Hernando contra el muro del fondo, el estante de las carpetas y un sillón de espera.
    { tipo: 'escritorio', x: 8.5, y: 5.45 },
    { tipo: 'silla', x: 8.5, y: 6.5, rot: 180 },
    { tipo: 'estante', x: 12.45, y: 6.2, rot: -90 },
    { tipo: 'sillon', x: 5.6, y: 7.6, rot: 90 },
    // Archivo 201: cajas de papeles.
    { tipo: 'estante', x: 5.5, y: 1.5, rot: 90 },
    { tipo: 'caja', x: 7.6, y: 1.4, rot: 12 },
    { tipo: 'caja', x: 7.9, y: 2.6, rot: -8 },
    // Baño 201
    { tipo: 'tina', x: 11.5, y: 1.5 },
    // 203: lo que quedó al irse con prisa.
    { tipo: 'sofa', x: 22, y: 8.4 },
    { tipo: 'mesa', x: 18.6, y: 6.2 },
    { tipo: 'caja', x: 25.6, y: 5.6, rot: 25 },
    { tipo: 'nevera', x: 16.5, y: 1.45 },
    { tipo: 'mesa', x: 19.2, y: 2.4 },
    { tipo: 'cama', x: 25.4, y: 1.9, rot: 90 },
    { tipo: 'mesita', x: 23.0, y: 1.3 },
    // 202: la sala de Hernando, con el televisor de espaldas a la pared del 302.
    { tipo: 'sofa', x: 10, y: 12.4 },
    { tipo: 'sillon', x: 8.6, y: 14.6, rot: 90 },
    { tipo: 'mesa', x: 17.5, y: 14.2 },
    { tipo: 'televisor', x: 19.5, y: 12.6 },
    // Dormitorio 202
    { tipo: 'cama', x: 8.9, y: 17.8, rot: 90 },
    { tipo: 'mesita', x: 12.6, y: 17.3 },
    // Cuarto 202: donde guardaba lo que compraba para forrar.
    { tipo: 'caja', x: 16, y: 17.4 },
    { tipo: 'caja', x: 19.3, y: 18.4, rot: 20 },
  ],

  // Las alturas son las de cada superficie (escritorio 0.76 m, mesita 0.54 m) más un milímetro.
  interactuables: [
    // 201: el libro de quejas en el escritorio y la lista de las llaves pegada junto a la puerta, mirando a la oficina
    // (la del ascensor, tachada).
    { tipo: 'documento', id: 'docLibroQuejas', documento: 'libro_quejas', x: 8.3, y: 5.4, altura: 0.761 },
    { tipo: 'documento', id: 'docListaLlaves', documento: 'lista_llaves', x: 8.4, y: 8.98, altura: 1.4, rot: 180 },
    // 202: el cuaderno de Hernando en la mesita del dormitorio.
    { tipo: 'documento', id: 'docCuadernoHernando', documento: 'cuaderno_hernando', x: 12.6, y: 17.3, altura: 0.541 },
    // La X en el centro de la sala del 202: aquí se graba el cuarto sordo (P2-guion).
    { tipo: 'medicion', id: 'medir202', apartamento: '202', x: 13.5, y: 13.6, accion: 'Grabar el cuarto sordo (quédate quieto)' },
    // La llave de servicio: aparece al terminar la cinta (lo que sonó a metal, en el rincón de la sala).
    { tipo: 'recogible', id: 'llaveServicio', objeto: 'llave_servicio', x: 20.55, y: 15.55, altura: 0.01, aparece: 'cinta:202' },
    // La radio de Hernando, sobre la caja del fondo del pasillo: "la dejé a todo volumen en el pasillo, para que crea
    // que estoy allá". Muerta; el director la puede encender (y atraerla lejos del 202).
    { tipo: 'radio', id: 'radioPasillo', x: 27.6, y: 10.72, altura: 0.521, rot: -90 },
    // 203: la carta que la vecina no alcanzó a mandar, en la mesa de la sala (opcional: no la pide ningún objetivo).
    { tipo: 'documento', id: 'docCarta203', documento: 'carta_203', x: 18.4, y: 6.1, altura: 0.781 },
    // Pilas: en la mesa de la cocina del 203 y en una caja del archivo del 201.
    { tipo: 'recogible', id: 'pilas1', objeto: 'pilas', x: 19.2, y: 2.4, altura: 0.761 },
    { tipo: 'recogible', id: 'pilas2', objeto: 'pilas', x: 8.55, y: 2.0, altura: 0.003 },
  ],

  puntosControl: {
    escalera: { x: 2.2, y: 10.5, angulo: -90 },
    // En la oficina, mirando el escritorio.
    oficina201: { x: 8.5, y: 7.4, angulo: 0 },
    // En la sala del 202, junto a la X, mirando hacia el rincón de la llave.
    sala202: { x: 12.4, y: 14.4, angulo: -90 },
  },

  guaridaEntidad: { x: 14, y: 4.5 },

  viento: { x: 2.5, y: 12 },
};
