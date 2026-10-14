// La cabina detenida del Piso 2 (P2-guion, tanda 3) sin navegador:
// - el encuentro sin cuerpo (ella encima del techo) sigue las MISMAS reglas que cualquier encuentro: mientras se
//   arrastra, su ruido tapa mi respiración y solo lo fuerte me delata; escuchando, la gracia tapa mi respiración y
//   después cualquier ruido mío me delata; y no se pone a escuchar hasta que tengo el aire (la justicia del aire);
// - la escena: frena pasada la mitad del viaje al 1, cae encima, y según cómo termine el encuentro, la cabina sigue
//   (y no se repite) o ella cae adentro y caza con la causa de lo que me delató.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { ACERCARSE_MAXIMO, ACERCARSE_MINIMO, EncuentroSinCuerpo, type ResultadoEncuentro } from '../../src/ia/EncuentroSinCuerpo';
import type { CausaRuido } from '../../src/nucleo/Eventos';
import { AVANCE_PARA_FRENAR, CABINA_SUPERADA, CabinaDetenida, TEXTOS_CABINA } from '../../src/pisos/piso2/cabinaDetenida';
import { crearContextoFalso } from './contextoFalso';

/** Un contexto con ella escuchando desde (0, 0) y yo debajo; la respiración, a mano. */
function armar(duracion: readonly [number, number] = [3, 3]) {
  const respiracion = { aguantando: false, aire: 1 };
  const falso = crearContextoFalso({
    nivel: { consultaOclusion: () => 0, consultaAislamiento: () => false },
    dificultad: { duracionEncuentro: duracion, graciaEncuentro: 0.9, oido: 1 },
    jugador: { posicion: { x: 0.3, y: 0, z: 0 }, respiracion, sumarEstres: () => undefined },
  });
  const resultados: ResultadoEncuentro[] = [];
  const encuentros: string[] = [];
  falso.bus.on('encuentro', (e) => encuentros.push(e.estado));
  let escucha = 0;
  const encuentro = new EncuentroSinCuerpo({ x: 0, z: 0 }, (r) => resultados.push(r), () => escucha++);
  encuentro.empezar(falso.ctx);
  const correr = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) encuentro.actualizar(0.05, falso.ctx);
  };
  const ruido = (causa: CausaRuido, intensidad: number) => falso.bus.emit('ruido', { x: 0.3, z: 0, intensidad, origen: 'jugador', causa });
  return { encuentro, respiracion, resultados, encuentros, correr, ruido, escuchas: () => escucha };
}

