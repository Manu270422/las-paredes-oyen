// El Piso 1 del Edificio Almendros (P1-guion): la planta baja. El primer piso que no repite el esqueleto de los
// apartamentos: el vestíbulo de granito, la portería de don Aurelio, su cuarto detrás y el cuarto de contadores. La
// escalera y la cabina del ascensor están en las mismas celdas que arriba (la cabina es una sola). La escalera no
// sirve: hacia arriba la taparon con tablas y escombros, y hacia abajo (el sótano) la reja no tiene llave. La salida
// es la puerta principal, en el muro sur del vestíbulo, con tres cerraduras.
// La luz: el circuito general está muerto. Solo la emergencia de la escalera, la lámpara de la portería (titila) y,
// al llegar, el tubo de la cabina, que se apaga para siempre cuando se abren las puertas.
import type { DefMapa } from '../../mundo/datos/TiposMapa';

export const MAPA_PISO_1: DefMapa = {
  nombre: 'Edificio Almendros — Piso 1',
  rejilla: [
    //        1111111111222222222233
    //34567890123456789012345678901
    '################################', // 0
    '#############......#############', // 1   contadores (13–18)
    '#############......#####......##', // 2   el cuarto de don Aurelio (24–29)
    '#############......#####......##', // 3
    '###############P########......##', // 4
    '#########..............#......##', // 5   el vestíbulo (9–22)
    '#########..............#......##', // 6
    '#########..............###P#####', // 7
    '#...#####..............#.....###', // 8   la portería (24–28)
    '#...#####..............#.....###', // 9
    '#......................P.....###', // 10  el pasillo de la escalera y la cabina (4–8) entra al vestíbulo
    '#EEE#A###..............#.....###', // 11  (A: la cabina del ascensor)
    '#EEE#####..............#.....###', // 12
    '#########..............#########', // 13  en el muro de abajo (y 14), la puerta principal
    '################################', // 14
    '################################', // 15
    '################################', // 16
    '################################', // 17
    '################################', // 18
    '################################', // 19
  ],

  habitaciones: [
    { id: 'escalera', nombre: 'Escalera', x0: 1, y0: 8, x1: 3, y1: 12, reverb: 'escalera', pared: 'concreto', piso: 'concreto' },
    { id: 'pasillo', nombre: 'Pasillo', x0: 4, y0: 10, x1: 8, y1: 10, reverb: 'pasillo', pared: 'pintura', piso: 'granito', paso: true },
    // El vestíbulo: granito y techo alto, todo rebota. Nadie se refugia en un vestíbulo.
    { id: 'vestibulo', nombre: 'Vestíbulo', x0: 9, y0: 5, x1: 22, y1: 13, reverb: 'escalera', pared: 'pintura', piso: 'granito', paso: true },
    { id: 'porteria', nombre: 'Portería', x0: 24, y0: 8, x1: 28, y1: 12, reverb: 'habitacion', pared: 'papel', piso: 'granito' },
    { id: 'cuarto101', nombre: 'Cuarto de don Aurelio', x0: 24, y0: 2, x1: 29, y1: 6, reverb: 'habitacion', pared: 'papel', piso: 'parque' },
    { id: 'contadores', nombre: 'Cuarto de contadores', x0: 13, y0: 1, x1: 18, y1: 3, reverb: 'ducto', pared: 'concreto', piso: 'concreto' },
    // La cabina del ascensor, en la misma celda que en los otros pisos: es la misma cabina.
    { id: 'ascensor', nombre: 'Ascensor', x0: 5, y0: 11, x1: 5, y1: 11, reverb: 'bano', pared: 'concreto', piso: 'concreto' },
  ],

  puertas: [
    { id: 'pContadores', x: 15, y: 4, abreHacia: 'n' },
    { id: 'pPorteria', x: 23, y: 10, abreHacia: 'e' },
    { id: 'pCuarto101', x: 26, y: 7, abreHacia: 'n' },
  ],

  lamparas: [
    { id: 'emergencia', x: 2.5, y: 8.15, altura: 2.3, tipo: 'emergencia', circuito: 'emergencia', estado: 'encendida', color: 0xff3322, intensidad: 1.3 },
    { id: 'vestibulo1', x: 12.5, y: 7.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'vestibulo2', x: 18.5, y: 7.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'vestibulo3', x: 12.5, y: 11.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    { id: 'vestibulo4', x: 18.5, y: 11.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    // La lámpara de la portería: la de don Aurelio, que siguió prendida (titila) cuando todo lo demás se apagó.
    { id: 'lamparaPorteria', x: 26.5, y: 10.5, tipo: 'bombillo', circuito: 'porteria', estado: 'parpadeante', color: 0xffc98a, intensidad: 0.8 },
    { id: 'lampara101', x: 26.5, y: 4.5, tipo: 'bombillo', circuito: 'general', estado: 'rota' },
    { id: 'lamparaContadores', x: 15.5, y: 2.5, tipo: 'tubo', circuito: 'general', estado: 'rota' },
    // El tubo de la cabina: llega titilando y se apaga cuando se abren las puertas (ver el guion).
    { id: 'luzAscensor', x: 5.5, y: 11.5, tipo: 'tubo', circuito: 'ascensor', estado: 'parpadeante', color: 0xe4ecff, intensidad: 1.1 },
  ],

  muebles: [
    { tipo: 'caja', x: 1.5, y: 8.6 },
    // Vestíbulo: los casilleros de los buzones contra el muro de la entrada al pasillo, el sofá de las visitas y
    // los paquetes que nadie recogió.
    { tipo: 'estante', x: 9.45, y: 6.4, rot: 90 },
    { tipo: 'estante', x: 9.45, y: 8.2, rot: 90 },
    { tipo: 'sofa', x: 19.5, y: 5.5 },
    { tipo: 'silla', x: 21.6, y: 9.2, rot: -30 },
    { tipo: 'caja', x: 21.9, y: 12.4, rot: 10 },
    { tipo: 'caja', x: 21.4, y: 12.7, rot: -15 },
    // Portería: el escritorio de don Aurelio contra el muro del fondo (no delante de la puerta de su cuarto, que la
    // taparía), su silla, el televisor chico y el estante de las llaves.
    { tipo: 'escritorio', x: 28.55, y: 9.6, rot: -90 },
    { tipo: 'silla', x: 27.5, y: 9.6, rot: 90 },
    { tipo: 'televisor', x: 28.2, y: 12.4 },
    { tipo: 'estante', x: 24.45, y: 8.7, rot: 90 },
    // El cuarto de don Aurelio: la cama, la mesita, el armario.
    { tipo: 'cama', x: 29.3, y: 3.5, rot: 90 },
    { tipo: 'mesita', x: 29.4, y: 5.5 },
    { tipo: 'armario', x: 24.4, y: 2.6, rot: 90 },
    // Contadores: el estante de los medidores y unas cajas.
    { tipo: 'estante', x: 13.45, y: 2.0, rot: 90 },
    { tipo: 'caja', x: 17.6, y: 1.5 },
    { tipo: 'tuberia', x: 16.2, y: 1.2 },
  ],

  // Las alturas son las de cada superficie (escritorio 0.76 m, mesita 0.54 m, caja 0.52 m, cama 0.6 m) más un poco.
  interactuables: [
    // La portería: el libro de minuta en el escritorio.
    { tipo: 'documento', id: 'docMinuta', documento: 'minuta_aurelio', x: 28.55, y: 9.4, altura: 0.761 },
    // El cuarto de don Aurelio: su nota en la mesita y las llaves (su cinturón) sobre la cama.
    { tipo: 'documento', id: 'docNotaAurelio', documento: 'nota_aurelio', x: 29.4, y: 5.5, altura: 0.541 },
    { tipo: 'recogible', id: 'llavesAurelio', objeto: 'llaves_aurelio', x: 29.2, y: 3.0, altura: 0.62 },
    // Pilas, en una caja de los contadores.
    { tipo: 'recogible', id: 'pilas1', objeto: 'pilas', x: 17.6, y: 1.5, altura: 0.521 },
    // La puerta principal, en el muro sur del vestíbulo, mirando hacia adentro. La última cerradura pide las llaves.
    { tipo: 'salida', id: 'puertaPrincipal', x: 16, y: 13.98, rot: 180, objeto: 'llaves_aurelio', bandera: 'puerta:abierta' },
  ],

  puntosControl: {
    // Afuera de la cabina, mirando el vestíbulo.
    pasillo: { x: 6.6, y: 10.5, angulo: -90 },
    // En la portería, mirando el escritorio.
    porteria: { x: 26.2, y: 10.4, angulo: -90 },
    // Antes de la puerta (con las llaves): en el vestíbulo, mirándola.
    vestibulo: { x: 16, y: 10.8, angulo: 180 },
  },

  guaridaEntidad: { x: 11, y: 2.5 },

  viento: { x: 2.5, y: 12 },
};
