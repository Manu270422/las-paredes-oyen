// Aquí está el diseño del vertical slice: Piso 4 del Edificio Almendros.
// Cada carácter de la rejilla es una celda de 1.3 m.
//
// Pensé el piso así:
// - Escalera (oeste): punto de partida, luz de emergencia roja: la única "zona segura". Al sur del
//   descanso se abre el hueco de la escalera (las celdas 'E'): el tramo que baja a la oscuridad está
//   cerrado con una reja y una cadena, y el que sube al 5, tapado con tablas y escombros. Por ahí no se
//   pasa (todavía): las celdas 'E' bloquean como un muro, pero se ve y se oye a través de ellas.
// - Pasillo largo y estrecho: una sola línea de visión, oscuro, sin escapatoria lateral.
// - 401 (norte-oeste): la lámpara está encendida... en un edificio sin luz. Nadie sabe por qué.
// - 403 (norte-este): el estudio del vecino que grababa las paredes.
// - 402 (sur): cerrado con llave. Todos los muebles cubiertos. El final.
// - Cuarto de servicio (este): callejón sin salida con el tablero eléctrico.
// - Entre el 401 y el 403 hay tres celdas de muro macizo: "el hueco",
//   un espacio que no debería existir (reservado para la siguiente fase).
import type { DefMapa } from '../../mundo/datos/TiposMapa';

