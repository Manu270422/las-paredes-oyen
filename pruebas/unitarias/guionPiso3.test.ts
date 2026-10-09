// La libreta de Andrés: el cuaderno del 302 y las dos hojas que le arrancaron (301 y 303). Leídas las tres, en
// cualquier orden, el guion marca 'imitacion:piso3' (la criatura imita completo) y, de vuelta en el juego,
// suena la reflexión una sola vez. Una partida guardada justo al leer la última se arregla al cargarla.
import { describe, expect, it } from 'vitest';
import { Progreso } from '../../src/narrativa/Progreso';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { PISO_3 } from '../../src/pisos/piso3';
import { CINTA_302, FINAL_PISO_3, GOLPES_FINALES, GuionPiso3, LIBRETA_COMPLETA, PARTES_LIBRETA, REFLEXION_LIBRETA } from '../../src/pisos/piso3/guion';
import { crearContextoFalso } from './contextoFalso';

function armar(leidos: readonly string[] = [], otras: readonly string[] = []) {
  const falso = crearContextoFalso();
  const progreso = new Progreso(falso.bus, PISO_3.objetivos, PISO_3.reglas);
  progreso.importar({ banderas: ['llego:piso3', ...leidos.map((id) => `leyo:${id}`), ...otras], inventario: [], documentos: [...leidos] });
  const subtitulos: string[] = [];
  const banderas: string[] = [];
  const relevantes: string[] = [];
  const acciones: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  falso.bus.on('bandera', (b) => banderas.push(b.nombre));
  falso.bus.on('sonido-relevante', (s) => relevantes.push(s.descripcion));
  // Lo agendado se guarda y corre cuando la prueba lo pide (el guion agenda el apagón, la cinta y el final).
  let agendado: Array<() => void> = [];
  const correrAgendado = () => {
    for (let vuelta = 0; vuelta < 5 && agendado.length; vuelta++) {
      const ahora = agendado;
      agendado = [];
      for (const f of ahora) f();
    }
  };
  const emergencia = { id: 'emergencia', estado: 'encendida', posicion: { x: 3, y: 2.3, z: 10 }, interferir: () => undefined };
  const luces: string[] = [];
  const entidad = {
    estado: 'paredes',
    puedeManifestarse: true,
    donde: null as { x: number; z: number } | null,
    buscarPuntoSalida: () => null,
    manifestar(x: number, z: number) {
      this.donde = { x, z };
    },
    cambiarEstado(e: string) {
      this.estado = e;
    },
  };
  const memoria = { habitacionActual: 'escalera' };
  const ctx = {
    ...falso.ctx,
    piso: PISO_3,
    progreso,
    memoria,
    entidad,
    jugador: { posicion: { x: 14.5 * 1.3, y: 0, z: 10.5 * 1.3 }, yaw: 0 },
    programador: {
      ahora: 0,
      despues: (_t: number, f: () => void) => agendado.push(f),
      secuencia: (lista: Array<[number, () => void]>) => lista.forEach(([, f]) => agendado.push(f)),
    },
    director: { bloquear: () => undefined, activo: true },
    linterna: { forzarApagada: () => undefined },
    grabadora: { captura: { lineas: () => [] } },
    nivel: {
      lamparas: [emergencia],
      aplicarLuzDe: (b: string) => {
        luces.push(b);
        emergencia.estado = 'rota';
      },
    },
  } as unknown as ContextoJuego;
  const anotar = (n: string) => () => acciones.push(n);
  const guion = new GuionPiso3({
    mostrarSusto: anotar('susto'),
    fundido: anotar('fundido'),
    fijarSoloMirar: (a: boolean) => acciones.push(`soloMirar:${a}`),
    terminarPartida: anotar('terminar'),
    despertar: anotar('despertar'),
  });
  guion.conectar(ctx);
  guion.reiniciar(ctx);
  const jugar = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.1) guion.actualizar(0.1, ctx);
  };
  return { ctx, guion, progreso, subtitulos, banderas, relevantes, acciones, luces, entidad, memoria, sonidos: falso.sonidos, correrAgendado, jugar };
}

