// El ascensor (C2 §3) sin navegador: la celda 'A' en la rejilla, el marco de la cabina, la máquina (llamar, abrir,
// cerrar, viajar, llegar), las reglas que lo hacen justo (las puertas se vuelven a abrir si ella está en la puerta,
// no abren con ella cerca al llegar conmigo, ella no viaja) y que los paquetes lo tengan bien puesto.
import { describe, expect, it } from 'vitest';
import { PISOS, pisoPorId } from '../../src/pisos/catalogo';
import { problemasDeAscensor } from '../../src/pisos/EnlacesAscensor';
import { Rejilla } from '../../src/mundo/Rejilla';
import { MarcoCabina } from '../../src/mundo/MarcoCabina';
import { Ascensor, DISTANCIA_JUSTICIA, TIEMPOS_ASCENSOR, numerosDelPanel } from '../../src/mundo/Ascensor';
import type { VistaAscensor } from '../../src/mundo/ModeloAscensor';
import type { DefAscensor, PaquetePiso } from '../../src/pisos/TiposPiso';
import type { NombreEstadoIA } from '../../src/ia/TiposIA';
import { Group } from 'three';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { crearContextoFalso } from './contextoFalso';

const C = CONFIG.celda;
const PISO_4 = pisoPorId('piso4')!;
const PISO_3 = pisoPorId('piso3')!;
const PISO_2 = pisoPorId('piso2')!;

describe('Los ascensores del catálogo', () => {
  it('están bien puestos y enlazados (misma celda, mismo panel, ida y vuelta)', () => {
    const problemas = PISOS.flatMap((p) => problemasDeAscensor(p, PISOS));
    expect(problemas).toEqual([]);
  });

  it('el Piso 4, el 3 y el 2 tienen ascensor, y el panel es idéntico en los tres (con el 1, que todavía no existe)', () => {
    for (const piso of [PISO_4, PISO_3, PISO_2]) expect(numerosDelPanel(piso.ascensor!), piso.id).toEqual(['4', '3', '2', '1']);
  });

  it('la validación encuentra un ascensor mal puesto', () => {
    const malo: PaquetePiso = { ...PISO_3, ascensor: { ...PISO_3.ascensor!, x: 6, paradas: [{ hacia: 'piso9', texto: 'x' }] } };
    const problemas = problemasDeAscensor(malo, PISOS);
    expect(problemas.some((p) => p.includes("una sola 'A'"))).toBe(true);
    expect(problemas.some((p) => p.includes('no está en el catálogo'))).toBe(true);
    const sinAscensor: PaquetePiso = { ...PISO_3, ascensor: undefined };
    expect(problemasDeAscensor(sinAscensor, PISOS)[0]).toContain("cabina ('A')");
  });
});

describe('La celda de la cabina en la rejilla', () => {
  const r = new Rejilla(PISO_4.mapa.rejilla);
  const { x, y } = PISO_4.ascensor!;

  it('se pisa (no es muro ni hueco) y se reconoce como cabina', () => {
    expect(r.esCabina(x, y)).toBe(true);
    expect(r.esMuro(x, y)).toBe(false);
    expect(r.esTransitable(x, y)).toBe(true);
    expect(r.esPuerta(x, y)).toBe(false);
  });

  it('con las puertas cerradas tapa la vista y apaga el sonido como una puerta; abiertas, no', () => {
    const desde = { x: r.centro(x), z: r.centro(y) };
    const hasta = { x: r.centro(x), z: r.centro(y - 1) };
    const cerrada = (gx: number, gy: number) => gx === x && gy === y;
    const abierta = () => false;
    expect(r.hayLineaDeVision(desde.x, desde.z, hasta.x, hasta.z, cerrada)).toBe(false);
    expect(r.hayLineaDeVision(desde.x, desde.z, hasta.x, hasta.z, abierta)).toBe(true);
    expect(r.contarObstaculos(hasta.x, hasta.z, r.centro(x), r.centro(y) + 0.3, cerrada)).toBeCloseTo(0.6);
    expect(r.contarObstaculos(hasta.x, hasta.z, r.centro(x), r.centro(y) + 0.3, abierta)).toBe(0);
  });
});

