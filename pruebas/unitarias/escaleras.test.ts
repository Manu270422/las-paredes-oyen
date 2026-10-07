// Las escaleras que llevan a otro piso: el tramo pide el viaje (o suena cerrado), y los enlaces de todo el
// catálogo están bien hechos (arrancan al borde de un hueco, llevan a un piso que existe, a un punto de control
// que ese piso tiene, y se puede volver). Un enlace roto lo descubre esta prueba, no un jugador en la escalera.
import { describe, expect, it } from 'vitest';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { Progreso } from '../../src/narrativa/Progreso';
import { TramoEscalera } from '../../src/interaccion/objetos/TramoEscalera';
import { escalerasSinVuelta, problemasDeEscaleras } from '../../src/pisos/EnlacesEscalera';
import { PISOS } from '../../src/pisos/catalogo';
import type { DefEscaleraPiso, PaquetePiso } from '../../src/pisos/TiposPiso';
import { esArranqueDeTramo } from '../../src/mundo/HuecoEscalera';
import { Rejilla } from '../../src/mundo/Rejilla';
import { PISO_DE_PRUEBA } from '../recorridos/pisoDePrueba';
import { crearContextoFalso } from './contextoFalso';

const BAJADA: DefEscaleraPiso = { id: 'bajada', hacia: 'abajo', llegada: 'descanso', x: 1.5, y: 10.8, texto: 'Bajar' };

function tramo(def: DefEscaleraPiso) {
  const falso = crearContextoFalso();
  const viajes: Array<[string, string]> = [];
  const subtitulos: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  const progreso = new Progreso(falso.bus, [], { directorDesde: 'x', despiertaCon: 'x', imitacionCompletaCon: 'y' });
  const viaje = { cambiarDePiso: (hacia: string, llegada: string) => viajes.push([hacia, llegada]) };
  // La criatura: solo importa en qué estado está (la prueba la pone a cazar o a las paredes).
  const entidad: { estado: string | null } = { estado: 'paredes' };
  const ctx = { ...falso.ctx, progreso, viaje, entidad } as unknown as ContextoJuego;
  return { t: new TramoEscalera(def), ctx, progreso, viajes, subtitulos, entidad, sonidos: falso.sonidos, ruidos: falso.ruidos };
}

describe('TramoEscalera', () => {
  it('dice su texto y queda a la altura de la cintura sobre su punto (en metros)', () => {
    const { t } = tramo(BAJADA);
    expect(t.texto()).toBe('Bajar');
    expect(t.objeto.position.toArray().map((n) => Math.round(n * 100) / 100)).toEqual([1.95, 0.9, 14.04]);
    expect(t.objeto.userData.interactuable, 'el rayo de la mirada sabe de quién es la zona').toBe(t);
  });

  it('abierto: pide el viaje al piso y al punto de llegada que declara', () => {
    const { t, ctx, viajes, sonidos } = tramo(BAJADA);
    t.interactuar(ctx);
    expect(viajes).toEqual([['abajo', 'descanso']]);
    expect(sonidos).toEqual([]);
  });

  it('cerrado: suena la cerradura, lo dice y hace ruido (la criatura lo oye), y no viaja; con su bandera, sí', () => {
    const { t, ctx, progreso, viajes, subtitulos, sonidos, ruidos } = tramo({ ...BAJADA, requiere: 'abierta:reja', cerrada: 'La reja tiene una cadena.' });
    t.interactuar(ctx);
    expect(viajes).toEqual([]);
    expect(sonidos).toEqual(['cerradura']);
    expect(subtitulos).toEqual(['La reja tiene una cadena.']);
    expect(ruidos.map((r) => r.causa)).toEqual(['puerta']);
    progreso.marcar('abierta:reja');
    t.interactuar(ctx);
    expect(viajes).toEqual([['abajo', 'descanso']]);
  });

  it('mientras ella caza no es una salida: la cadena se traba (suena, lo dice, hace ruido) y no viaja; al dejar de cazar, sí', () => {
    const { t, ctx, viajes, subtitulos, sonidos, ruidos, entidad } = tramo(BAJADA);
    entidad.estado = 'cazando';
    t.interactuar(ctx);
    expect(viajes).toEqual([]);
    expect(sonidos).toEqual(['cerradura']);
    expect(subtitulos).toEqual(['[La cadena se traba]']);
    expect(ruidos.map((r) => r.causa)).toEqual(['puerta']);
    entidad.estado = 'acechando';
    t.interactuar(ctx);
    expect(viajes, 'acechar no es cazar: la escalera responde').toEqual([['abajo', 'descanso']]);
  });

  it('si pide un objeto, basta tenerlo en el bolsillo aunque lo haya tomado en otro piso (la bandera se quedó allá)', () => {
    const { t, ctx, progreso, viajes } = tramo({ ...BAJADA, requiere: 'objeto:llave', cerrada: 'Candado.' });
    t.interactuar(ctx);
    expect(viajes, 'sin la llave, no').toEqual([]);
    // Como al llegar de otro piso: el inventario viaja, las banderas del piso de origen no.
    progreso.importar({ banderas: [], inventario: ['llave'], documentos: [] });
    expect(progreso.tiene('objeto:llave'), 'la bandera no está en este piso').toBe(false);
    t.interactuar(ctx);
    expect(viajes).toEqual([['abajo', 'descanso']]);
  });

  it('en caza se traba antes de mirar si está cerrado (no da pistas de la llave mientras huyes)', () => {
    const { t, ctx, subtitulos, entidad } = tramo({ ...BAJADA, requiere: 'abierta:reja', cerrada: 'La reja tiene una cadena.' });
    entidad.estado = 'cazando';
    t.interactuar(ctx);
    expect(subtitulos).toEqual(['[La cadena se traba]']);
  });
});

