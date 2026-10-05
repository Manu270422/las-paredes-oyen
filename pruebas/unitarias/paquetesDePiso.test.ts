// Coherencia de los paquetes de piso: lo que un piso declara tiene que existir en su propio mapa.
// Vale para TODOS los pisos del catálogo, así el próximo piso se valida solo.
import { describe, expect, it } from 'vitest';
import { Rejilla } from '../../src/mundo/Rejilla';
import { PISOS } from '../../src/pisos/catalogo';

describe('El catálogo de pisos', () => {
  it('no repite ids', () => {
    const ids = PISOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(PISOS.map((p) => [p.id, p] as const))('Paquete %s', (_id, piso) => {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const transitable = (x: number, y: number) => rejilla.esTransitable(Math.floor(x), Math.floor(y));

  it('su punto inicial existe en el mapa', () => {
    expect(piso.mapa.puntosControl[piso.puntoInicial], `el mapa no tiene el punto "${piso.puntoInicial}"`).toBeDefined();
  });

  it('cada bandera de punto de control lleva a un punto que existe en el mapa', () => {
    const rotos = Object.entries(piso.puntosControl)
      .filter(([, punto]) => piso.mapa.puntosControl[punto] === undefined)
      .map(([bandera, punto]) => `${bandera} → ${punto}`);
    expect(rotos).toEqual([]);
  });

  it('todos los puntos de control caen en una celda por donde se puede caminar', () => {
    const rotos = Object.entries(piso.mapa.puntosControl)
      .filter(([, p]) => !transitable(p.x, p.y))
      .map(([nombre]) => nombre);
    expect(rotos).toEqual([]);
  });

  it('la cámara del menú y la figura del fondo están en celdas transitables', () => {
    expect(transitable(piso.menu.camara.x, piso.menu.camara.y), 'cámara del menú').toBe(true);
    expect(transitable(piso.menu.figura.x, piso.menu.figura.y), 'figura del menú').toBe(true);
  });

  it('todo objetivo se completa con una bandera distinta (no hay dos objetivos con la misma)', () => {
    const banderas = piso.objetivos.map((o) => o.bandera);
    expect(new Set(banderas).size).toBe(banderas.length);
  });
});

describe.each(PISOS.map((p) => [p.id, p] as const))('Reglas de %s', (_id, piso) => {
  it('las banderas que despiertan a la criatura y revelan su imitación son banderas que el piso realmente otorga', () => {
    const otorgadas = new Set(piso.objetivos.map((o) => o.bandera));
    expect(otorgadas.has(piso.reglas.despiertaCon), 'despiertaCon no es la bandera de ningún objetivo').toBe(true);
    expect(otorgadas.has(piso.reglas.imitacionCompletaCon), 'imitacionCompletaCon no es la bandera de ningún objetivo').toBe(true);
  });

  it('la imitación completa llega DESPUÉS de despertar a la criatura', () => {
    const orden = piso.objetivos.map((o) => o.bandera);
    expect(orden.indexOf(piso.reglas.imitacionCompletaCon)).toBeGreaterThan(orden.indexOf(piso.reglas.despiertaCon));
  });
});

describe.each(PISOS.map((p) => [p.id, p] as const))('Luces por bandera de %s', (_id, piso) => {
  const idsLamparas = new Set(piso.mapa.lamparas.map((l) => l.id));
  const circuitos = new Set(piso.mapa.lamparas.map((l) => l.circuito));

  it('cada lámpara que nombra existe en el mapa', () => {
    const rotas = Object.entries(piso.luzPorBandera).flatMap(([bandera, cambio]) =>
      Object.keys(cambio.lamparas ?? {})
        .filter((id) => !idsLamparas.has(id))
        .map((id) => `${bandera} → lámpara ${id}`),
    );
    expect(rotas).toEqual([]);
  });

  it('cada circuito que nombra tiene al menos una lámpara', () => {
    const rotos = Object.entries(piso.luzPorBandera).flatMap(([bandera, cambio]) =>
      Object.keys(cambio.circuitos ?? {})
        .filter((c) => !circuitos.has(c))
        .map((c) => `${bandera} → circuito ${c}`),
    );
    expect(rotos).toEqual([]);
  });
});
