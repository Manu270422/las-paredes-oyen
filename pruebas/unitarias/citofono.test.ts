// El citófono de la portería (P1-guion, tanda 2) sin navegador: pulsar un botón hace un clic pequeño donde estoy (un
// ruido mío) y su timbre suena lejos, tres veces (un ruido fuerte del entorno, que ella va a ver); la línea queda
// ocupada un rato y, mientras, los botones no hacen nada. Y cuando llama ella: el panel timbra sin atraerla, la línea
// que llama dice "Contestar", dejarla sonar avisa una vez, y contestar es mi clic hasta que el guion cuelga.
import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import {
  Citofono,
  ESPERA_CITOFONO,
  RUIDO_BOTON,
  RUIDO_TIMBRE,
  SIGUE_OCUPADA,
  TEXTO_CONTESTAR,
  TEXTO_OCUPADO,
  TIMBRES_ENTRANTES,
  TIMBRES_SEGUIDOS,
} from '../../src/interaccion/objetos/Citofono';
import type { VistaCitofono } from '../../src/interaccion/objetos/ModeloCitofono';
import type { DefInteractuable } from '../../src/mundo/datos/TiposMapa';
import type { MapaEventos } from '../../src/nucleo/Eventos';
import { crearContextoFalso } from './contextoFalso';

const DEF: DefInteractuable = {
  tipo: 'citofono',
  id: 'panel',
  x: 28.96,
  y: 11.3,
  rot: -90,
  timbres: [
    { id: 'lejos', rotulo: 'Lejos', texto: 'Timbrar lejos', suena: 'el timbre de lejos', x: 5.5, y: 11.5 },
    { id: 'arriba', rotulo: 'Arriba', texto: 'Timbrar arriba', suena: 'el timbre de arriba', x: 16.8, y: 1.1 },
  ],
};

/** Un dibujo falso que solo anota qué luces quedaron prendidas. */
function vistaFalsa() {
  const luces = new Map<number, boolean>();
  const estado = { ocupado: false };
  const vista: VistaCitofono = {
    grupo: new Group(),
    posicionBoton: (i) => ({ x: 0.05, y: 0.1 - i * 0.075, z: 0.04 }),
    fijarLuz: (i, encendida) => luces.set(i, encendida),
    fijarOcupado: (ocupado) => {
      estado.ocupado = ocupado;
    },
  };
  return { vista, luces, estado };
}

function armar() {
  const falso = crearContextoFalso();
  falso.ctx.jugador.posicion.x = 37.0;
  falso.ctx.jugador.posicion.z = 14.7;
  const { vista, luces, estado } = vistaFalsa();
  const citofono = new Citofono(DEF, vista);
  const eventos: Array<MapaEventos['citofono']> = [];
  const subtitulos: string[] = [];
  const relevantes: string[] = [];
  falso.bus.on('citofono', (e) => eventos.push(e));
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  falso.bus.on('sonido-relevante', (s) => relevantes.push(s.descripcion));
  const esperar = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) citofono.actualizar(0.05, falso.ctx);
  };
  return { falso, citofono, luces, estado, eventos, subtitulos, relevantes, esperar };
}