export const MAPA_PISO_4: DefMapa = {
  nombre: 'Edificio Almendros — Piso 4',
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
    '#...........................P..#', // 10
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
    { id: 'pasillo', nombre: 'Pasillo', x0: 4, y0: 10, x1: 27, y1: 10, reverb: 'pasillo', pared: 'pintura', piso: 'granito', paso: true },
    { id: 'sala401', nombre: 'Sala del 401', x0: 5, y0: 5, x1: 12, y1: 8, reverb: 'sala', pared: 'papel', piso: 'parque', apartamento: '401' },
    { id: 'dormitorio401', nombre: 'Dormitorio del 401', x0: 5, y0: 1, x1: 8, y1: 3, reverb: 'habitacion', pared: 'papel', piso: 'parque', apartamento: '401' },
    { id: 'bano401', nombre: 'Baño del 401', x0: 10, y0: 1, x1: 12, y1: 3, reverb: 'bano', pared: 'azulejo', piso: 'azulejo', apartamento: '401' },
    { id: 'sala403', nombre: 'Sala del 403', x0: 16, y0: 5, x1: 26, y1: 8, reverb: 'sala', pared: 'papel', piso: 'parque', apartamento: '403' },
    { id: 'cocina403', nombre: 'Cocina del 403', x0: 16, y0: 1, x1: 20, y1: 3, reverb: 'bano', pared: 'azulejo', piso: 'azulejo', apartamento: '403' },
    { id: 'estudio403', nombre: 'Estudio del 403', x0: 22, y0: 1, x1: 26, y1: 3, reverb: 'habitacion', pared: 'papel', piso: 'parque', apartamento: '403' },
    { id: 'sala402', nombre: 'Sala del 402', x0: 8, y0: 12, x1: 20, y1: 15, reverb: 'sala', pared: 'papel', piso: 'parque', apartamento: '402' },
    { id: 'dormitorio402', nombre: 'Dormitorio del 402', x0: 8, y0: 17, x1: 13, y1: 18, reverb: 'habitacion', pared: 'papel', piso: 'parque', apartamento: '402' },
    { id: 'cuarto402', nombre: 'Cuarto pequeño del 402', x0: 15, y0: 17, x1: 20, y1: 18, reverb: 'habitacion', pared: 'pintura', piso: 'parque', apartamento: '402' },
    { id: 'servicio', nombre: 'Cuarto de servicio', x0: 29, y0: 8, x1: 30, y1: 12, reverb: 'ducto', pared: 'concreto', piso: 'concreto' },
  ],

  puertas: [
    { id: 'p401', x: 7, y: 9, abreHacia: 'n' },
    { id: 'p403', x: 20, y: 9, abreHacia: 'n' },
    { id: 'p402', x: 14, y: 11, abreHacia: 's', llave: 'llave_402' },
    { id: 'pServicio', x: 28, y: 10, abreHacia: 'e' },
    { id: 'pDormitorio401', x: 6, y: 4, abreHacia: 'n', abierta: true },
    { id: 'pBano401', x: 11, y: 4, abreHacia: 'n' },
    { id: 'pCocina403', x: 18, y: 4, abreHacia: 'n', abierta: true },
    { id: 'pEstudio403', x: 24, y: 4, abreHacia: 'n' },
    { id: 'pDormitorio402', x: 10, y: 16, abreHacia: 's' },
    { id: 'pCuarto402', x: 18, y: 16, abreHacia: 's' },
  ],

  lamparas: [
    // La luz de emergencia de la escalera funciona con batería: la única luz "segura".
    { id: 'emergencia', x: 2.5, y: 8.15, altura: 2.3, tipo: 'emergencia', circuito: 'emergencia', estado: 'encendida', color: 0xff3322, intensidad: 1.3 },
    { id: 'pasillo1', x: 6.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'apagada' },
    { id: 'pasillo2', x: 11.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'apagada' },
    { id: 'pasillo3', x: 16.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'apagada' },
    { id: 'pasillo4', x: 21.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'apagada' },
    { id: 'pasillo5', x: 26.5, y: 10.5, tipo: 'tubo', circuito: 'general', estado: 'apagada' },
    // Esta lámpara del 401 está encendida sin que haya luz en el edificio.
    { id: 'lampara401', x: 8.5, y: 6.5, tipo: 'bombillo', circuito: 'fantasma', estado: 'parpadeante', color: 0xffc98a, intensidad: 1.6 },
    { id: 'lampara403', x: 21.5, y: 6.5, tipo: 'bombillo', circuito: 'general', estado: 'apagada' },
    { id: 'lamparaEstudio', x: 24.5, y: 2.2, tipo: 'bombillo', circuito: 'general', estado: 'apagada' },
    { id: 'lampara402', x: 14.5, y: 13.5, tipo: 'bombillo', circuito: 'general', estado: 'rota' },
    { id: 'lamparaServicio', x: 29.9, y: 10.5, tipo: 'bombillo', circuito: 'general', estado: 'apagada', color: 0xd8e4ff },
  ],

  muebles: [
    // Escalera
    // (La baranda del hueco ya no es un mueble: la arma el constructor de la escalera en el borde.)
    { tipo: 'caja', x: 1.5, y: 8.6 },
    // Pasillo
    { tipo: 'bolsa', x: 26.7, y: 10.25 },
    { tipo: 'bolsa', x: 17.3, y: 10.75, rot: 40 },
    // Sala 401
    // El sofá va al ESTE de la puerta: en x 6.9 tapaba el vano (dejaba 23 cm de paso y el
    // jugador mide 56 cm) y el 401 era imposible de entrar. Aquí queda detrás de la X de medición.
    { tipo: 'sofa', x: 9.4, y: 8.4, cubierto: true },
    { tipo: 'mesa', x: 7.4, y: 6.1 },
    { tipo: 'silla', x: 10.6, y: 6.1, cubierto: true, id: 'silla401', movible: true },
    { tipo: 'armario', x: 12.45, y: 5.5, rot: -90, cubierto: true },
    { tipo: 'cuadro', x: 9, y: 5.02 },
    // Dormitorio 401
    { tipo: 'cama', x: 6.3, y: 1.9, rot: 90 },
    { tipo: 'mesita', x: 8.5, y: 1.3 },
    { tipo: 'armario', x: 8.55, y: 3.0, rot: -90 },
    // Baño 401
    { tipo: 'tina', x: 11.5, y: 1.5 },
    // Sala 403
    { tipo: 'caja', x: 16.6, y: 5.6 },
    { tipo: 'caja', x: 17.4, y: 5.5, rot: 15 },
    { tipo: 'caja', x: 16.6, y: 6.5, rot: -10 },
    { tipo: 'sofa', x: 22, y: 8.4, cubierto: true },
    { tipo: 'mesa', x: 25.4, y: 6, cubierto: true },
    // Cocina 403
    { tipo: 'nevera', x: 16.5, y: 1.45 },
    { tipo: 'mesa', x: 19.2, y: 2.4 },
    // Estudio 403
    { tipo: 'escritorio', x: 24.5, y: 1.45 },
    { tipo: 'silla', x: 24.5, y: 2.5, rot: 180 },
    { tipo: 'estante', x: 26.55, y: 2.5, rot: -90 },
    // Sala 402: todo cubierto. Una de las sábanas tiene forma de persona.
    { tipo: 'sofa', x: 10, y: 12.4, cubierto: true },
    { tipo: 'sillon', x: 8.6, y: 14, rot: 90, cubierto: true },
    { tipo: 'mesa', x: 12.5, y: 14.2, cubierto: true },
    { tipo: 'televisor', x: 19.5, y: 12.6, cubierto: true },
    { tipo: 'figura', x: 17.5, y: 14.6, rot: 200, id: 'figura402', movible: true, cubierto: true },
    // Dormitorio 402
    // La cama con la cabecera contra la pared oeste: en x 9.6 invadía la entrada (8 cm de holgura).
    { tipo: 'cama', x: 8.9, y: 17.8, rot: 90, cubierto: true },
    { tipo: 'mesita', x: 12.6, y: 17.3 },
    // Cuarto 402: una silla sola mirando la pared.
    { tipo: 'silla', x: 18.2, y: 18.4, rot: 0, id: 'sillaCuarto402', movible: true },
    // Cuarto de servicio
    { tipo: 'tuberia', x: 29.2, y: 8.2 },
    { tipo: 'tuberia', x: 29.5, y: 8.2 },
    { tipo: 'tuberia', x: 29.2, y: 12.8 },
  ],

  interactuables: [
    { tipo: 'documento', id: 'docOrden', documento: 'orden_trabajo', x: 1.5, y: 8.6, altura: 0.56 },
    { tipo: 'documento', id: 'docDiario', documento: 'diario_rosalba', x: 8.5, y: 1.3, altura: 0.56 },
    { tipo: 'documento', id: 'docNevera', documento: 'nota_nevera', x: 16.5, y: 1.72, altura: 1.35 },
    { tipo: 'documento', id: 'docCinta403', documento: 'cinta_403', x: 24.9, y: 1.35, altura: 0.78 },
    { tipo: 'documento', id: 'docCarta402', documento: 'carta_402', x: 12.6, y: 17.3, altura: 0.56 },
    { tipo: 'recogible', id: 'llave402', objeto: 'llave_402', x: 24.1, y: 1.4, altura: 0.78 },
    { tipo: 'recogible', id: 'pilas1', objeto: 'pilas', x: 7.4, y: 6.1, altura: 0.76 },
    { tipo: 'recogible', id: 'pilas2', objeto: 'pilas', x: 30.3, y: 12.4, altura: 0.02 },
    { tipo: 'recogible', id: 'pilas3', objeto: 'pilas', x: 19.2, y: 2.4, altura: 0.76 },
    { tipo: 'medicion', id: 'medir401', apartamento: '401', x: 9.5, y: 7.2 },
    { tipo: 'medicion', id: 'medir403', apartamento: '403', x: 21.5, y: 6.8 },
    { tipo: 'medicion', id: 'medir402', apartamento: '402', x: 14.5, y: 14.3 },
    { tipo: 'tablero', id: 'tablero', bandera: 'tablero_activado', x: 30.93, y: 9.5, altura: 1.45, rot: -90 },
    { tipo: 'radio', id: 'radio401', x: 7.1, y: 6.0, altura: 0.76, rot: 20 },
  ],

  puntosControl: {
    escalera: { x: 2.2, y: 10.5, angulo: -90 },
    sala401: { x: 9.5, y: 7.6, angulo: 180 },
    sala403: { x: 21.5, y: 7.2, angulo: 180 },
    servicio: { x: 29.9, y: 10.5, angulo: 90 },
    estudio403: { x: 24.5, y: 3.3, angulo: 180 },
  },

  guaridaEntidad: { x: 14, y: 4.5 },

  // El viento sube desde abajo por el hueco de la escalera (en medio del pozo, no en el borde).
  viento: { x: 2.5, y: 12 },
};
