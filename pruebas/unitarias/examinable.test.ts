// Un examinable deja una línea flotando y una bandera; nunca abre el lector ni pausa nada (la criatura sigue
// oyendo). La tarjeta "nota" se queda según lo larga que sea; las demás tarjetas duran lo que siempre.
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import type { MapaEventos } from '../../src/nucleo/Eventos';
import { Progreso } from '../../src/narrativa/Progreso';
import { Examinable } from '../../src/interaccion/objetos/Examinable';
import { duracionTarjeta } from '../../src/ui/hud/TarjetaLugar';
import type { DefExaminable } from '../../src/pisos/TiposPiso';
import type { DefInteractuable } from '../../src/mundo/datos/TiposMapa';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { crearContextoFalso } from './contextoFalso';

const EXAMINABLES: Record<string, DefExaminable> = {
  regla: { modelo: 'palo', texto: 'Mirar la regla', linea: 'Una regla de madera, sin números.' },
  dibujo_raro: { modelo: 'dibujo', texto: 'Mirar el dibujo', linea: 'Una casa sin puertas.' },
};

function colocar(examinable: string, extra: Partial<DefInteractuable> = {}) {
  const def: DefInteractuable = { tipo: 'examinable', id: 'cosa1', examinable, x: 2, y: 3, ...extra };
  const falso = crearContextoFalso();
  const tarjetas: Array<MapaEventos['tarjeta']> = [];
  const banderas: string[] = [];
  falso.bus.on('tarjeta', (t) => tarjetas.push(t));
  falso.bus.on('bandera', (b) => banderas.push(b.nombre));
  const progreso = new Progreso(falso.bus, [], { directorDesde: 'x', despiertaCon: 'x', imitacionCompletaCon: 'y' });
  const abiertos: string[] = [];
  const ctx = { ...falso.ctx, progreso, ui: { abrirDocumento: (id: string) => abiertos.push(id) } } as unknown as ContextoJuego;
  return { examinable: new Examinable(def, EXAMINABLES), ctx, progreso, tarjetas, banderas, abiertos };
}

describe('Examinable', () => {
  it('al examinarlo flota su línea como nota (sin título aparte) y queda la bandera examinado:<id>', () => {
    const { examinable, ctx, progreso, tarjetas } = colocar('regla');
    examinable.interactuar(ctx);
    expect(tarjetas).toEqual([{ titulo: 'Una regla de madera, sin números.', subtitulo: '', estilo: 'nota' }]);
    expect(progreso.tiene('examinado:cosa1')).toBe(true);
  });

  it('no abre el lector de documentos: el mundo no se pausa', () => {
    const { examinable, ctx, abiertos } = colocar('regla');
    examinable.interactuar(ctx);
    expect(abiertos).toEqual([]);
  });

  it('se puede volver a mirar: la línea sale cada vez, la bandera se marca una sola', () => {
    const { examinable, ctx, tarjetas, banderas } = colocar('regla');
    examinable.interactuar(ctx);
    examinable.interactuar(ctx);
    expect(tarjetas).toHaveLength(2);
    expect(banderas.filter((b) => b === 'examinado:cosa1')).toHaveLength(1);
    expect(examinable.activo, 'sigue enfocable').toBe(true);
  });

  it('dice el texto de su declaración', () => {
    expect(colocar('regla').examinable.texto()).toBe('Mirar la regla');
    expect(colocar('dibujo_raro').examinable.texto()).toBe('Mirar el dibujo');
  });

  it('la mirada apunta a donde está lo que se mira: a media altura del palo, en el centro del dibujo', () => {
    const palo = colocar('regla').examinable;
    palo.objeto.updateMatrixWorld(true);
    const punto = palo.puntoInteraccion(new Vector3());
    expect(punto.y, 'a media altura del palo, no en el piso').toBeGreaterThan(0.6);
    // Recostado hacia el muro (-z): la mirada queda un poco más cerca del muro que la base.
    expect(punto.z).toBeLessThan(3 * CONFIG.celda);
    expect(punto.z).toBeGreaterThan(3 * CONFIG.celda - 0.2);

    const dibujo = colocar('dibujo_raro', { altura: 1.05 }).examinable;
    dibujo.objeto.updateMatrixWorld(true);
    const centro = dibujo.puntoInteraccion(new Vector3());
    expect(centro.y).toBeCloseTo(1.05, 2);
    expect(centro.x).toBeCloseTo(2 * CONFIG.celda, 2);
  });

  it('algo que el piso no declara es un error claro, no un fallo silencioso', () => {
    expect(() => colocar('no_existe')).toThrow(/no está en los examinables del piso/);
  });
});

describe('Duración de las tarjetas', () => {
  it('la nota se queda más cuanto más larga es, y nunca menos de lo que tarda en encontrarse', () => {
    const corta = duracionTarjeta('nota', 'Una casa.');
    const larga = duracionTarjeta('nota', 'Un niño de palitos y, detrás, alguien muy alto sin cara. Abajo dice: «el que mide».');
    expect(larga).toBeGreaterThan(corta);
    expect(corta).toBeGreaterThanOrEqual(2000);
    // Una línea de 85 letras se lee con calma (a menos de 15 letras por segundo) sin quedarse pegada.
    expect(larga).toBeGreaterThan(5500);
    expect(larga).toBeLessThan(8000);
  });

  it('las demás tarjetas no dependen del texto', () => {
    expect(duracionTarjeta('discreta', 'A')).toBe(duracionTarjeta('discreta', 'Apartamento 301'));
    expect(duracionTarjeta('cine', 'A')).toBe(duracionTarjeta('cine', 'Edificio Almendros'));
  });
});