describe('El citófono de la portería', () => {
  it('un botón por timbre, cada uno con lo que dice el mapa', () => {
    const m = armar();
    expect(m.citofono.botones.map((b) => b.id)).toEqual(['panel:lejos', 'panel:arriba']);
    expect(m.citofono.botones.map((b) => b.texto(m.falso.ctx))).toEqual(['Timbrar lejos', 'Timbrar arriba']);
    expect(m.citofono.libre).toBe(true);
  });

  it('pulsar: un clic pequeño donde estoy (mío) y, enseguida, su timbre lejos, tres veces y fuerte (ella lo oye)', () => {
    const m = armar();
    m.citofono.botones[0].interactuar(m.falso.ctx);
    expect(m.falso.ruidos).toHaveLength(1);
    expect(m.falso.ruidos[0], 'el clic: donde estoy, pequeño, mío').toMatchObject({ x: 37.0, z: 14.7, intensidad: RUIDO_BOTON, origen: 'jugador', causa: 'citofono' });
    expect(RUIDO_BOTON, 'menos que un paso caminando').toBeLessThan(CONFIG.ruido.pasoCaminando);
    expect(m.luces.get(0), 'la luz del botón se prende').toBe(true);
    m.esperar(5);
    const timbres = m.falso.ruidos.slice(1);
    expect(timbres).toHaveLength(TIMBRES_SEGUIDOS);
    for (const r of timbres) {
      expect(r).toMatchObject({ x: 5.5 * CONFIG.celda, z: 11.5 * CONFIG.celda, intensidad: RUIDO_TIMBRE, origen: 'entorno', causa: 'citofono' });
    }
    expect(m.falso.sonidos.filter((s) => s === 'timbre')).toHaveLength(TIMBRES_SEGUIDOS);
    expect(m.relevantes, 'su subtítulo, una vez, con dirección').toEqual(['el timbre de lejos']);
    expect(m.luces.get(0), 'al terminar de sonar se apaga').toBe(false);
    expect(m.eventos).toEqual([{ accion: 'timbre', timbre: 'lejos' }]);
  });

  it('después, la línea queda ocupada: los botones no hacen ruido ni timbran hasta que pasa la espera', () => {
    const m = armar();
    m.citofono.botones[0].interactuar(m.falso.ctx);
    m.esperar(5);
    expect(m.citofono.libre).toBe(false);
    expect(m.estado.ocupado, 'la luz roja de ocupado').toBe(true);
    expect(m.citofono.botones[1].texto(m.falso.ctx)).toBe(TEXTO_OCUPADO);
    const ruidos = m.falso.ruidos.length;
    m.citofono.botones[1].interactuar(m.falso.ctx);
    m.esperar(3);
    expect(m.falso.ruidos.length, 'ocupado no suena').toBe(ruidos);
    expect(m.subtitulos).toContain(SIGUE_OCUPADA);
    expect(m.eventos.at(-1)).toEqual({ accion: 'ocupado', timbre: 'arriba' });
    m.esperar(ESPERA_CITOFONO - 8 + 0.2);
    expect(m.citofono.libre).toBe(true);
    expect(m.estado.ocupado).toBe(false);
    expect(m.citofono.botones[1].texto(m.falso.ctx)).toBe('Timbrar arriba');
  });

  it('cuando llama ella: timbra aquí sin atraerla, la línea parpadea y dice "Contestar"; las otras, ocupadas', () => {
    const m = armar();
    let ignorada = 0;
    expect(m.citofono.llamarDesde('arriba', m.falso.ctx, () => undefined, () => ignorada++)).toBe(true);
    m.esperar(0.3);
    expect(m.falso.sonidos).toContain('timbre');
    expect(m.falso.ruidos, 'la que llama es ella: su timbre no es un ruido para ella').toHaveLength(0);
    expect(m.citofono.botones[1].texto(m.falso.ctx)).toBe(TEXTO_CONTESTAR);
    expect(m.citofono.botones[0].texto(m.falso.ctx)).toBe(TEXTO_OCUPADO);
    expect(m.luces.get(1), 'su luz prendida (parpadea)').toBe(true);
    m.esperar(1.5);
    expect(m.luces.get(1), 'y se apaga entre timbres').toBe(false);
    expect(m.relevantes).toEqual(['el citófono suena']);
    expect(m.eventos[0]).toEqual({ accion: 'llamada', timbre: 'arriba' });
    // Pulsar otra línea mientras suena: ocupado, sin ruido.
    m.citofono.botones[0].interactuar(m.falso.ctx);
    expect(m.falso.ruidos).toHaveLength(0);
    expect(ignorada).toBe(0);
  });

  it('si nadie contesta, suena sus veces, se calla y avisa una sola vez', () => {
    const m = armar();
    let ignorada = 0;
    m.citofono.llamarDesde('arriba', m.falso.ctx, () => undefined, () => ignorada++);
    m.esperar(TIMBRES_ENTRANTES * 2.2 + 1);
    expect(m.falso.sonidos.filter((s) => s === 'timbre')).toHaveLength(TIMBRES_ENTRANTES);
    expect(ignorada).toBe(1);
    expect(m.eventos.at(-1)).toEqual({ accion: 'ignorada', timbre: 'arriba' });
    expect(m.citofono.libre).toBe(true);
    expect(m.luces.get(1)).toBe(false);
    m.esperar(10);
    expect(ignorada).toBe(1);
  });

  it('contestar es mi clic; la línea queda ocupada hasta que el guion cuelga', () => {
    const m = armar();
    let contestada = 0;
    m.citofono.llamarDesde('arriba', m.falso.ctx, () => contestada++, () => undefined);
    m.esperar(1);
    m.citofono.botones[1].interactuar(m.falso.ctx);
    expect(contestada).toBe(1);
    expect(m.falso.ruidos).toEqual([expect.objectContaining({ origen: 'jugador', causa: 'citofono', intensidad: RUIDO_BOTON })]);
    expect(m.citofono.llamando).toBe(false);
    m.esperar(20);
    expect(m.citofono.libre, 'en la línea: ocupado').toBe(false);
    expect(m.citofono.botones[0].texto(m.falso.ctx)).toBe(TEXTO_OCUPADO);
    expect(m.falso.sonidos.filter((s) => s === 'timbre').length, 'ya no timbra').toBeLessThanOrEqual(1);
    m.citofono.colgar(m.falso.ctx);
    expect(m.eventos.map((e) => e.accion)).toEqual(['llamada', 'contestada', 'colgada']);
    m.esperar(3.2);
    expect(m.citofono.libre).toBe(true);
  });

  it('no llama si la línea no existe o el citófono está ocupado; al cargar queda todo apagado y libre', () => {
    const m = armar();
    expect(m.citofono.llamarDesde('noExiste', m.falso.ctx, () => undefined, () => undefined)).toBe(false);
    m.citofono.botones[0].interactuar(m.falso.ctx);
    expect(m.citofono.llamarDesde('arriba', m.falso.ctx, () => undefined, () => undefined), 'ocupado: que vuelva a intentar').toBe(false);
    m.citofono.restablecer();
    expect(m.citofono.libre).toBe(true);
    expect(m.luces.get(0)).toBe(false);
    expect(m.estado.ocupado).toBe(false);
    m.esperar(5);
    expect(m.falso.ruidos, 'el timbre a medias no suena después de cargar').toHaveLength(1);
  });

  it('sin timbres, el mapa está mal', () => {
    expect(() => new Citofono({ ...DEF, timbres: [] }, vistaFalsa().vista)).toThrow(/no tiene timbres/);
  });
});
