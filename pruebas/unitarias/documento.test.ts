// Un documento en el mundo: el indicador dice lo que el documento declara ("Leer el cuaderno") y, si no
// declara nada, lo de su tipo. Al leerlo queda registrado y la interfaz abre ESE documento.
import { describe, expect, it } from 'vitest';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { Progreso } from '../../src/narrativa/Progreso';
import { Documento } from '../../src/interaccion/objetos/Documento';
import type { Documento as DatosDocumento } from '../../src/narrativa/TiposNarrativa';
import { crearContextoFalso } from './contextoFalso';

const DOCUMENTOS: Record<string, DatosDocumento> = {
  libreta: { id: 'libreta', titulo: 'Libreta', tipo: 'diario', paginas: ['…'], accion: 'Leer el cuaderno' },
  diario_viejo: { id: 'diario_viejo', titulo: 'Diario', tipo: 'diario', paginas: ['…'] },
  suelta: { id: 'suelta', titulo: 'Hoja', tipo: 'hoja', paginas: ['…'] },
  casete: { id: 'casete', titulo: 'Casete', tipo: 'cinta', paginas: ['…'] },
};

const poner = (documento: string) => new Documento({ tipo: 'documento', id: `doc_${documento}`, documento, x: 1, y: 1 }, DOCUMENTOS);

describe('Documento', () => {
  it('el indicador dice lo que el documento declara', () => {
    expect(poner('libreta').texto()).toBe('Leer el cuaderno');
  });

  it('sin declaración, el indicador dice lo de su tipo', () => {
    expect(poner('diario_viejo').texto()).toBe('Leer el diario');
    expect(poner('suelta').texto()).toBe('Leer');
    expect(poner('casete').texto()).toBe('Leer la carátula del casete');
  });

  it('al leerlo queda la bandera leyo:<id> y se abre ese documento', () => {
    const falso = crearContextoFalso();
    const progreso = new Progreso(falso.bus, [], { directorDesde: 'x', despiertaCon: 'x', imitacionCompletaCon: 'y' });
    const abiertos: string[] = [];
    const ctx = { ...falso.ctx, progreso, ui: { abrirDocumento: (id: string) => abiertos.push(id) } } as unknown as ContextoJuego;
    poner('suelta').interactuar(ctx);
    expect(progreso.tiene('leyo:suelta')).toBe(true);
    expect(abiertos).toEqual(['suelta']);
  });
});