describe('El marco de la cabina', () => {
  const r = new Rejilla(PISO_4.mapa.rejilla);
  const m = new MarcoCabina(5, 11, r);

  it('su boca da al pasillo (al norte) y paso del marco al mundo y de vuelta', () => {
    expect(m.fx).toBe(0);
    expect(m.fz).toBe(-1);
    const p = m.aMundo(m.medio, 0);
    expect(p.x).toBeCloseTo(5.5 * C);
    expect(p.z).toBeCloseTo(11 * C);
    const q = m.aLocal(p.x + 0.2, p.z - 0.1);
    const w = m.aMundo(q.u, q.v);
    expect(w.x).toBeCloseTo(p.x + 0.2);
    expect(w.z).toBeCloseTo(p.z - 0.1);
  });

  it('sabe si algo está adentro o cruzando las puertas', () => {
    expect(m.dentro(m.cx, m.cz)).toBe(true);
    expect(m.dentro(m.cx, 10.5 * C)).toBe(false);
    expect(m.enLaPuerta(m.cx, 11 * C + 0.1, 0.3)).toBe(true);
    expect(m.enLaPuerta(m.cx, m.cz, 0.3)).toBe(false);
  });

  it('no acepta una celda que no es una cabina bien puesta', () => {
    expect(() => new MarcoCabina(6, 11, r)).toThrow();
  });
});

/** Una vista de mentira: anoto lo que el ascensor le pide. */
function vistaFalsa(): VistaAscensor & {
  apertura: number;
  boton: number | null;
  llamada: boolean;
  indicador: [string, number, boolean];
  trampilla: [number, number];
} {
  return {
    raiz: new Group(),
    apertura: 0,
    boton: null,
    llamada: false,
    indicador: ['', 0, false],
    trampilla: [0, 0],
    fijarTrampilla(a, t) {
      this.trampilla = [a, t];
    },
    fijarApertura(a) {
      this.apertura = a;
    },
    fijarIndicador(n, f, e) {
      this.indicador = [n, f, e];
    },
    fijarLlamada(e) {
      this.llamada = e;
    },
    fijarBoton(i) {
      this.boton = i;
    },
  };
}

interface Montaje {
  ascensor: Ascensor;
  vista: ReturnType<typeof vistaFalsa>;
  marco: MarcoCabina;
  jugador: { posicion: { x: number; y: number; z: number }; efectos: { trauma: number; agregarTrauma(n: number): void }; sobresaltar(): void };
  entidad: { fisica: boolean; posicion: { x: number; y: number; z: number }; estados: NombreEstadoIA[]; cambiarEstado(e: NombreEstadoIA): void };
  viajes: string[];
  bloqueos: number[];
  subtitulos: string[];
  falso: ReturnType<typeof crearContextoFalso>;
  correr(segundos: number): void;
}

function montar(def: DefAscensor = PISO_3.ascensor!, banderas: string[] = [], inventario: string[] = [], visitados: string[] = []): Montaje {
  const rejilla = new Rejilla(PISO_3.mapa.rejilla);
  const marco = new MarcoCabina(def.x, def.y, rejilla);
  const vista = vistaFalsa();
  const viajes: string[] = [];
  const bloqueos: number[] = [];
  const subtitulos: string[] = [];
  const jugador = {
    // Afuera, en el pasillo frente a las puertas.
    posicion: { x: marco.cx, y: 0, z: 10.4 * C },
    yaw: 0,
    efectos: {
      trauma: 0,
      agregarTrauma(n: number) {
        this.trauma = Math.min(1, this.trauma + n);
      },
    },
    sobresaltar: () => undefined,
    sumarEstres: () => undefined,
  };
  const entidad = {
    fisica: false,
    posicion: { x: 20 * C, y: 0, z: 10.5 * C },
    estados: [] as NombreEstadoIA[],
    cambiarEstado(e: NombreEstadoIA) {
      this.estados.push(e);
      if (e === 'paredes') this.fisica = false;
    },
  };
  const progreso = {
    tiene: (b: string) => banderas.includes(b),
    tieneObjeto: (o: string) => inventario.includes(o),
    visitado: (p: string) => p === 'piso3' || visitados.includes(p),
  };
  const falso = crearContextoFalso({
    piso: PISO_3,
    jugador,
    entidad,
    progreso,
    director: { bloquear: (s: number) => bloqueos.push(s) },
    viaje: { porAscensor: (hacia: string) => viajes.push(hacia), cambiarDePiso: () => undefined },
  });
  falso.bus.on('subtitulo', ({ texto }) => subtitulos.push(texto));
  const ascensor = new Ascensor(def, marco, vista, numerosDelPanel(def), null);
  ascensor.restablecer(falso.ctx);
  const correr = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) ascensor.actualizar(0.05, falso.ctx);
  };
  return { ascensor, vista, marco, jugador, entidad, viajes, bloqueos, subtitulos, falso, correr };
}