/** Todas las maneras de ordenar las tres partes. */
function ordenes<T>(lista: readonly T[]): T[][] {
  if (lista.length <= 1) return [[...lista]];
  return lista.flatMap((x, i) => ordenes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [x, ...resto]));
}

describe('La libreta de Andrés (guion del Piso 3)', () => {
  it.each(ordenes(PARTES_LIBRETA).map((o) => [o.join(' → '), o] as const))('leída en el orden %s, se completa con la tercera', (_nombre, orden) => {
    const { progreso } = armar();
    progreso.registrarDocumento(orden[0]);
    progreso.registrarDocumento(orden[1]);
    expect(progreso.tiene(LIBRETA_COMPLETA), 'con dos de tres, todavía no').toBe(false);
    expect(progreso.imitacionCompleta).toBe(false);
    progreso.registrarDocumento(orden[2]);
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(true);
    expect(progreso.imitacionCompleta, 'la regla del paquete apunta a la misma bandera').toBe(true);
  });

  it('otros papeles del piso no la completan', () => {
    const { progreso } = armar(['hoja_301', 'hoja_303']);
    progreso.registrarDocumento('carta_admin_301');
    progreso.registrarDocumento('carta_madre_302');
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(false);
  });

  it('la reflexión sale después, ya jugando (leyendo no corre el tiempo del guion), y una sola vez', () => {
    const { progreso, subtitulos, jugar } = armar(['libreta_302', 'hoja_301']);
    progreso.registrarDocumento('hoja_303');
    expect(subtitulos, 'mientras leo, nada').toEqual([]);
    jugar(0.6);
    expect(subtitulos, 'recién cerrado el lector, todavía no').toEqual([]);
    jugar(1);
    expect(subtitulos).toEqual([REFLEXION_LIBRETA]);
    jugar(30);
    progreso.registrarDocumento('libreta_302');
    jugar(5);
    expect(subtitulos, 'releer no la repite').toEqual([REFLEXION_LIBRETA]);
  });

  it('al cargar una partida con las tres leídas y sin la bandera, la marca en silencio y sin reflexión', () => {
    // Así queda la partida si el punto de control de la última parte se guardó antes de que el guion oyera la bandera.
    const { progreso, subtitulos, banderas, jugar } = armar([...PARTES_LIBRETA]);
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(true);
    expect(banderas, 'cargar no es un hecho nuevo: nada por el bus').toEqual([]);
    jugar(5);
    expect(subtitulos).toEqual([]);
  });

  it('desconectado (me fui a otro piso), ya no escucha', () => {
    const { guion, progreso } = armar(['libreta_302', 'hoja_301']);
    guion.desconectar();
    progreso.registrarDocumento('hoja_303');
    expect(progreso.tiene(LIBRETA_COMPLETA)).toBe(false);
  });
});

describe('La libreta en el paquete del Piso 3', () => {
  it('la regla de la imitación completa es la bandera que marca el guion, y la de un objetivo', () => {
    expect(PISO_3.reglas.imitacionCompletaCon).toBe(LIBRETA_COMPLETA);
    expect(PISO_3.objetivos.map((o) => o.bandera)).toContain(LIBRETA_COMPLETA);
  });

  it('cada parte de la libreta es un documento del piso que está en el mapa', () => {
    const enMapa = new Set(PISO_3.mapa.interactuables.flatMap((i) => (i.tipo === 'documento' && i.documento ? [i.documento] : [])));
    for (const parte of PARTES_LIBRETA) {
      expect(PISO_3.documentos[parte], `${parte} no está en los documentos`).toBeDefined();
      expect(enMapa.has(parte), `${parte} no está en el mapa`).toBe(true);
    }
  });

  it('leer el cuaderno crea el punto de control del cuarto del 302 (también en Difícil)', () => {
    expect(PISO_3.puntosControl['leyo:libreta_302']).toBe('cuarto302');
    expect(PISO_3.puntosControlMayores).toContain('leyo:libreta_302');
  });
});

