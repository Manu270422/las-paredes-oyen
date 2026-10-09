// El Piso 3 del Edificio Almendros. Mismo esqueleto que el Piso 4 (la escalera en la misma columna, el pasillo
// en la misma fila, los tres apartamentos en los mismos sitios) pero con interiores, texturas y luces distintas.
// El 302 está directamente debajo del 402: la historia de los dos pisos comparte esa geometría.
// Las lámparas arrancan casi todas rotas: el circuito falló antes. Solo la emergencia de la escalera enciende.
import type { DefMapa } from '../../mundo/datos/TiposMapa';

export const MAPA_PISO_3: DefMapa = {
  nombre: 'Edificio Almendros — Piso 3',
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
    '#EEE##########P##############..#', // 11
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
    { id: 'pasillo', nombre: 'Pasillo', x0: 4, y0: 10, x1: 27, y1: 10, reverb: 'pasillo', pared: 'concreto', piso: 'concreto', paso: true },
    { id: 'sala301', nombre: 'Sala del 301', x0: 5, y0: 5, x1: 12, y1: 8, reverb: 'sala', pared: 'pintura', piso: 'parque', apartamento: '301' },
    { id: 'dormitorio301', nombre: 'Dormitorio del 301', x0: 5, y0: 1, x1: 8, y1: 3, reverb: 'habitacion', pared: 'pintura', piso: 'parque', apartamento: '301' },
    { id: 'bano301', nombre: 'Baño del 301', x0: 10, y0: 1, x1: 12, y1: 3, reverb: 'bano', pared: 'azulejo', piso: 'azulejo', apartamento: '301' },
    { id: 'sala303', nombre: 'Sala del 303', x0: 16, y0: 5, x1: 26, y1: 8, reverb: 'sala', pared: 'papel', piso: 'parque', apartamento: '303' },
    { id: 'cocina303', nombre: 'Cocina del 303', x0: 16, y0: 1, x1: 20, y1: 3, reverb: 'bano', pared: 'azulejo', piso: 'azulejo', apartamento: '303' },
    { id: 'estudio303', nombre: 'Estudio del 303', x0: 22, y0: 1, x1: 26, y1: 3, reverb: 'habitacion', pared: 'papel', piso: 'parque', apartamento: '303' },
    { id: 'sala302', nombre: 'Sala del 302', x0: 8, y0: 12, x1: 20, y1: 15, reverb: 'sala', pared: 'azulejo', piso: 'azulejo', apartamento: '302' },
    // El dormitorio lleva papel de colgar, como el del 402 de arriba, no azulejo: ahí la mamá medía a Andrés con
    // lápiz (en azulejo las juntas se comían las rayas, y la pintura del pasillo tiene el zócalo a la altura de las rayas).
    { id: 'dormitorio302', nombre: 'Dormitorio del 302', x0: 8, y0: 17, x1: 13, y1: 18, reverb: 'habitacion', pared: 'papel', piso: 'azulejo', apartamento: '302' },
    { id: 'cuarto302', nombre: 'Cuarto pequeño del 302', x0: 15, y0: 17, x1: 20, y1: 18, reverb: 'habitacion', pared: 'azulejo', piso: 'azulejo', apartamento: '302' },
    // El cuarto de servicio existe pero su puerta está tapiada con muebles: nadie entra.
    { id: 'servicio', nombre: 'Cuarto de servicio', x0: 29, y0: 8, x1: 30, y1: 12, reverb: 'ducto', pared: 'concreto', piso: 'concreto' },
  ],

  puertas: [
    // Entradas de apartamentos desde el pasillo: las que llevan la placa con el número.
    // El pasillo (y:10) conecta con los sectores de arriba (y:9) y de abajo (y:11).
    { id: 'p301', x: 7, y: 9, abreHacia: 'n' },   // pasillo (y:10) → sector 301 (y:8 y arriba)
    { id: 'p303', x: 20, y: 9, abreHacia: 'n' },  // pasillo (y:10) → sector 303 (y:8 y arriba)
    { id: 'p302', x: 14, y: 11, abreHacia: 's' }, // pasillo (y:10) → sala 302 (y:12 y abajo)
    // Puertas interiores del 301: separan la sala de los dormitorios y el baño.
    { id: 'pDorm301', x: 6, y: 4, abreHacia: 'n' },
    { id: 'pBano301', x: 11, y: 4, abreHacia: 'n' },
    // Puertas interiores del 303: separan la sala de la cocina y el estudio.
    { id: 'pCocina303', x: 18, y: 4, abreHacia: 'n' },
    { id: 'pEstudio303', x: 24, y: 4, abreHacia: 'n' },
    // Puertas interiores del 302: separan la sala del dormitorio y el cuarto pequeño.
    { id: 'pDorm302', x: 10, y: 16, abreHacia: 's' },
    { id: 'pCuarto302', x: 18, y: 16, abreHacia: 's' },
  ],

  lamparas: [
    // La única que funciona: la emergencia de la escalera (batería, no circuito general).
    { id: 'emergencia', x: 2.5, y: 8.15, altura: 2.3, tipo: 'emergencia', circuito: 'emergencia', estado: 'encendida', color: 0xff3322, intensidad: 1.3 },
    // El resto está roto: el circuito del Piso 3 falló antes que el del 4.
    { id: 'pasillo1', x: 6.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo2', x: 11.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo3', x: 16.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo4', x: 21.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'pasillo5', x: 26.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'lampara301', x: 8.5, y: 6.5, tipo: 'bombillo', circuito: 'general', estado: 'rota' },
    { id: 'lampara303', x: 21.5, y: 6.5, tipo: 'bombillo', circuito: 'general', estado: 'rota' },
    { id: 'lampara302', x: 14.5, y: 13.5, tipo: 'bombillo', circuito: 'general', estado: 'rota' },
  ],

  muebles: [
    // Escalera
    { tipo: 'caja', x: 1.5, y: 8.6 },
    // Pasillo: más desordenado que el 4, pero siempre pegado a un muro y lejos de las puertas. Una bolsa
    // (60 cm) en medio del pasillo (130 cm) lo cierra para un jugador de 56 cm: en (20.7, 10.5) tapaba el 303
    // y el final del pasillo, y en (14.3, 10.75), la puerta del 302.
    { tipo: 'bolsa', x: 8.5, y: 10.25 },
    { tipo: 'bolsa', x: 12.2, y: 10.8 },
    { tipo: 'bolsa', x: 23.5, y: 10.22, rot: -20 },
    // Contra el muro que tapió el servicio: lo que quedó de la barricada.
    { tipo: 'caja', x: 27.6, y: 10.72, rot: 15 },
    // Sala 301: muebles sin cubrir, alguien vivía aquí.
    { tipo: 'sofa', x: 9.4, y: 8.4 },
    { tipo: 'mesa', x: 7.4, y: 6.1 },
    { tipo: 'silla', x: 10.6, y: 6.1 },
    { tipo: 'armario', x: 12.45, y: 5.5, rot: -90 },
    // Dormitorio 301
    { tipo: 'cama', x: 6.3, y: 1.9, rot: 90 },
    { tipo: 'mesita', x: 8.5, y: 1.3 },
    // Baño 301
    { tipo: 'tina', x: 11.5, y: 1.5 },
    // Sala 303: cajones abiertos, cosas tiradas.
    { tipo: 'caja', x: 17.2, y: 5.5, rot: 10 },
    { tipo: 'sofa', x: 22, y: 8.4 },
    { tipo: 'mesa', x: 25.4, y: 6 },
    // Cocina 303
    { tipo: 'nevera', x: 16.5, y: 1.45 },
    { tipo: 'mesa', x: 19.2, y: 2.4 },
    // Estudio 303
    { tipo: 'escritorio', x: 24.5, y: 1.45 },
    { tipo: 'silla', x: 24.5, y: 2.5, rot: 180 },
    // Sala 302: la misma distribución que el 402, pero sin cubrir y con una silla caída.
    { tipo: 'sofa', x: 10, y: 12.4 },
    { tipo: 'sillon', x: 8.6, y: 14, rot: 90 },
    { tipo: 'mesa', x: 12.5, y: 14.2 },
    { tipo: 'televisor', x: 19.5, y: 12.6 },
    // Dormitorio 302
    { tipo: 'cama', x: 8.9, y: 17.8, rot: 90 },
    { tipo: 'mesita', x: 12.6, y: 17.3 },
    // Cuarto 302: la silla donde Andrés fue medido, fija (no movible).
    { tipo: 'silla', x: 18.2, y: 18.4, rot: 0 },
  ],

  // Las alturas son las de cada superficie (mesa y escritorio 0.76 m, mesita 0.54 m) más un milímetro.
  interactuables: [
    // 301: la carta de la administración en la mesa de la sala, y la hoja de Andrés en el piso junto a la
    // puerta, por donde entró (la vecina empezó a contestarle y no terminó).
    { tipo: 'documento', id: 'docCartaAdmin', documento: 'carta_admin_301', x: 7.6, y: 6.0, altura: 0.761 },
    { tipo: 'documento', id: 'docHoja301', documento: 'hoja_301', x: 7.9, y: 8.55, altura: 0.003, rot: 25 },
    // 303: la hoja que se le cayó en el ascensor, en el escritorio del estudio de quien la recogió.
    { tipo: 'documento', id: 'docHoja303', documento: 'hoja_303', x: 24.2, y: 1.4, altura: 0.761 },
    // 302: el cuaderno en el piso del cuarto, junto a la silla (donde arriba, en el 402, está la llave de la
    // reja); la carta de la mamá en la mesita del dormitorio.
    { tipo: 'documento', id: 'docCuaderno', documento: 'libreta_302', x: 18.9, y: 18.5, altura: 0.002 },
    { tipo: 'documento', id: 'docCartaMadre', documento: 'carta_madre_302', x: 12.6, y: 17.3, altura: 0.541 },
    // 302: lo que se examina. El palo recostado en el muro de las rayas de estatura (la base a 23 cm del muro),
    // el carrito en el piso del dormitorio y el dibujo pegado encima del sofá de la sala.
    { tipo: 'examinable', id: 'exMedidor', examinable: 'medidor_302', x: 13.6, y: 17.18 },
    { tipo: 'examinable', id: 'exCarrito', examinable: 'carrito_302', x: 10.1, y: 17.75 },
    { tipo: 'examinable', id: 'exDibujo', examinable: 'dibujo_302', x: 10.5, y: 12.01, altura: 1.05 },
    // La X de cinta roja en el dormitorio del 302, frente a las rayas de estatura (entre la cama y la mesita): aquí
    // se graba la pared del cuarto de Andrés (P3-guion).
    { tipo: 'medicion', id: 'medir302', apartamento: '302', x: 11.5, y: 17.75 },
    // Dos pilas: en la mesa de la cocina del 303 y en la mesita del dormitorio del 301.
    { tipo: 'recogible', id: 'pilas1', objeto: 'pilas', x: 19.2, y: 2.4, altura: 0.761 },
    { tipo: 'recogible', id: 'pilas2', objeto: 'pilas', x: 8.5, y: 1.3, altura: 0.541 },
  ],

  puntosControl: {
    escalera: { x: 2.2, y: 10.5, angulo: -90 },
    // En el cuarto pequeño del 302, mirando hacia la silla y el cuaderno.
    cuarto302: { x: 16.3, y: 17.5, angulo: -90 },
    // Junto a la X del dormitorio, mirando las rayas: si muero en el pasillo, vuelvo a pocos pasos de él.
    dormitorio302: { x: 11.5, y: 17.4, angulo: 180 },
  },

  guaridaEntidad: { x: 14, y: 4.5 },

  viento: { x: 2.5, y: 12 },
};
