// Guardado versionado (A2): una actualización del juego nunca debe borrar lo
// que el jugador ya tenía, y una versión vieja del juego nunca debe pisar lo
// que guardó una más nueva.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cargarVersionado, type Migracion } from '../../src/guardado/Versionado';
import { SistemaGuardado, VERSION_PARTIDA, type DatosPartida } from '../../src/guardado/SistemaGuardado';
import { Perfil } from '../../src/guardado/Perfil';
import { AJUSTES_POR_DEFECTO, GestorAjustes } from '../../src/config/Ajustes';
import { BusEventos } from '../../src/nucleo/BusEventos';
import type { MapaEventos } from '../../src/nucleo/Eventos';

const PREFIJO = 'las-paredes-oyen:';
let memoria: Map<string, string>;

beforeEach(() => {
  memoria = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, v),
      removeItem: (k: string) => void memoria.delete(k),
    },
  });
});

const guardado = (clave: string): unknown => JSON.parse(memoria.get(PREFIJO + clave) ?? 'null');
const sembrar = (clave: string, valor: unknown) => memoria.set(PREFIJO + clave, typeof valor === 'string' ? valor : JSON.stringify(valor));

describe('cargarVersionado', () => {
  const tieneNombre = (d: Record<string, unknown>): d is Record<string, unknown> & { nombre: string } => typeof d.nombre === 'string';
  const migraciones: Migracion[] = [
    { desde: 0, migrar: (d) => ({ nombre: String(d.name) }) },
    { desde: 1, migrar: (d) => ({ ...d, nombre: `${d.nombre}!` }) },
  ];

  it('sube datos sin versión (v0) paso a paso hasta la actual', () => {
    const r = cargarVersionado({ name: 'manu' }, 2, migraciones, tieneNombre);
    expect(r).toEqual({ estado: 'ok', datos: { nombre: 'manu!', version: 2 }, migrado: true });
  });

  it('no toca datos de una versión más nueva', () => {
    expect(cargarVersionado({ version: 9, nombre: 'x' }, 2, migraciones, tieneNombre)).toEqual({ estado: 'futuro', version: 9 });
  });

  it('marca como dañado lo que no puede leer o no tiene la forma esperada', () => {
    expect(cargarVersionado('texto', 2, migraciones, tieneNombre).estado).toBe('danado');
    expect(cargarVersionado({ version: 2 }, 2, migraciones, tieneNombre).estado).toBe('danado');
    expect(cargarVersionado({ version: 1 }, 3, migraciones, tieneNombre).estado).toBe('danado');
  });

  it('vacío no es dañado', () => {
    expect(cargarVersionado(null, 2, migraciones, tieneNombre).estado).toBe('vacio');
  });
});