const llamar = (m: Montaje) => m.ascensor.pulsar(m.ascensor.botones[0], m.falso.ctx);
const panel = (m: Montaje) => m.ascensor.botones[1];
const entrar = (m: Montaje) => {
  m.jugador.posicion.x = m.marco.cx;
  m.jugador.posicion.z = m.marco.cz + 0.1;
};

describe('La máquina del ascensor', () => {
  it('llamado desde otro piso tarda, zumba por los muros (ella lo oye) y llega con la campanilla, fuerte', () => {
    const m = montar();
    expect(m.ascensor.fase).toBe('lejos');
    llamar(m);
    expect(m.ascensor.fase).toBe('viniendo');
    expect(m.vista.llamada).toBe(true);
    m.correr(TIEMPOS_ASCENSOR.llamada - 0.3);
    expect(m.ascensor.fase, 'todavía no llega').toBe('viniendo');
    const motor = m.falso.ruidos.filter((r) => r.causa === 'maquina');
    expect(motor.length, 'el motor suena para ella varias veces mientras viene').toBeGreaterThanOrEqual(4);
    expect(motor.every((r) => r.pared && r.intensidad < 0.5)).toBe(true);
    m.correr(0.5);
    expect(m.falso.sonidos).toContain('campanilla');
    expect(m.falso.ruidos.some((r) => r.causa === 'maquina' && r.intensidad >= 0.6), 'la campanilla es un ruido fuerte').toBe(true);
    expect(m.ascensor.fase).toBe('abriendo');
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.1);
    expect(m.ascensor.fase).toBe('abierto');
    expect(m.ascensor.cajaColision(), 'abiertas no tapan el paso').toBeNull();
    expect(m.ascensor.tapa(m.marco.gx, m.marco.gy)).toBe(false);
  });

  it('sin nadie adentro se cierra solo y se queda aquí: llamarlo otra vez abre de inmediato', () => {
    const m = montar();
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    m.correr(TIEMPOS_ASCENSOR.abiertas + TIEMPOS_ASCENSOR.puertas + 0.5);
    expect(m.ascensor.fase).toBe('aqui');
    expect(m.ascensor.cajaColision(), 'cerradas, son un obstáculo').not.toBeNull();
    expect(m.ascensor.tapa(m.marco.gx, m.marco.gy), 'cerradas tapan la vista, el sonido y el paso de ella').toBe(true);
    llamar(m);
    expect(m.ascensor.fase).toBe('abriendo');
  });

  it('muerto (sin lo que pide el piso) no responde; al cumplirse en plena partida, viene solo', () => {
    const def = PISO_4.ascensor!;
    const m = montar(def);
    expect(m.ascensor.fase).toBe('muerto');
    expect(m.vista.indicador[2], 'el indicador está apagado').toBe(false);
    llamar(m);
    expect(m.ascensor.fase).toBe('muerto');
    expect(m.subtitulos).toEqual([def.muerto]);
    m.ascensor.alBandera(def.requiere!, m.falso.ctx);
    expect(m.ascensor.fase).toBe('viniendo');
    // La primera bajada es por la escalera (decisión del creador): la llave sola no basta, hace falta abrir la reja.
    expect(def.requiere).toBe('abierta:bajada');
    expect(montar(def, ['objeto:llave_escalera'], ['llave_escalera']).ascensor.fase, 'con la llave pero la reja cerrada').toBe('muerto');
    expect(montar(def, ['abierta:bajada'], ['llave_escalera']).ascensor.fase, 'al cargar con la reja abierta, funciona').toBe('lejos');
  });

  it('cada vez que lo llamo, la telemetría se entera de cómo respondió (muerto, viene, abre o nada)', () => {
    const respuestas: string[] = [];
    const muerto = montar(PISO_4.ascensor!);
    muerto.falso.bus.on('ascensor-llamado', (e) => respuestas.push(`${e.piso}:${e.respuesta}`));
    llamar(muerto);
    const m = montar();
    m.falso.bus.on('ascensor-llamado', (e) => respuestas.push(`${e.piso}:${e.respuesta}`));
    llamar(m);
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    m.correr(TIEMPOS_ASCENSOR.abiertas + TIEMPOS_ASCENSOR.puertas + 0.5);
    llamar(m);
    // El piso es el del contexto (aquí el falso usa el Piso 3 en los dos montajes).
    expect(respuestas).toEqual(['piso3:muerto', 'piso3:viene', 'piso3:nada', 'piso3:abre']);
  });

  it('el botón del panel solo se pulsa desde adentro y con las puertas abiertas', () => {
    const m = montar();
    const boton = panel(m);
    expect(m.ascensor.disponible(boton, m.falso.ctx)).toBe(false);
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    expect(m.ascensor.disponible(boton, m.falso.ctx), 'afuera, no').toBe(false);
    entrar(m);
    expect(m.ascensor.disponible(boton, m.falso.ctx)).toBe(true);
    expect(boton.texto()).toBe('Subir al Piso 4');
    expect(m.ascensor.disponible(m.ascensor.botones[0], m.falso.ctx), 'el de llamar está afuera: desde adentro no se enfoca').toBe(false);
  });

  it('el ruido del ascensor sale frente a las puertas, en el pasillo (si ella va a investigarlo, tiene camino)', () => {
    const m = montar();
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + 0.2);
    const r = new Rejilla(PISO_3.mapa.rejilla);
    const ruidos = m.falso.ruidos.filter((x) => x.causa === 'maquina');
    expect(ruidos.length).toBeGreaterThan(0);
    for (const x of ruidos) {
      expect(r.esCabina(r.aCelda(x.x), r.aCelda(x.z))).toBe(false);
      expect(r.esTransitable(r.aCelda(x.x), r.aCelda(x.z))).toBe(true);
    }
  });

  it('el viaje: cierra, arranca con un sacudón, vibra, cambia de piso a la mitad sin que el director moleste', () => {
    const m = montar();
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    entrar(m);
    m.ascensor.pulsar(panel(m), m.falso.ctx);
    expect(m.ascensor.fase).toBe('cerrando');
    expect(m.vista.boton, 'se enciende el botón del 4 (arriba en el panel)').toBe(0);
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.1);
    expect(m.ascensor.fase).toBe('viajando');
    expect(m.bloqueos[0]).toBeGreaterThan(TIEMPOS_ASCENSOR.viaje);
    expect(m.vista.indicador, 'sube').toEqual(['3', 1, true]);
    m.correr(1);
    expect(m.jugador.efectos.trauma, 'la cabina vibra').toBeGreaterThan(0.3);
    expect(m.viajes).toEqual([]);
    m.correr(TIEMPOS_ASCENSOR.viaje / 2);
    expect(m.viajes, 'a la mitad, el piso cambia (una sola vez)').toEqual(['piso4']);
    m.correr(1);
    expect(m.viajes).toHaveLength(1);
  });

  it('si salgo mientras cierra, las puertas se vuelven a abrir y el viaje se olvida', () => {
    const m = montar();
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    entrar(m);
    m.ascensor.pulsar(panel(m), m.falso.ctx);
    m.correr(0.4);
    // Doy un paso a la puerta: el sensor la abre.
    m.jugador.posicion.z = 11 * C + 0.05;
    m.correr(0.1);
    expect(m.ascensor.fase).toBe('abriendo');
    m.jugador.posicion.z = 10.4 * C;
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.5);
    expect(m.ascensor.fase).toBe('abierto');
    expect(m.vista.boton, 'afuera, el piso elegido se olvida').toBeNull();
    m.correr(TIEMPOS_ASCENSOR.abiertas + TIEMPOS_ASCENSOR.puertas + 0.5);
    expect(m.ascensor.fase).toBe('aqui');
    expect(m.viajes).toEqual([]);
  });

  it('ella en la puerta no deja cerrar: no es un refugio', () => {
    const m = montar();
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    entrar(m);
    m.ascensor.pulsar(panel(m), m.falso.ctx);
    m.correr(0.3);
    m.entidad.fisica = true;
    m.entidad.posicion.x = m.marco.cx;
    m.entidad.posicion.z = 10.5 * C;
    m.correr(0.1);
    expect(m.ascensor.fase).toBe('abriendo');
    m.correr(5);
    expect(m.ascensor.fase, 'mientras siga en la puerta, abiertas').toBe('abierto');
    expect(m.viajes).toEqual([]);
  });

  it('ella no viaja: si estaba afuera con cuerpo cuando se cerraron, golpea el metal y vuelve a las paredes', () => {
    const m = montar();
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    entrar(m);
    m.entidad.fisica = true;
    m.entidad.posicion.x = 7.5 * C;
    m.entidad.posicion.z = 10.5 * C;
    m.ascensor.pulsar(panel(m), m.falso.ctx);
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.1);
    expect(m.ascensor.fase).toBe('viajando');
    expect(m.entidad.estados).toEqual(['paredes']);
    expect(m.falso.sonidos).toContain('golpe');
  });

  it('al llegar conmigo: la campanilla suena, y con ella a menos de 4 m las puertas no abren (justicia)', () => {
    const m = montar();
    entrar(m);
    m.entidad.fisica = true;
    m.entidad.posicion.x = m.marco.cx + 2;
    m.entidad.posicion.z = 10.5 * C;
    m.ascensor.recibir(m.falso.ctx, TIEMPOS_ASCENSOR.viaje / 2, -1, 'piso3');
    expect(m.vista.indicador).toEqual(['3', -1, true]);
    expect(m.vista.boton, 'el botón del 3 encendido (abajo en el panel)').toBe(1);
    m.correr(TIEMPOS_ASCENSOR.viaje / 2 + 0.1);
    expect(m.ascensor.fase).toBe('reteniendo');
    expect(m.falso.sonidos).toContain('campanilla');
    m.correr(2);
    expect(m.ascensor.fase, 'está a 2 m: no abro').toBe('reteniendo');
    expect(m.ascensor.cajaColision()).not.toBeNull();
    m.correr(TIEMPOS_ASCENSOR.retencionMaxima - 2.4);
    expect(m.ascensor.fase).toBe('reteniendo');
    expect(m.entidad.estados).toEqual([]);
    m.correr(0.6);
    expect(m.entidad.estados, 'si no se va, la mando a las paredes').toEqual(['paredes']);
    expect(m.ascensor.fase, 'y abro').toBe('abriendo');
  });

  it('al llegar conmigo con ella lejos, abre enseguida', () => {
    const m = montar();
    entrar(m);
    m.entidad.fisica = true;
    m.entidad.posicion.x = m.marco.cx + DISTANCIA_JUSTICIA + 1;
    m.entidad.posicion.z = 10.5 * C;
    m.ascensor.recibir(m.falso.ctx, TIEMPOS_ASCENSOR.viaje / 2, 1, 'piso3');
    m.correr(TIEMPOS_ASCENSOR.viaje / 2 + 0.2);
    expect(m.ascensor.fase).toBe('abriendo');
    expect(m.entidad.estados).toEqual([]);
  });
});

