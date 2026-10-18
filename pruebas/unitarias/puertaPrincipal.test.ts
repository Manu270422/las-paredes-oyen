// La puerta principal (la salida del edificio, P1-guion) sin navegador: tres cerraduras en orden. Abrir una es un
// momento (tanda 3): un ruido mío bajito al empezar y uno fuerte cuando cede, los dos de causa 'cerradura' (ella me
// puede delatar por ellos, y la puerta la llama); alejarme a medias la suelta sin que suene su final; la última pide
// la llave; abierta del todo marca la bandera de salida; y al cargar, queda como diga el progreso.
import { describe, expect, it } from 'vitest';
import { ALEJARSE_LA_SUELTA, CERRADURAS, PuertaPrincipal, RUIDO_EMPEZAR, banderaCerradura } from '../../src/interaccion/objetos/PuertaPrincipal';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import type { DefInteractuable } from '../../src/mundo/datos/TiposMapa';
import { crearContextoFalso } from './contextoFalso';

const DEF: DefInteractuable = { tipo: 'salida', id: 'puerta', x: 16, y: 13.98, rot: 180, objeto: 'llaves', bandera: 'puerta:abierta' };

function armar(banderas: string[] = [], inventario: string[] = []) {
  const marcadas = new Set(banderas);
  const falso = crearContextoFalso({
    progreso: {
      tiene: (b: string) => marcadas.has(b),
      marcar: (b: string) => marcadas.add(b),
      tieneObjeto: (o: string) => inventario.includes(o),
    },
  });
  // Frente a la puerta, como en el juego.
  falso.ctx.jugador.posicion.x = 16 * CONFIG.celda;
  falso.ctx.jugador.posicion.z = 12.9 * CONFIG.celda;
  const subtitulos: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  const puerta = new PuertaPrincipal(DEF);
  puerta.restablecer(falso.ctx);
  const esperar = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) puerta.actualizar(0.05, falso.ctx);
  };
  return { puerta, marcadas, falso, subtitulos, esperar, inventario };
}