describe('El encuentro sin cuerpo (ella sobre el techo)', () => {
  it('mientras se arrastra, su ruido tapa mi respiración y hasta mi jadeo; caminar me delata', () => {
    const m = armar();
    m.ruido('respiracion', CONFIG.ruido.exhalacionHonda);
    m.ruido('jadeo', CONFIG.ruido.jadeo);
    m.correr(0.5);
    expect(m.encuentro.fase).toBe('acercandose');
    expect(m.resultados).toEqual([]);
    m.ruido('paso', CONFIG.ruido.pasoCaminando);
    expect(m.resultados).toEqual([{ superado: false, causa: 'paso', pared: false }]);
    expect(m.encuentros).toEqual(['fallido']);
  });

  it('agachado y quieto mientras se arrastra no me delata (como con ella recién salida del muro)', () => {
    const m = armar();
    m.ruido('paso', CONFIG.ruido.pasoAgachado);
    expect(m.resultados).toEqual([]);
  });

  it('no se pone a escuchar mientras aguanto el aire ni con el aire a medias: espera a que lo recupere', () => {
    const m = armar();
    m.respiracion.aguantando = true;
    m.correr(ACERCARSE_MINIMO + 1);
    expect(m.encuentro.fase, 'aguantando antes de tiempo, sigue arrastrándose').toBe('acercandose');
    m.respiracion.aguantando = false;
    m.respiracion.aire = 0.6;
    m.correr(1);
    expect(m.encuentro.fase, 'con el aire a medias, todavía no').toBe('acercandose');
    m.respiracion.aire = 1;
    m.correr(0.1);
    expect(m.encuentro.fase).toBe('escuchando');
    expect(m.escuchas()).toBe(1);
    expect(m.encuentros).toEqual(['inicio']);
  });

  it('tiene un tope: aunque yo siga aguantando, a los segundos máximos se queda a escuchar', () => {
    const m = armar();
    m.respiracion.aguantando = true;
    m.correr(ACERCARSE_MAXIMO + 0.1);
    expect(m.encuentro.fase).toBe('escuchando');
  });

  it('escuchando: la gracia tapa mi respiración; después cualquier ruido mío me delata', () => {
    const m = armar();
    m.correr(ACERCARSE_MINIMO + 0.1);
    expect(m.encuentro.fase).toBe('escuchando');
    m.ruido('respiracion', CONFIG.ruido.exhalacionHonda);
    expect(m.resultados, 'durante la gracia').toEqual([]);
    m.correr(1);
    m.ruido('respiracion', CONFIG.ruido.exhalacionHonda);
    expect(m.resultados).toEqual([{ superado: false, causa: 'respiracion', pared: false }]);
  });

  it('si no oye nada en lo que dura el encuentro (el de la dificultad), lo supero', () => {
    const m = armar([3, 3]);
    m.correr(ACERCARSE_MINIMO + 0.1);
    m.correr(2.8);
    expect(m.resultados, 'todavía escucha').toEqual([]);
    m.correr(0.4);
    expect(m.resultados).toEqual([{ superado: true }]);
    expect(m.encuentros).toEqual(['inicio', 'superado']);
    m.ruido('carrera', 1);
    expect(m.resultados, 'terminado, ya no escucha').toHaveLength(1);
  });
});

/** Una cabina de mentira: viaja hacia donde le diga, y anota si la detienen o la sueltan. */
function armarEscena(banderas: string[] = []) {
  const respiracion = { aguantando: false, aire: 1 };
  const agendado: Array<() => void> = [];
  const ascensor = {
    viajandoHacia: 'piso1' as string | null,
    avanceViaje: 0.3,
    marco: { cx: 6.5, cz: 14.3 },
    pedidos: [] as string[],
    detener() {
      this.pedidos.push('detener');
      this.viajandoHacia = null;
      return true;
    },
    reanudar() {
      this.pedidos.push('reanudar');
    },
    /** Lo que le pasó a la trampilla del techo (aparte: no es el viaje). */
    trampilla: [] as string[],
    sacudirTrampilla(f: number) {
      this.trampilla.push(f.toFixed(2));
    },
    reventarTrampilla() {
      this.trampilla.push('revienta');
    },
  };
  const entidad = {
    estado: 'investigando',
    puedeManifestarse: true,
    pedidos: [] as string[],
    cambiarEstado(e: string) {
      this.estado = e;
    },
    manifestar() {
      this.pedidos.push('manifestar');
    },
    caerDesde(a: number) {
      this.pedidos.push(`caer:${a.toFixed(2)}`);
    },
    cazar(causa: string) {
      this.pedidos.push(`cazar:${causa}`);
    },
  };
  const marcadas = new Set(banderas);
  const falso = crearContextoFalso({
    nivel: { ascensor, lamparas: [], consultaOclusion: () => 0, consultaAislamiento: () => false },
    dificultad: { duracionEncuentro: [3, 3], graciaEncuentro: 0.9, oido: 1 },
    jugador: { posicion: { x: 6.5, y: 0, z: 14.3 }, respiracion, sumarEstres: () => undefined, sobresaltar: () => undefined, efectos: { agregarTrauma: () => undefined } },
    entidad,
    director: { activo: true, bloquear: () => undefined },
    progreso: { tiene: (b: string) => marcadas.has(b), marcar: (b: string) => marcadas.add(b) },
    programador: { ahora: 0, despues: (_t: number, f: () => void) => agendado.push(f) },
  });
  const subtitulos: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  falso.bus.on('sonido-relevante', (s) => subtitulos.push(s.descripcion));
  const escena = new CabinaDetenida();
  const jugar = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) escena.actualizar(0.05, falso.ctx);
  };
  const correrAgendado = () => agendado.splice(0).forEach((f) => f());
  return { escena, ascensor, entidad, marcadas, subtitulos, falso, jugar, correrAgendado, ctx: falso.ctx };
}