describe('El guion del Piso 3 (P3-guion)', () => {
  it('a los 8 s de llegar, tres golpes despacio desde la pared del cuarto de Andrés, una sola vez', () => {
    const { relevantes, sonidos, jugar, progreso } = armar();
    jugar(7.5);
    expect(relevantes).toEqual([]);
    jugar(1);
    expect(relevantes).toEqual(['tres golpes, despacio, lejos']);
    expect(sonidos.filter((x) => x === 'golpe')).toHaveLength(3);
    jugar(20);
    expect(relevantes, 'no se repite').toHaveLength(1);
    expect(progreso.tiene('golpe:llegada')).toBe(true);
  });

  it('al juntar la libreta en vivo revienta la luz de la escalera (la del paquete) y el objetivo pasa a grabar la pared', () => {
    const { progreso, luces, relevantes, correrAgendado } = armar(['libreta_302', 'hoja_301'], ['golpe:llegada', 'leyo:carta_admin_301']);
    progreso.registrarDocumento('hoja_303');
    expect(luces, 'todavía no: espera unos segundos').toEqual([]);
    correrAgendado();
    expect(relevantes).toContain('algo revienta, lejos, en la escalera');
    expect(luces).toEqual([LIBRETA_COMPLETA]);
    expect(PISO_3.luzPorBandera[LIBRETA_COMPLETA]?.lamparas).toEqual({ emergencia: 'rota' });
    expect(progreso.objetivoActual()?.id).toBe('grabar');
  });

  it('medir el 302 reproduce su cinta y, al terminar, la marca; el objetivo pasa a volver a la escalera', () => {
    const { progreso, subtitulos, correrAgendado } = armar([...PARTES_LIBRETA], ['golpe:llegada', 'leyo:carta_admin_301']);
    progreso.marcar('medido:302');
    correrAgendado();
    expect(subtitulos.some((x) => x.includes('Hoy mi mamá me midió'))).toBe(true);
    expect(subtitulos.some((x) => x.includes('Ya casi estoy completo'))).toBe(true);
    expect(progreso.tiene(CINTA_302)).toBe(true);
    expect(progreso.objetivoActual()?.id).toBe('huir');
  });

  it('una partida guardada al medir (antes de la cinta) carga con la cinta ya sonada, en silencio', () => {
    const { progreso, banderas } = armar([...PARTES_LIBRETA], ['medido:302', 'golpe:llegada']);
    expect(progreso.tiene(CINTA_302)).toBe(true);
    expect(banderas).toEqual([]);
  });

  it('al volver al pasillo después de la cinta, ella espera entre la escalera y yo, acechando (una vez)', () => {
    const { progreso, entidad, memoria, jugar } = armar([...PARTES_LIBRETA], ['medido:302', CINTA_302, 'golpe:llegada']);
    memoria.habitacionActual = 'sala302';
    jugar(1);
    expect(entidad.donde, 'dentro del 302, todavía no').toBeNull();
    memoria.habitacionActual = 'pasillo';
    jugar(0.2);
    expect(entidad.estado).toBe('acechando');
    expect(entidad.donde!.x, 'hacia la escalera (al oeste)').toBeLessThan(14.5 * 1.3 - 4.5);
    expect(progreso.tiene('pasillo:302')).toBe(true);
  });

  it('en la escalera después de la cinta: solo mirar, tres golpes desde abajo, fundido y fin de la partida', () => {
    const { progreso, acciones, subtitulos, memoria, jugar, correrAgendado } = armar([...PARTES_LIBRETA], ['medido:302', CINTA_302, 'golpe:llegada']);
    memoria.habitacionActual = 'escalera';
    jugar(0.2);
    expect(progreso.tiene(FINAL_PISO_3)).toBe(true);
    expect(acciones).toEqual(['soloMirar:true']);
    correrAgendado();
    expect(subtitulos).toContain(GOLPES_FINALES);
    expect(acciones).toEqual(['soloMirar:true', 'fundido', 'soloMirar:false', 'terminar']);
    jugar(5);
    expect(acciones.filter((a) => a === 'terminar'), 'una sola vez').toHaveLength(1);
  });

  it('en la escalera sin la cinta no pasa nada (es donde se llega al piso)', () => {
    const { progreso, acciones, jugar } = armar([...PARTES_LIBRETA], ['golpe:llegada']);
    jugar(3);
    expect(progreso.tiene(FINAL_PISO_3)).toBe(false);
    expect(acciones).toEqual([]);
  });
});
