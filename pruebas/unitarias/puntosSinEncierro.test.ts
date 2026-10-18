// Ningún punto de control deja a nadie encerrado (lo encontró un probador el 2026-10-17: en el Piso 4, el apagón
// guardaba la partida adentro del 402 antes de tener su llave; al morir, reaparecía con la puerta cerrada con llave y
// la llave en el 401). Para cada piso del catálogo recorro su rejilla desde el punto inicial, con las puertas con
// llave cerradas: un punto de control que no alcanzo así tiene que pedir la llave que lo encierra (`requiere`) y
// tener un `sino` al que sí llego. Vale para los pisos que vengan.
import { describe, expect, it } from 'vitest';
import { PISOS } from '../../src/pisos/catalogo';
import type { DefMapa } from '../../src/mundo/datos/TiposMapa';

type Celda = `${number},${number}`;
const clave = (gx: number, gy: number): Celda => `${gx},${gy}`;

/** Las celdas a las que llego caminando desde (x, y), con las puertas con llave cerradas salvo la de `llaveEnMano`. */
function alcanzables(mapa: DefMapa, x: number, y: number, llaveEnMano: string | null): Set<Celda> {
  const cerradas = new Set(mapa.puertas.filter((p) => p.llave && p.llave !== llaveEnMano).map((p) => clave(p.x, p.y)));
  const pisable = (gx: number, gy: number) => {
    const c = mapa.rejilla[gy]?.[gx];
    return c !== undefined && c !== '#' && !cerradas.has(clave(gx, gy));
  };
  const inicio = { gx: Math.floor(x), gy: Math.floor(y) };
  const vistas = new Set<Celda>([clave(inicio.gx, inicio.gy)]);
  const cola = [inicio];
  while (cola.length) {
    const { gx, gy } = cola.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { gx: gx + dx, gy: gy + dy };
      if (!pisable(n.gx, n.gy) || vistas.has(clave(n.gx, n.gy))) continue;
      vistas.add(clave(n.gx, n.gy));
      cola.push(n);
    }
  }
  return vistas;
}

describe('Ningún punto de control deja a nadie encerrado', () => {
  for (const piso of PISOS) {
    it(`${piso.id}: todo punto detrás de una puerta con llave pide esa llave y tiene a dónde volver`, () => {
      const mapa = piso.mapa;
      const inicio = mapa.puntosControl[piso.puntoInicial];
      expect(inicio, `el punto inicial "${piso.puntoInicial}" existe`).toBeDefined();
      const libres = alcanzables(mapa, inicio.x, inicio.y, null);
      for (const [nombre, punto] of Object.entries(mapa.puntosControl)) {
        if (libres.has(clave(Math.floor(punto.x), Math.floor(punto.y)))) continue;
        // Encerrado sin llave: tiene que pedirla, y con ella tiene que poder salir.
        const llave = punto.requiere?.startsWith('objeto:') ? punto.requiere.slice('objeto:'.length) : null;
        expect(llave, `"${nombre}" queda detrás de una puerta con llave: tiene que pedir esa llave`).not.toBeNull();
        expect(mapa.puertas.some((p) => p.llave === llave), `"${nombre}" pide "${llave}", que abre una puerta del piso`).toBe(true);
        const conLlave = alcanzables(mapa, inicio.x, inicio.y, llave);
        expect(conLlave.has(clave(Math.floor(punto.x), Math.floor(punto.y))), `con "${llave}", "${nombre}" queda abierto`).toBe(true);
        const sino = punto.sino ? mapa.puntosControl[punto.sino] : undefined;
        expect(sino, `"${nombre}" dice a dónde volver sin la llave (sino)`).toBeDefined();
        expect(libres.has(clave(Math.floor(sino!.x), Math.floor(sino!.y))), `"${punto.sino}" se alcanza sin llaves`).toBe(true);
      }
    });
  }

  it('el 402: con su llave reaparezco adentro (el clímax); sin ella, en el cuarto del tablero', () => {
    const piso4 = PISOS.find((p) => p.id === 'piso4')!;
    expect(piso4.mapa.puntosControl.sala402).toMatchObject({ requiere: 'objeto:llave_402', sino: 'servicio' });
  });
});