describe('SistemaGuardado', () => {
  const partida: Omit<DatosPartida, 'version' | 'fecha'> = {
    piso: 'piso4',
    dificultad: 'normal',
    dificultadInicial: 'normal',
    dificultadMasBaja: 'normal',
    puntoControl: 'sala401',
    progreso: { banderas: ['medido:401'], inventario: [], documentos: [] },
    otrosPisos: { piso3: { banderas: ['lugar:301'], documentos: ['nota_301'] } },
    bateria: 0.8,
    tiempoJugado: 120,
    estadisticas: { persecuciones: 1, muertes: 2, sustos: 3, cambiosMundo: 4 },
  };
  // Hasta la v5 la partida no recordaba otros pisos (solo existía uno): las partidas viejas no traen el campo.
  const { otrosPisos: _sinOtros, ...partidaV5 } = partida;

  it('guarda y carga la partida actual', () => {
    const g = new SistemaGuardado();
    g.guardar(partida);
    expect(g.cargar()).toMatchObject({ ...partida, version: VERSION_PARTIDA });
  });

  it('una partida v1 (la de los probadores del Gate 1, sin piso) sube hasta la actual como Piso 4 y se guarda migrada', () => {
    const { piso: _sinPiso, dificultad: _sinDificultad, dificultadInicial: _sinInicial, dificultadMasBaja: _sinMasBaja, ...v1 } = partidaV5;
    const { cambiosMundo: _sinCambios, ...estadisticasV1 } = partida.estadisticas;
    sembrar('partida', { ...v1, estadisticas: estadisticasV1, version: 1, fecha: 1 });
    const cargada = new SistemaGuardado().cargar();
    expect(cargada).toMatchObject({ version: VERSION_PARTIDA, piso: 'piso4', dificultad: 'normal', dificultadInicial: 'normal', dificultadMasBaja: 'normal', puntoControl: 'sala401', estadisticas: { ...estadisticasV1, cambiosMundo: 0 } });
    expect(guardado('partida'), 'queda guardada ya en el formato nuevo').toMatchObject({ version: VERSION_PARTIDA, piso: 'piso4', dificultad: 'normal', otrosPisos: {} });
  });

  it('una partida v2 sube a v3: "Cosas que cambiaron" empieza en 0 (no se sabe cuántas hubo) y sustos no se toca', () => {
    const { dificultad: _sinDificultad, dificultadInicial: _sinInicial, dificultadMasBaja: _sinMasBaja, ...v2 } = partidaV5;
    const { cambiosMundo: _sinCambios, ...estadisticasV2 } = partida.estadisticas;
    sembrar('partida', { ...v2, estadisticas: estadisticasV2, version: 2, fecha: 1 });
    expect(new SistemaGuardado().cargar()?.estadisticas).toEqual({ persecuciones: 1, muertes: 2, sustos: 3, cambiosMundo: 0 });
    expect(guardado('partida')).toMatchObject({ version: VERSION_PARTIDA });
  });

  it('una partida v3 sube a v4 como Normal (la única dificultad que existía)', () => {
    const { dificultad: _sinDificultad, dificultadInicial: _sinInicial, dificultadMasBaja: _sinMasBaja, ...v3 } = partidaV5;
    sembrar('partida', { ...v3, version: 3, fecha: 1 });
    expect(new SistemaGuardado().cargar()).toMatchObject({ version: VERSION_PARTIDA, dificultad: 'normal', puntoControl: 'sala401' });
  });

  it('una partida v4 sube a v5: empezó y se jugó en su dificultad (no se podía cambiar en plena partida)', () => {
    const { dificultadInicial: _sinInicial, dificultadMasBaja: _sinMasBaja, ...v4 } = partidaV5;
    sembrar('partida', { ...v4, dificultad: 'dificil', version: 4, fecha: 1 });
    expect(new SistemaGuardado().cargar()).toMatchObject({ version: VERSION_PARTIDA, dificultad: 'dificil', dificultadInicial: 'dificil', dificultadMasBaja: 'dificil' });
  });

  it('una partida v5 sube a v6 sin otros pisos (solo existía uno) y con todo lo demás intacto', () => {
    sembrar('partida', { ...partidaV5, version: 5, fecha: 1 });
    expect(new SistemaGuardado().cargar()).toEqual({ ...partidaV5, otrosPisos: {}, version: VERSION_PARTIDA, fecha: 1 });
  });

  it('una partida con los otros pisos mal formados es dañada (no se adivina qué pasó en ellos)', () => {
    const malos: unknown[] = [[], null, { piso3: null }, { piso3: { banderas: 'lugar:301', documentos: [] } }, { piso3: { banderas: [1], documentos: [] } }];
    for (const otrosPisos of malos) {
      sembrar('partida', { ...partida, otrosPisos, version: VERSION_PARTIDA, fecha: 1 });
      expect(new SistemaGuardado().cargar(), JSON.stringify(otrosPisos)).toBeNull();
    }
  });

  it('una partida v4 con una dificultad desconocida es dañada (no se inventa)', () => {
    sembrar('partida', { ...partidaV5, dificultad: 'imposible', version: 4, fecha: 1 });
    expect(new SistemaGuardado().cargar()).toBeNull();
  });

  it('sin guardado (Pesadilla): guardar y borrar no hacen nada, y la partida que había sigue ahí y se puede cargar', () => {
    const g = new SistemaGuardado();
    g.guardar(partida);
    const antes = memoria.get(`${PREFIJO}partida`);
    g.fijarSinGuardado(true);
    g.guardar({ ...partida, dificultad: 'pesadilla', puntoControl: 'sala403' });
    g.borrar();
    expect(memoria.get(`${PREFIJO}partida`), 'intacta, byte por byte').toBe(antes);
    expect(g.cargar()).toMatchObject({ dificultad: 'normal', puntoControl: 'sala401' });
    g.fijarSinGuardado(false);
    g.borrar();
    expect(g.hayPartida()).toBe(false);
  });

  it('una partida v2 sin piso es dañada (no se inventa el piso)', () => {
    const { piso: _sinPiso, ...v2SinPiso } = partidaV5;
    sembrar('partida', { ...v2SinPiso, version: 2, fecha: 1 });
    expect(new SistemaGuardado().cargar()).toBeNull();
  });

  it('una partida de una versión más nueva no se carga, ni se borra, ni se pisa', () => {
    sembrar('partida', { ...partida, version: 99 });
    const g = new SistemaGuardado();
    expect(g.hayPartida()).toBe(false);
    g.borrar();
    g.guardar(partida);
    expect((guardado('partida') as { version: number }).version).toBe(99);
  });

  it('una partida dañada deja un respaldo antes de desaparecer', () => {
    sembrar('partida', '{roto');
    expect(new SistemaGuardado().cargar()).toBeNull();
    expect(memoria.get(`${PREFIJO}partida:respaldo`)).toBe('{roto');
  });
});

