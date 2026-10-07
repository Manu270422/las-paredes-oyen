// Un recogible hace lo que SU DECLARACIÓN dice (pilas recargan, la llave se guarda), no lo que diga
// su nombre: el motor ya no conoce "la llave del 402".
import { describe, expect, it } from 'vitest';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { Progreso } from '../../src/narrativa/Progreso';
import { Recogible } from '../../src/interaccion/objetos/Recogible';
import type { DefObjetoRecogible } from '../../src/pisos/TiposPiso';
import type { DefInteractuable } from '../../src/mundo/datos/TiposMapa';
import { crearContextoFalso } from './contextoFalso';

const OBJETOS: Record<string, DefObjetoRecogible> = {
  baterias: { modelo: 'pilas', texto: 'Recoger baterías', mensaje: 'Baterías.', duracionMensaje: 2, recargaLinterna: 0.3 },
  tarjeta_azul: { modelo: 'llave', texto: 'Tomar la tarjeta azul', mensaje: 'Una tarjeta azul.', duracionMensaje: 3, guardaEnInventario: true },
};

function colocar(objeto: string, aparece?: string) {
  const def: DefInteractuable = { tipo: 'recogible', id: 'cosa1', objeto, x: 1, y: 1, aparece };
  const falso = crearContextoFalso();
  const recargas: number[] = [];
  const subtitulos: Array<{ texto: string; duracion?: number }> = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push({ texto: s.texto, duracion: s.duracion }));
  const progreso = new Progreso(falso.bus, [], { directorDesde: 'x', despiertaCon: 'x', imitacionCompletaCon: 'y' });
  const ctx = { ...falso.ctx, progreso, linterna: { recargar: (n: number) => recargas.push(n) } } as unknown as ContextoJuego;
  return { recogible: new Recogible(def, OBJETOS), ctx, progreso, recargas, subtitulos };
}

describe('Recogible', () => {
  it('uno que aparece con una bandera no existe antes (ni se ve ni se toma); con ella, sí; tomado, ya no', () => {
    const { recogible, ctx, progreso } = colocar('tarjeta_azul', 'final_visto');
    recogible.restablecer(ctx);
    expect(recogible.activo, 'antes de la bandera').toBe(false);
    progreso.marcar('final_visto');
    recogible.restablecer(ctx);
    expect(recogible.activo, 'con la bandera').toBe(true);
    recogible.interactuar(ctx);
    recogible.restablecer(ctx);
    expect(recogible.activo, 'tomado no vuelve aunque la bandera siga').toBe(false);
  });

  it('muestra el texto de su declaración', () => {
    expect(colocar('baterias').recogible.texto()).toBe('Recoger baterías');
    expect(colocar('tarjeta_azul').recogible.texto()).toBe('Tomar la tarjeta azul');
  });

  it('un objeto con recarga alimenta la linterna y NO entra al inventario', () => {
    const { recogible, ctx, progreso, recargas, subtitulos } = colocar('baterias');
    recogible.interactuar(ctx);
    expect(recargas).toEqual([0.3]);
    expect(progreso.tieneObjeto('baterias')).toBe(false);
    expect(subtitulos).toEqual([{ texto: 'Baterías.', duracion: 2 }]);
    expect(recogible.activo, 'una vez tomado ya no se puede enfocar').toBe(false);
  });

  it('un objeto que se guarda entra al inventario con su id y NO recarga nada', () => {
    const { recogible, ctx, progreso, recargas, subtitulos } = colocar('tarjeta_azul');
    recogible.interactuar(ctx);
    expect(progreso.tieneObjeto('tarjeta_azul')).toBe(true);
    expect(progreso.tiene('objeto:tarjeta_azul')).toBe(true);
    expect(recargas).toEqual([]);
    expect(subtitulos).toEqual([{ texto: 'Una tarjeta azul.', duracion: 3 }]);
  });

  it('al cargar una partida, un objeto ya recogido no vuelve a aparecer', () => {
    const { recogible, ctx, progreso } = colocar('baterias');
    recogible.interactuar(ctx);
    recogible.restablecer(ctx);
    expect(recogible.activo).toBe(false);
    progreso.importar(null);
    recogible.restablecer(ctx);
    expect(recogible.activo).toBe(true);
  });

  it('un objeto que el piso no declara es un error claro, no un fallo silencioso', () => {
    expect(() => colocar('no_existe')).toThrow(/no está en los objetos del piso/);
  });
});