describe('La cabina se detiene entre el 2 y el 1 (P2-guion, momento 7)', () => {
  it('frena pasada la mitad del viaje al 1, no antes, y ella queda fuera del director', () => {
    const m = armarEscena();
    m.jugar(0.2);
    expect(m.ascensor.pedidos, 'al 30 % del viaje, nada').toEqual([]);
    m.ascensor.avanceViaje = AVANCE_PARA_FRENAR;
    m.jugar(0.1);
    expect(m.ascensor.pedidos).toEqual(['detener']);
    expect(m.ctx.director.activo).toBe(false);
    expect(m.entidad.puedeManifestarse).toBe(false);
    expect(m.entidad.estado).toBe('paredes');
    expect(m.subtitulos).toContain(TEXTOS_CABINA.frenazo);
  });

  it('a otros pisos, o si ya la superé, no frena', () => {
    const otra = armarEscena();
    otra.ascensor.viajandoHacia = 'piso4';
    otra.ascensor.avanceViaje = 0.9;
    otra.jugar(0.2);
    expect(otra.ascensor.pedidos).toEqual([]);
    const yaPaso = armarEscena([CABINA_SUPERADA]);
    yaPaso.ascensor.avanceViaje = 0.9;
    yaPaso.jugar(0.2);
    expect(yaPaso.ascensor.pedidos).toEqual([]);
  });

  it('si aguanto, se va trepando, queda superada y la cabina sigue bajando', () => {
    const m = armarEscena();
    m.ascensor.avanceViaje = 0.6;
    m.jugar(0.1);
    m.correrAgendado();
    expect(m.subtitulos).toContain(TEXTOS_CABINA.golpe);
    expect(m.ascensor.trampilla[0], 'el golpe sacude la trampilla').toBe('1.00');
    m.jugar(ACERCARSE_MINIMO + 3.5);
    expect(m.ascensor.trampilla, 'y cada rasguño la hace temblar').toContain('0.55');
    expect(m.marcadas.has(CABINA_SUPERADA)).toBe(true);
    expect(m.subtitulos).toContain(TEXTOS_CABINA.seVa);
    m.correrAgendado();
    expect(m.ascensor.pedidos).toEqual(['detener', 'reanudar']);
    expect(m.entidad.pedidos, 'no cae adentro').toEqual([]);
  });

  it('si me oye, revienta la trampilla y cae adentro: caza con la causa de lo que me delató', () => {
    const m = armarEscena();
    m.ascensor.avanceViaje = 0.6;
    m.jugar(0.1);
    m.correrAgendado();
    m.jugar(ACERCARSE_MINIMO + 0.1);
    m.jugar(1);
    m.falso.bus.emit('ruido', { x: 6.5, z: 14.3, intensidad: CONFIG.ruido.jadeo, origen: 'jugador', causa: 'jadeo' });
    expect(m.subtitulos).toContain(TEXTOS_CABINA.trampilla);
    expect(m.entidad.pedidos).toEqual(['manifestar', 'caer:2.25', 'cazar:jadeo']);
    expect(m.ascensor.trampilla.at(-1), 'cae por la trampilla').toBe('revienta');
    expect(m.marcadas.has(CABINA_SUPERADA)).toBe(false);
    expect(m.ascensor.pedidos, 'la cabina no sigue').toEqual(['detener']);
  });

  it('al cargar o morir (reiniciar) deja de escuchar: un ruido después no hace nada', () => {
    const m = armarEscena();
    m.ascensor.avanceViaje = 0.6;
    m.jugar(0.1);
    m.correrAgendado();
    m.escena.reiniciar();
    m.falso.bus.emit('ruido', { x: 6.5, z: 14.3, intensidad: 1, origen: 'jugador', causa: 'carrera' });
    expect(m.entidad.pedidos).toEqual([]);
  });
});
