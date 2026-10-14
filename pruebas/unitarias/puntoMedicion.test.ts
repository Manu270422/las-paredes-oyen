// La X de cinta roja: solo se graba cuando le toca (es el objetivo actual). Si no le toca, dice qué falta de verdad,
// el objetivo que va primero, en cualquier piso. Antes decía "Primero lo que dice la orden de trabajo", que solo
// tenía sentido en el Piso 4 y en el 3 dejaba al jugador sin saber qué hacer.
import { describe, expect, it } from 'vitest';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { Progreso } from '../../src/narrativa/Progreso';
import { PuntoMedicion } from '../../src/interaccion/objetos/PuntoMedicion';
import type { DefInteractuable } from '../../src/mundo/datos/TiposMapa';
import type { Objetivo } from '../../src/narrativa/TiposNarrativa';
import { crearContextoFalso } from './contextoFalso';

const OBJETIVOS: Objetivo[] = [
  { id: 'leer', texto: 'Lee el aviso del portero', bandera: 'leyo:aviso' },
  { id: 'medir', texto: 'Mide la sala del 201', bandera: 'medido:201' },
];

function colocar(extra: Partial<DefInteractuable> = {}) {
  const falso = crearContextoFalso();
  const subtitulos: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  const progreso = new Progreso(falso.bus, OBJETIVOS, { directorDesde: 'x', despiertaCon: 'x', imitacionCompletaCon: 'y' });
  const iniciadas: string[] = [];
  const grabadora = { midiendo: false, iniciarMedicion: (p: PuntoMedicion) => iniciadas.push(p.apartamento) };
  const ctx = { ...falso.ctx, progreso, grabadora } as unknown as ContextoJuego;
  const punto = new PuntoMedicion({ tipo: 'medicion', id: 'medir201', apartamento: '201', x: 1, y: 1, ...extra });
  return { punto, ctx, progreso, subtitulos, iniciadas };
}

describe('PuntoMedicion', () => {
  it('si no le toca, no graba y dice el objetivo que va primero', () => {
    const { punto, ctx, subtitulos, iniciadas } = colocar();
    punto.interactuar(ctx);
    expect(iniciadas).toEqual([]);
    expect(subtitulos).toEqual(['Todavía no. Antes: lee el aviso del portero.']);
  });

  it('cuando le toca, empieza a grabar', () => {
    const { punto, ctx, progreso, subtitulos, iniciadas } = colocar();
    progreso.marcar('leyo:aviso');
    punto.interactuar(ctx);
    expect(iniciadas).toEqual(['201']);
    expect(subtitulos).toEqual([]);
  });

  it('el indicador dice lo que trae el mapa, o medir la sala si no trae nada', () => {
    const { punto, ctx } = colocar();
    expect(punto.texto(ctx)).toBe('Medir la sala del 201 (quédate quieto)');
    const conAccion = colocar({ accion: 'Grabar la pared (quédate quieto)' });
    expect(conAccion.punto.texto(conAccion.ctx)).toBe('Grabar la pared (quédate quieto)');
  });
});
