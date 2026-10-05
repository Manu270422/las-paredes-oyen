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
    puntoControl: 'sala401',
    progreso: { banderas: ['medido:401'], inventario: [], documentos: [] },
    bateria: 0.8,
    tiempoJugado: 120,
    estadisticas: { persecuciones: 1, muertes: 2, sustos: 3 },
  };

  it('guarda y carga la partida actual', () => {
    const g = new SistemaGuardado();
    g.guardar(partida);
    expect(g.cargar()).toMatchObject({ ...partida, version: VERSION_PARTIDA });
  });

  it('una partida v1 (la que tienen hoy los probadores, sin piso) sube a v2 como Piso 4 y se guarda migrada', () => {
    const { piso: _sinPiso, ...v1 } = partida;
    sembrar('partida', { ...v1, version: 1, fecha: 1 });
    const cargada = new SistemaGuardado().cargar();
    expect(cargada).toMatchObject({ version: 2, piso: 'piso4', puntoControl: 'sala401', estadisticas: partida.estadisticas });
    expect(guardado('partida'), 'queda guardada ya en el formato nuevo').toMatchObject({ version: 2, piso: 'piso4' });
  });

  it('una partida v2 sin piso es dañada (no se inventa el piso)', () => {
    const { piso: _sinPiso, ...v2SinPiso } = partida;
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
    expect(guardado('perfil')).toMatchObject({ version: 1, partidasIniciadas: 1, muertesTotales: 1, encuentrosSuperados: 1 });
  });

  it('las marcas solo mejoran: premia jugar bien, no jugar más', () => {
    const p = new Perfil();
    expect(p.registrarFinal(600, 3)).toEqual({ mejorTiempo: 600, nuevoMejorTiempo: true, finales: 1 });
    expect(p.registrarFinal(700, 1)).toEqual({ mejorTiempo: 600, nuevoMejorTiempo: false, finales: 2 });
    expect(new Perfil().registrarFinal(500, 5)).toEqual({ mejorTiempo: 500, nuevoMejorTiempo: true, finales: 3 });
    expect(guardado('perfil')).toMatchObject({ mejorTiempo: 500, menosMuertes: 1, finales: 3 });
  });
});
