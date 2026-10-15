// La puerta principal (la salida del edificio, P1-guion) sin navegador: tres cerraduras en orden, cada una con su
// momento y su ruido (de puerta: ella viene a investigar); la última pide la llave; abierta del todo marca la bandera
// de salida; y al cargar, queda como diga el progreso.
import { describe, expect, it } from 'vitest';
import { CERRADURAS, PuertaPrincipal, banderaCerradura } from '../../src/interaccion/objetos/PuertaPrincipal';
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
  it('se abren en orden: cadena, cerrojo y llave; cada una con su ruido de puerta y su bandera', () => {
    const m = armar([], ['llaves']);
    expect(m.puerta.texto(m.falso.ctx)).toBe(CERRADURAS[0].accion);
    m.puerta.interactuar(m.falso.ctx);
    expect(m.puerta.activo, 'mientras quito la cadena no respondo').toBe(false);
    expect(m.falso.ruidos.at(-1)).toMatchObject({ origen: 'puerta', causa: 'puerta', intensidad: CERRADURAS[0].ruido });
    m.esperar(CERRADURAS[0].duracion + 0.1);
    expect(m.marcadas.has(banderaCerradura(1))).toBe(true);
    expect(m.puerta.texto(m.falso.ctx)).toBe(CERRADURAS[1].accion);
    m.puerta.interactuar(m.falso.ctx);
    m.esperar(CERRADURAS[1].duracion + 0.1);
    expect(m.puerta.texto(m.falso.ctx)).toBe(CERRADURAS[2].accion);
    m.puerta.interactuar(m.falso.ctx);
    m.esperar(CERRADURAS[2].duracion + 0.1);
    expect(m.puerta.cerradurasAbiertas).toBe(3);
    expect(m.marcadas.has('puerta:abierta'), 'abierta del todo: la bandera de salida').toBe(true);
    expect(m.puerta.activo, 'abierta, ya no hay nada que hacer en ella').toBe(false);
    expect(m.falso.ruidos.map((r) => r.causa)).toEqual(['puerta', 'puerta', 'puerta']);
  });

  it('la última pide la llave: sin ella dice que falta, suena la cerradura y no avanza', () => {
    const m = armar([banderaCerradura(1), banderaCerradura(2)]);
    expect(m.puerta.cerradurasAbiertas).toBe(2);
    expect(m.puerta.texto(m.falso.ctx)).toBe('Cerrada con llave');
    m.puerta.interactuar(m.falso.ctx);
    expect(m.subtitulos.at(-1)).toContain('Falta la llave');
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