describe('Los botones que piden algo y el piso que todavía no existe', () => {
  const abiertoConmigo = (m: Montaje) => {
    llamar(m);
    m.correr(TIEMPOS_ASCENSOR.llamada + TIEMPOS_ASCENSOR.puertas + 0.5);
    entrar(m);
  };
  // En el Piso 3, el panel tiene: [llamar, al 4, al 2, al 1].
  const al2 = (m: Montaje) => m.ascensor.botones[2];
  const al1 = (m: Montaje) => m.ascensor.botones[3];

  it('sin lo que piden, los botones del 2 y del 1 no se encienden: dicen por qué y las puertas siguen abiertas', () => {
    const m = montar();
    abiertoConmigo(m);
    m.ascensor.pulsar(al2(m), m.falso.ctx);
    expect(m.subtitulos).toContain('El botón del 2 no se enciende.');
    m.correr(1);
    expect(m.ascensor.fase).toBe('abierto');
    m.ascensor.pulsar(al1(m), m.falso.ctx);
    expect(m.subtitulos.at(-1)).toContain('llave de servicio');
    m.correr(1);
    expect(m.ascensor.fase).toBe('abierto');
    expect(m.viajes).toEqual([]);
  });

  it('después de haber estado en el 2, su botón funciona', () => {
    const m = montar(PISO_3.ascensor!, [], [], ['piso2']);
    abiertoConmigo(m);
    m.ascensor.pulsar(al2(m), m.falso.ctx);
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.1);
    expect(m.ascensor.fase).toBe('viajando');
    m.correr(TIEMPOS_ASCENSOR.viaje / 2);
    expect(m.viajes).toEqual(['piso2']);
  });

  it('con la llave, el del 1 baja: como el 1 no existe, a la mitad arma el 2 (el último que existe) y sigue', () => {
    const m = montar(PISO_3.ascensor!, [], ['llave_servicio']);
    abiertoConmigo(m);
    m.ascensor.pulsar(al1(m), m.falso.ctx);
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.1);
    expect(m.ascensor.fase).toBe('viajando');
    m.correr(TIEMPOS_ASCENSOR.viaje / 2);
    expect(m.viajes).toEqual(['piso2']);
  });

  it('un guion la detiene entre pisos: quieta no cambia de piso ni avanza; al soltarla sigue desde donde quedó', () => {
    const m = montar(PISO_3.ascensor!, [], ['llave_servicio']);
    expect(m.ascensor.detener(m.falso.ctx), 'parada, no hay viaje que detener').toBe(false);
    abiertoConmigo(m);
    m.ascensor.pulsar(al1(m), m.falso.ctx);
    m.correr(TIEMPOS_ASCENSOR.puertas + 0.1);
    m.correr(1);
    expect(m.ascensor.viajandoHacia).toBe('piso1');
    const avance = m.ascensor.avanceViaje;
    expect(m.ascensor.detener(m.falso.ctx)).toBe(true);
    expect(m.ascensor.fase).toBe('detenido');
    expect(m.ascensor.viajandoHacia, 'detenida no viaja').toBeNull();
    expect(m.ascensor.cajaColision(), 'las puertas siguen cerradas').not.toBeNull();
    m.correr(10);
    expect(m.ascensor.fase).toBe('detenido');
    expect(m.viajes, 'detenida no cambia de piso').toEqual([]);
    expect(m.ascensor.avanceViaje).toBeCloseTo(avance, 2);
    m.ascensor.reanudar(m.falso.ctx);
    expect(m.ascensor.fase).toBe('viajando');
    m.correr(TIEMPOS_ASCENSOR.viaje / 2);
    expect(m.viajes, 'retoma y, a la mitad, arma el 2').toEqual(['piso2']);
  });

  it('la trampilla del techo tiembla con algo encima y se calma sola; reventada, cae y cuelga hasta restablecer', () => {
    const m = montar();
    m.ascensor.sacudirTrampilla(1);
    m.correr(0.1);
    expect(m.ascensor.estadoTrampilla.temblor).toBeGreaterThan(0.5);
    m.correr(1);
    expect(m.ascensor.estadoTrampilla.temblor, 'se calma sola').toBe(0);
    expect(m.vista.trampilla[0], 'cerrada').toBe(0);
    m.ascensor.reventarTrampilla();
    m.correr(0.3);
    expect(m.ascensor.estadoTrampilla.apertura, 'cae en un instante').toBe(1);
    expect(m.vista.trampilla[0]).toBe(1);
    m.ascensor.restablecer(m.falso.ctx);
    expect(m.vista.trampilla, 'al restablecer, cerrada y quieta').toEqual([0, 0]);
  });

  it('al llegar conmigo a un piso que no existe, no abre: avisa al guion y se queda cerrado', () => {
    const m = montar();
    entrar(m);
    const avisos: string[] = [];
    m.falso.bus.on('ascensor-fin-recorrido', ({ hacia }) => avisos.push(hacia));
    m.ascensor.recibir(m.falso.ctx, TIEMPOS_ASCENSOR.viaje / 2, -1, 'piso1');
    expect(m.vista.boton, 'el botón del 1 encendido (el último del panel)').toBe(3);
    m.correr(TIEMPOS_ASCENSOR.viaje / 2 + 0.2);
    expect(avisos).toEqual(['piso1']);
    expect(m.falso.sonidos).toContain('campanilla');
    m.correr(3);
    expect(m.ascensor.fase, 'sigue cerrado').toBe('aqui');
    expect(m.ascensor.apertura).toBe(0);
  });

  it('la validación acepta una parada a un piso por hacer solo si es el siguiente de alguno y dice su número', () => {
    const paradas = PISO_2.ascensor!.paradas.filter((p) => p.hacia !== 'piso1');
    const sinNumero: PaquetePiso = { ...PISO_2, ascensor: { ...PISO_2.ascensor!, paradas: [...paradas, { hacia: 'piso1', texto: 'x' }] } };
    expect(problemasDeAscensor(sinNumero, PISOS).some((p) => p.includes('no dice qué número'))).toBe(true);
    const aNingunLado: PaquetePiso = { ...PISO_2, ascensor: { ...PISO_2.ascensor!, paradas: [...paradas, { hacia: 'piso0', numero: '0', texto: 'x' }] } };
    expect(problemasDeAscensor(aNingunLado, PISOS).some((p) => p.includes('ni es el siguiente'))).toBe(true);
  });
});