describe('GestorAjustes', () => {
  it('migra los ajustes sin versión (hasta el Sprint 2) sin perder nada', () => {
    sembrar('ajustes', { volumenMaestro: 0.37, subtitulosEfectos: false, telemetria: true });
    const a = new GestorAjustes();
    expect(a.valores.volumenMaestro).toBe(0.37);
    expect(a.valores.subtitulosEfectos).toBe(false);
    expect(a.valores.telemetria).toBe(true);
    expect(guardado('ajustes')).toMatchObject({ version: 1, valores: { volumenMaestro: 0.37 } });
  });

  it('la dificultad preferida (por defecto Normal) solo acepta dificultades que existen', () => {
    expect(new GestorAjustes().valores.dificultad).toBe('normal');
    expect(new GestorAjustes().valores.indicadorAireSiempre).toBe(false);
    sembrar('ajustes', { version: 1, valores: { dificultad: 'dificil' } });
    expect(new GestorAjustes().valores.dificultad).toBe('dificil');
    sembrar('ajustes', { version: 1, valores: { dificultad: 'imposible' } });
    expect(new GestorAjustes().valores.dificultad, 'una que no existe vuelve a Normal').toBe('normal');
  });

  it('ignora claves desconocidas y valores con el tipo equivocado', () => {
    sembrar('ajustes', { version: 1, valores: { brillo: 'mucho', cosaVieja: 1, sensibilidad: 1.4 } });
    const a = new GestorAjustes();
    expect(a.valores.brillo).toBe(AJUSTES_POR_DEFECTO.brillo);
    expect(a.valores.sensibilidad).toBe(1.4);
    expect('cosaVieja' in a.valores).toBe(false);
  });

  it('no pisa ajustes de una versión más nueva', () => {
    sembrar('ajustes', { version: 7, valores: {} });
    new GestorAjustes().cambiar('brillo', 1.2);
    expect((guardado('ajustes') as { version: number }).version).toBe(7);
  });
});

describe('Perfil', () => {
  it('cuenta muertes y encuentros superados desde el bus, y sobrevive a recargar', () => {
    const bus = new BusEventos<MapaEventos>();
    const p = new Perfil();
    p.conectar(bus);
    p.registrarInicio();
    bus.emit('jugador-atrapado', { x: 0, z: 0, motivo: 'jadeo', enPared: false });
    bus.emit('encuentro', { estado: 'inicio', distancia: 2 });
    bus.emit('encuentro', { estado: 'superado', distancia: 2 });
    expect(guardado('perfil')).toMatchObject({ version: 2, partidasIniciadas: 1, muertesTotales: 1, encuentrosSuperados: 1, pisosCompletados: {} });
  });

  it('las marcas solo mejoran: premia jugar bien, no jugar más', () => {
    const p = new Perfil();
    expect(p.registrarFinal('piso4', 'normal', 600, 3)).toEqual({ mejorTiempo: 600, nuevoMejorTiempo: true, finales: 1 });
    expect(p.registrarFinal('piso4', 'normal', 700, 1)).toEqual({ mejorTiempo: 600, nuevoMejorTiempo: false, finales: 2 });
    expect(new Perfil().registrarFinal('piso4', 'normal', 500, 5)).toEqual({ mejorTiempo: 500, nuevoMejorTiempo: true, finales: 3 });
    expect(guardado('perfil')).toMatchObject({ mejorTiempo: 500, menosMuertes: 1, finales: 3 });
  });

  it('recuerda cada piso terminado con la dificultad MÁS ALTA: terminarlo en una más fácil no la baja', () => {
    const p = new Perfil();
    expect(p.completado('piso4')).toBeNull();
    p.registrarFinal('piso4', 'normal', 600, 0);
    p.registrarFinal('piso4', 'historia', 500, 0);
    expect(p.completado('piso4')).toBe('normal');
    p.registrarFinal('piso4', 'dificil', 900, 2);
    expect(new Perfil().completado('piso4'), 'sobrevive a recargar').toBe('dificil');
    expect(guardado('perfil')).toMatchObject({ pisosCompletados: { piso4: 'dificil' } });
  });

  it('un perfil v1 sube a v2: si llegó al final, completó el Piso 4 en Normal (lo único que existía); si no, nada', () => {
    const v1 = { version: 1, creado: 1, partidasIniciadas: 4, finales: 2, mejorTiempo: 700, menosMuertes: 1, muertesTotales: 9, encuentrosSuperados: 3 };
    sembrar('perfil', v1);
    expect(new Perfil().completado('piso4')).toBe('normal');
    expect(guardado('perfil')).toMatchObject({ ...v1, version: 2, pisosCompletados: { piso4: 'normal' } });
    sembrar('perfil', { ...v1, finales: 0, mejorTiempo: null, menosMuertes: null });
    expect(new Perfil().completado('piso4')).toBeNull();
  });

  it('un perfil v2 con una dificultad desconocida es dañado (no se inventa)', () => {
    sembrar('perfil', { version: 2, creado: 1, partidasIniciadas: 1, finales: 1, mejorTiempo: 1, menosMuertes: 0, muertesTotales: 0, encuentrosSuperados: 0, pisosCompletados: { piso4: 'imposible' } });
    expect(new Perfil().completado('piso4')).toBeNull();
    expect(memoria.get(`${PREFIJO}perfil:respaldo`), 'queda un respaldo').toBeDefined();
  });
});