describe('esArranqueDeTramo', () => {
  //  0123
  // 0####
  // 1#..#
  // 2#..#
  // 3#EE#
  // 4#EE#
  // 5####
  const r = new Rejilla(['####', '#..#', '#..#', '#EE#', '#EE#', '####']);

  it('solo en una celda transitable pegada de lado a un hueco (la boca)', () => {
    expect([esArranqueDeTramo(r, 1, 2), esArranqueDeTramo(r, 2, 2)]).toEqual([true, true]);
    expect(esArranqueDeTramo(r, 1, 1), 'lejos del hueco').toBe(false);
    expect(esArranqueDeTramo(r, 1, 3), 'dentro del hueco (ahí no hay piso)').toBe(false);
    expect(esArranqueDeTramo(r, 0, 3), 'en el muro').toBe(false);
  });
});

describe.each(PISOS.map((p) => [p.id, p] as const))('Escaleras de %s', (_id, piso) => {
  it('cada tramo arranca al borde de un hueco y lleva a un punto de control de un piso del catálogo', () => {
    expect(problemasDeEscaleras(piso, PISOS)).toEqual([]);
  });
});

describe('Escaleras del catálogo', () => {
  it('ninguna es de ida sola: desde el piso al que bajo puedo volver a subir', () => {
    expect(escalerasSinVuelta(PISOS)).toEqual([]);
  });
});

describe('Escaleras del piso de prueba (el de cambioPiso.spec.ts)', () => {
  it('su escalera de vuelta al Piso 4 está bien enlazada (si no, el recorrido probaría un enlace roto)', () => {
    expect(problemasDeEscaleras(PISO_DE_PRUEBA, PISOS)).toEqual([]);
  });

  it('un enlace roto se reporta con lo que tiene mal, uno por uno', () => {
    const roto: PaquetePiso = {
      ...PISO_DE_PRUEBA,
      escaleras: [
        { id: 'subida', hacia: 'piso4', llegada: 'escalera', x: 0.5, y: 0.5, texto: 'En el muro' },
        { id: 'subida', hacia: 'piso99', llegada: 'escalera', x: 3.5, y: 10.8, texto: 'A ninguna parte' },
        { id: 'otra', hacia: 'piso4', llegada: 'azotea', x: 2.5, y: 10.8, texto: 'Sin punto' },
        { id: 'misma', hacia: 'pruebaAbajo', llegada: 'escalera', x: 1.5, y: 10.8, texto: 'Al mismo piso' },
      ],
    };
    expect(problemasDeEscaleras(roto, PISOS)).toEqual([
      'pruebaAbajo/subida: (0.5, 0.5) no es una celda transitable al borde de un hueco de escalera',
      'pruebaAbajo/subida: el id se repite en el piso',
      'pruebaAbajo/subida: lleva a "piso99", que no está en el catálogo',
      'pruebaAbajo/otra: "piso4" no tiene el punto de control "azotea"',
      'pruebaAbajo/misma: lleva al mismo piso',
    ]);
  });

  it('una escalera de ida sola se reporta (el Piso 4 no tiene ninguna que baje al piso de prueba)', () => {
    expect(escalerasSinVuelta([...PISOS, PISO_DE_PRUEBA])).toEqual(['pruebaAbajo/subida: baja (o sube) a "piso4", pero desde ahí no hay escalera de vuelta']);
  });
});
