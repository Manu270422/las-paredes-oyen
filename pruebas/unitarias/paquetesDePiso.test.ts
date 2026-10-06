// Coherencia de los paquetes de piso: lo que un piso declara tiene que existir en su propio mapa.
// Vale para TODOS los pisos del catálogo, así el próximo piso se valida solo.
import { describe, expect, it } from 'vitest';
import type { Direccion } from '../../src/mundo/datos/TiposMapa';
import { encontrarHuecos } from '../../src/mundo/HuecoEscalera';
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

  it('los puntos de control "mayores" (los de Difícil) son puntos de control del paquete', () => {
    const rotos = (piso.puntosControlMayores ?? []).filter((b) => !(b in piso.puntosControl));
    expect(rotos).toEqual([]);
  });

  it('todos los puntos de control caen en una celda por donde se puede caminar', () => {
    const rotos = Object.entries(piso.mapa.puntosControl)
      .filter(([, p]) => !transitable(p.x, p.y))
      .map(([nombre]) => nombre);
    expect(rotos).toEqual([]);
  });

  it('el viento (si lo hay) sopla desde el aire (una celda libre o el hueco de una escalera), no desde un muro', () => {
    const v = piso.mapa.viento;
    if (!v) return;
    // Miro las celdas que tocan el punto: si está justo en una esquina, me basta con que una sea aire.
    const vecinas = [[0, 0], [-1, 0], [0, -1], [-1, -1]].map(([dx, dy]) => !rejilla.esMuro(Math.floor(v.x + dx * 0.01), Math.floor(v.y + dy * 0.01)));
    expect(vecinas.some(Boolean), `el viento en (${v.x}, ${v.y}) está dentro de un muro`).toBe(true);
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

describe.each(PISOS.map((p) => [p.id, p] as const))('Huecos de escalera de %s', (_id, piso) => {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const enHueco = (x: number, y: number) => rejilla.esHueco(Math.floor(x), Math.floor(y));

  it('cada hueco cumple las reglas (rectángulo, una sola boca, el resto muro)', () => {
    expect(() => encontrarHuecos(rejilla)).not.toThrow();
  });

  it('nada del mapa cae dentro de un hueco (ahí no hay piso)', () => {
    const m = piso.mapa;
    const rotos = [
      ...Object.entries(m.puntosControl).map(([nombre, p]) => ({ que: `punto de control ${nombre}`, ...p })),
      ...m.muebles.map((d) => ({ que: `mueble ${d.tipo}`, x: d.x, y: d.y })),
      ...m.lamparas.map((d) => ({ que: `lámpara ${d.id}`, x: d.x, y: d.y })),
      ...m.interactuables.map((d) => ({ que: `interactuable ${d.id}`, x: d.x, y: d.y })),
      { que: 'guarida de la criatura', ...m.guaridaEntidad },
      { que: 'cámara del menú', ...piso.menu.camara },
      { que: 'figura del menú', ...piso.menu.figura },
    ]
      .filter((c) => enHueco(c.x, c.y))
      .map((c) => `${c.que} en (${c.x}, ${c.y})`);
    expect(rotos).toEqual([]);
  });
});

describe.each(PISOS.map((p) => [p.id, p] as const))('Objetos recogibles de %s', (_id, piso) => {
  const recogibles = piso.mapa.interactuables.filter((i) => i.tipo === 'recogible');

  it('todo recogible del mapa entrega un objeto que el paquete declara', () => {
    const rotos = recogibles.filter((i) => !i.objeto || !(i.objeto in piso.objetos)).map((i) => `${i.id} → ${String(i.objeto)}`);
    expect(rotos).toEqual([]);
  });

  it('toda llave que pide una puerta es un objeto que se guarda en el inventario y que está en el mapa', () => {
    const llaves = piso.mapa.puertas.flatMap((p) => (p.llave ? [p.llave] : []));
    const sinObjeto = llaves.filter((l) => !piso.objetos[l]?.guardaEnInventario);
    expect(sinObjeto, 'llaves que ninguna declaración guarda en el inventario').toEqual([]);
    const entregados = new Set(recogibles.map((i) => i.objeto));
    expect(llaves.filter((l) => !entregados.has(l)), 'llaves que no están en ningún lugar del mapa (la puerta no se podría abrir)').toEqual([]);
  });

  it('todo tablero dice qué bandera marca, y esa bandera es la de un objetivo del piso', () => {
    const otorgadas = new Set(piso.objetivos.map((o) => o.bandera));
    const tableros = piso.mapa.interactuables.filter((i) => i.tipo === 'tablero');
    expect(tableros.filter((t) => !t.bandera || !otorgadas.has(t.bandera)).map((t) => t.id)).toEqual([]);
  });

  it('no hay objetos declarados que nadie recoja', () => {
    const entregados = new Set(recogibles.map((i) => i.objeto));
    expect(Object.keys(piso.objetos).filter((id) => !entregados.has(id))).toEqual([]);
  });
});

describe.each(PISOS.map((p) => [p.id, p] as const))('Reglas de %s', (_id, piso) => {
  it('las banderas que despiertan a la criatura y revelan su imitación son banderas que el piso realmente otorga', () => {
    const otorgadas = new Set(piso.objetivos.map((o) => o.bandera));
    expect(otorgadas.has(piso.reglas.despiertaCon), 'despiertaCon no es la bandera de ningún objetivo').toBe(true);
    expect(otorgadas.has(piso.reglas.imitacionCompletaCon), 'imitacionCompletaCon no es la bandera de ningún objetivo').toBe(true);
    expect(otorgadas.has(piso.reglas.directorDesde), 'directorDesde no es la bandera de ningún objetivo').toBe(true);
  });

  it('el director empieza a trabajar antes (o a la vez) que la criatura despierta', () => {
    const orden = piso.objetivos.map((o) => o.bandera);
    expect(orden.indexOf(piso.reglas.directorDesde)).toBeLessThanOrEqual(orden.indexOf(piso.reglas.despiertaCon));
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

describe.each(PISOS.map((p) => [p.id, p] as const))('Placas y rótulos de %s', (_id, piso) => {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const PASO: Record<Direccion, readonly [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] };
  const cuartoEn = (x: number, y: number) => piso.mapa.habitaciones.find((h) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1);
  const placas = piso.placas ?? [];

  it('cada placa cuelga de una puerta que existe, y ninguna puerta tiene dos', () => {
    const puertas = new Set(piso.mapa.puertas.map((p) => p.id));
    expect(placas.filter((p) => !puertas.has(p.puerta)).map((p) => p.puerta), 'puertas que no existen').toEqual([]);
    expect(new Set(placas.map((p) => p.puerta)).size).toBe(placas.length);
  });

  it('cada placa mira a un cuarto de paso y su puerta da al apartamento que dice', () => {
    // La placa va en la cara que se EMPUJA (contraria a abreHacia): ese lado tiene que ser el pasillo.
    const rotas = placas.flatMap((placa) => {
      const puerta = piso.mapa.puertas.find((p) => p.id === placa.puerta);
      if (!puerta?.abreHacia) return [`${placa.puerta}: sin puerta o sin hacia dónde abre`];
      const [dx, dy] = PASO[puerta.abreHacia];
      const fuera = cuartoEn(puerta.x - dx, puerta.y - dy);
      const dentro = cuartoEn(puerta.x + dx, puerta.y + dy);
      const errores: string[] = [];
      if (!fuera?.paso) errores.push(`${placa.puerta}: la placa mira a "${fuera?.id ?? 'nada'}", que no es un cuarto de paso`);
      if (dentro?.apartamento !== placa.texto) errores.push(`${placa.puerta}: da a "${dentro?.id ?? 'nada'}", no al ${placa.texto}`);
      return errores;
    });
    expect(rotas).toEqual([]);
  });

  it('todo apartamento del mapa tiene su placa', () => {
    const apartamentos = new Set(piso.mapa.habitaciones.flatMap((h) => (h.apartamento ? [h.apartamento] : [])));
    const conPlaca = new Set(placas.map((p) => p.texto));
    expect([...apartamentos].filter((a) => !conPlaca.has(a))).toEqual([]);
  });

  it('cada rótulo está pintado SOBRE la cara de un muro (±2 cm), mirando hacia un lugar transitable', () => {
    // A 2 cm hacia atrás tiene que haber muro y a 2 cm hacia adelante, aire: si no, está hundido en el
    // muro (no se ve) o flotando lejos de él.
    const margen = 0.02 / 1.3;
    const rotos = (piso.rotulos ?? []).flatMap((r) => {
      const ang = (r.rot * Math.PI) / 180;
      const [fx, fy] = [Math.sin(ang), Math.cos(ang)];
      const detras = rejilla.esMuro(Math.floor(r.x - fx * margen), Math.floor(r.y - fy * margen));
      const delante = rejilla.esTransitable(Math.floor(r.x + fx * margen), Math.floor(r.y + fy * margen));
      return detras && delante ? [] : [`"${r.texto}" en (${r.x}, ${r.y}): muro detrás ${detras}, libre delante ${delante}`];
    });
    expect(rotos).toEqual([]);
  });
});