describe('La puerta principal y sus tres cerraduras', () => {
  it('abrir una es un momento: bajito al empezar, fuerte al ceder (ruidos míos); las tres en orden, con su bandera', () => {
    const m = armar([], ['llaves']);
    for (const [i, c] of CERRADURAS.entries()) {
      expect(m.puerta.texto(m.falso.ctx)).toBe(c.accion);
      m.puerta.interactuar(m.falso.ctx);
      expect(m.puerta.activo, 'mientras la giro no respondo').toBe(false);
      expect(m.puerta.girando).toBe(true);
      expect(m.falso.ruidos.at(-1), 'al empezar, un forcejeo bajito').toMatchObject({ origen: 'jugador', causa: 'cerradura', intensidad: RUIDO_EMPEZAR });
      expect(m.subtitulos.at(-1)).toBe(c.empieza);
      m.esperar(c.duracion - 0.2);
      expect(m.marcadas.has(banderaCerradura(i + 1)), 'todavía no cede').toBe(false);
      m.esperar(0.3);
      expect(m.falso.ruidos.at(-1), 'cuando cede, fuerte').toMatchObject({ origen: 'jugador', causa: 'cerradura', intensidad: c.ruido });
      expect(m.subtitulos.at(-1)).toBe(c.cede);
      expect(m.marcadas.has(banderaCerradura(i + 1))).toBe(true);
    }
    expect(m.puerta.cerradurasAbiertas).toBe(3);
    expect(m.marcadas.has('puerta:abierta'), 'abierta del todo: la bandera de salida').toBe(true);
    expect(m.puerta.activo, 'abierta, ya no hay nada que hacer en ella').toBe(false);
    expect(m.falso.ruidos).toHaveLength(6);
    expect(RUIDO_EMPEZAR, 'empezar suena menos que un paso').toBeLessThan(CONFIG.ruido.pasoCaminando);
  });

  it('cada una dura más que el viaje de una cerradura a otra: abrir las tres seguidas tarda', () => {
    const total = CERRADURAS.reduce((s, c) => s + c.duracion, 0);
    expect(total).toBeGreaterThanOrEqual(8);
  });

  it('si me alejo a medias, la suelto: no cede, no suena su final y hay que empezarla otra vez', () => {
    const m = armar([], ['llaves']);
    m.puerta.interactuar(m.falso.ctx);
    m.esperar(1);
    m.falso.ctx.jugador.posicion.z -= ALEJARSE_LA_SUELTA + 0.1;
    m.esperar(CERRADURAS[0].duracion);
    expect(m.puerta.girando).toBe(false);
    expect(m.puerta.cerradurasAbiertas).toBe(0);
    expect(m.marcadas.has(banderaCerradura(1))).toBe(false);
    expect(m.falso.ruidos, 'solo el forcejeo del principio').toHaveLength(1);
    expect(m.subtitulos.at(-1)).toBe(CERRADURAS[0].suelta);
    expect(m.puerta.activo, 'se puede empezar otra vez').toBe(true);
    expect(m.puerta.texto(m.falso.ctx)).toBe(CERRADURAS[0].accion);
  });

  it('avisa lo que pasa con cada cerradura (para la telemetría): empieza, se suelta o cede, con su número', () => {
    const m = armar([], ['llaves']);
    const eventos: string[] = [];
    m.falso.bus.on('cerradura', (e) => eventos.push(`${e.accion}:${e.numero}`));
    m.puerta.interactuar(m.falso.ctx);
    m.falso.ctx.jugador.posicion.z -= ALEJARSE_LA_SUELTA + 0.1;
    m.esperar(0.2);
    m.falso.ctx.jugador.posicion.z += ALEJARSE_LA_SUELTA + 0.1;
    m.puerta.interactuar(m.falso.ctx);
    m.esperar(CERRADURAS[0].duracion + 0.1);
    m.puerta.interactuar(m.falso.ctx);
    expect(eventos).toEqual(['empieza:1', 'suelta:1', 'empieza:1', 'cede:1', 'empieza:2']);
  });

  it('moverme un poco frente a la puerta no la suelta', () => {
    const m = armar([], ['llaves']);
    m.puerta.interactuar(m.falso.ctx);
    m.falso.ctx.jugador.posicion.x += ALEJARSE_LA_SUELTA - 0.2;
    m.esperar(CERRADURAS[0].duracion + 0.1);
    expect(m.puerta.cerradurasAbiertas).toBe(1);
  });

  it('la última pide la llave: sin ella dice que falta, suena bajito y no avanza', () => {
    const m = armar([banderaCerradura(1), banderaCerradura(2)]);
    expect(m.puerta.cerradurasAbiertas).toBe(2);
    expect(m.puerta.texto(m.falso.ctx)).toBe('Cerrada con llave');
    m.puerta.interactuar(m.falso.ctx);
    expect(m.subtitulos.at(-1)).toContain('Falta la llave');
    expect(m.falso.ruidos.at(-1)).toMatchObject({ origen: 'jugador', causa: 'cerradura', intensidad: RUIDO_EMPEZAR });
    m.esperar(3);
    expect(m.puerta.cerradurasAbiertas).toBe(2);
    expect(m.marcadas.has('puerta:abierta')).toBe(false);
  });

  it('pulsar otra vez a mitad de una cerradura no hace nada (ni otro ruido)', () => {
    const m = armar([], ['llaves']);
    m.puerta.interactuar(m.falso.ctx);
    m.puerta.interactuar(m.falso.ctx);
    expect(m.falso.ruidos).toHaveLength(1);
  });

  it('al cargar, las cerraduras abiertas son las que dice el progreso (en orden)', () => {
    expect(armar([banderaCerradura(1)]).puerta.cerradurasAbiertas).toBe(1);
    expect(armar([banderaCerradura(2)]).puerta.cerradurasAbiertas, 'sin la primera, ninguna').toBe(0);
    expect(armar([banderaCerradura(1), banderaCerradura(2), banderaCerradura(3)]).puerta.activo).toBe(false);
  });
});
