// Los rastros (sangre vieja, lápiz, rayas, frases, humedad): pruebo que cada piso los pone donde tienen
// sentido (pegados a un muro de verdad, sobre un piso que se pisa o bajo un techo entero) y que el pintor los
// pinta bien: sin rectángulo visible, siempre igual para el mismo rastro, y con las capas en el orden correcto.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { Rejilla } from '../../src/mundo/Rejilla';
import { PISOS } from '../../src/pisos/catalogo';
import type { DefFrase, DefRastro } from '../../src/pisos/TiposPiso';
import {
  altoNecesarioConteo,
  anchoNecesarioFrase,
  letraFrase,
  pintarRastro,
  ponerDebajo,
  type TrazarLetras,
} from '../../src/render/texturas/PintorRastros';

const C = CONFIG.celda;

/**
 * Un trazador de letras sin navegador: cada letra es un palo vertical del alto de las mayúsculas, y el
 * renglón lleva además una barra a media altura. Con eso sé dónde hay letra y dónde no.
 */
const trazarDePrueba: TrazarLetras = (renglones, ancho, alto) => {
  const m = new Uint8ClampedArray(ancho * alto);
  const marcar = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(alto, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(ancho, Math.ceil(x1)); x++) m[y * ancho + x] = 255;
  };
  for (const r of renglones) {
    const largo = Math.min(r.anchoMax, r.texto.length * r.alto * 0.85);
    const x0 = r.x - largo / 2;
    for (let i = 0; i < r.texto.length; i++) {
      if (r.texto[i] === ' ') continue;
      const cx = x0 + (i + 0.5) * (largo / r.texto.length);
      marcar(cx - r.grosor / 2, r.y - r.alto, cx + r.grosor / 2, r.y);
    }
    marcar(x0, r.y - r.alto / 2 - r.grosor / 2, x0 + largo, r.y - r.alto / 2 + r.grosor / 2);
  }
  return m;
};

const pintar = (def: DefRastro, escala: number) => pintarRastro(def, escala, trazarDePrueba);

describe.each(PISOS.map((p) => [p.id, p] as const))('Rastros de %s', (_id, piso) => {
  const rejilla = new Rejilla(piso.mapa.rejilla);
  const rastros = piso.rastros ?? [];
  const enMuro = rastros.filter((r) => r.tipo !== 'charco' && r.tipo !== 'humedad');
  const enPiso = rastros.filter((r) => r.tipo === 'charco');
  const enTecho = rastros.filter((r) => r.tipo === 'humedad');
  const frases = rastros.filter((r): r is DefFrase => r.tipo === 'frase');

  it('no repiten id (la telemetría los cuenta por id)', () => {
    const ids = rastros.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los de muro están pegados a la cara de un muro en TODO su ancho, con aire delante', () => {
    // A 2 cm hacia atrás tiene que haber muro y a 2 cm hacia adelante, aire (se pise o sea el hueco de una
    // escalera). Lo miro en los dos extremos y en el centro: si no, un rastro ancho quedaría colgando en una
    // esquina o tapando una puerta.
    const margen = 0.02 / C;
    const rotos = enMuro.flatMap((r) => {
      const ang = (r.rot * Math.PI) / 180;
      const [nx, ny] = [Math.sin(ang), Math.cos(ang)];
      const [tx, ty] = [Math.cos(ang), -Math.sin(ang)];
      const medio = (r.ancho / 2 - 0.02) / C;
      return [-medio, 0, medio].flatMap((s) => {
        const [px, py] = [r.x + tx * s, r.y + ty * s];
        const detras = rejilla.esMuro(Math.floor(px - nx * margen), Math.floor(py - ny * margen));
        const delante = !rejilla.esMuro(Math.floor(px + nx * margen), Math.floor(py + ny * margen));
        return detras && delante ? [] : [`${r.id} en (${px.toFixed(2)}, ${py.toFixed(2)}): muro detrás ${detras}, aire delante ${delante}`];
      });
    });
    expect(rotos).toEqual([]);
  });

  it('los de muro caben entre el piso y el techo', () => {
    const rotos = enMuro.filter((r) => r.altura - r.alto / 2 < 0 || r.altura + r.alto / 2 > CONFIG.alturaTecho);
    expect(rotos.map((r) => r.id)).toEqual([]);
  });

  /** Las cuatro esquinas de un rastro acostado (de piso o de techo), en celdas. */
  const esquinas = (r: DefRastro) => {
    const ang = (r.rot * Math.PI) / 180;
    const [ax, ay] = [Math.sin(ang), Math.cos(ang)];
    const [bx, by] = [Math.cos(ang), -Math.sin(ang)];
    return [-1, 1].flatMap((i) => [-1, 1].map((j) => [r.x + ((bx * r.ancho) / 2) * i / C + ((ax * r.alto) / 2) * j / C, r.y + ((by * r.ancho) / 2) * i / C + ((ay * r.alto) / 2) * j / C] as const));
  };

  it('los de piso caen enteros sobre celdas que se pisan (ni muro ni hueco de escalera)', () => {
    const rotos = enPiso.flatMap((r) =>
      esquinas(r)
        .filter(([x, y]) => !rejilla.esTransitable(Math.floor(x), Math.floor(y)))
        .map(([x, y]) => `${r.id}: esquina en (${x.toFixed(2)}, ${y.toFixed(2)})`),
    );
    expect(rotos).toEqual([]);
  });

  it('los de techo caen enteros bajo techo de altura completa (ni muro, ni hueco, ni el dintel de una puerta)', () => {
    const rotos = enTecho.flatMap((r) =>
      esquinas(r)
        .filter(([x, y]) => !rejilla.esTransitable(Math.floor(x), Math.floor(y)) || rejilla.esPuerta(Math.floor(x), Math.floor(y)))
        .map(([x, y]) => `${r.id}: esquina en (${x.toFixed(2)}, ${y.toFixed(2)})`),
    );
    expect(rotos).toEqual([]);
  });

  it('cada frase tiene renglones con texto y ancho para sus letras (no se aprietan)', () => {
    const rotas = frases.flatMap((f) => {
      if (f.lineas.length === 0 || f.lineas.some((l) => l.trim() === '')) return [`${f.id}: renglón vacío`];
      // Con el dedo nadie pone tildes, y lo que sube sobre las mayúsculas se saldría del margen de arriba.
      if (f.lineas.some((l) => /[^A-Z ,.!¡?¿]/.test(l))) return [`${f.id}: solo mayúsculas sin tilde y puntuación`];
      if (letraFrase(f) < 0.06) return [`${f.id}: letras de ${(letraFrase(f) * 100).toFixed(1)} cm, no se leen`];
      return anchoNecesarioFrase(f) > f.ancho ? [`${f.id}: necesita ${anchoNecesarioFrase(f).toFixed(2)} m de ancho`] : [];
    });
    expect(rotas).toEqual([]);
  });

  it('las rayas de estatura y su mancha quedan dentro del cuadro (lejos del borde que se desvanece)', () => {
    const rotos = rastros.flatMap((r) => {
      if (r.tipo !== 'estatura') return [];
      const alturas = [...r.marcas.map((m) => m.altura), ...(r.mancha !== undefined ? [r.mancha] : [])];
      return alturas.filter((a) => Math.abs(a - r.altura) > r.alto / 2 - 0.03).map((a) => `${r.id}: algo a ${a} m queda fuera`);
    });
    expect(rotos).toEqual([]);
  });

  it('cada conteo cabe completo en su cuadro', () => {
    const rotos = rastros.flatMap((r) => (r.tipo === 'conteo' && altoNecesarioConteo(r.ancho, r.cuenta) > r.alto ? [`${r.id}: necesita ${altoNecesarioConteo(r.ancho, r.cuenta).toFixed(3)} m`] : []));
    expect(rotos).toEqual([]);
  });
});

/** Un ejemplar de cada tipo, pequeño (las pruebas corren rápido). */
const EJEMPLOS: readonly DefRastro[] = [
  { tipo: 'charco', id: 'prueba_charco', x: 0, y: 0, rot: 0, ancho: 0.6, alto: 0.5 },
  { tipo: 'mano', id: 'prueba_mano', x: 0, y: 0, rot: 0, altura: 1, ancho: 0.6, alto: 0.5 },
  { tipo: 'estatura', id: 'prueba_estatura', x: 0, y: 0, rot: 0, altura: 1.1, ancho: 0.3, alto: 0.4, mancha: 1.15, marcas: [{ altura: 1.0, texto: 'uno' }, { altura: 1.1, texto: '' }] },
  { tipo: 'conteo', id: 'prueba_conteo', x: 0, y: 0, rot: 0, altura: 1, ancho: 0.4, alto: 0.2, cuenta: 12 },
  { tipo: 'frase', id: 'prueba_frase', x: 0, y: 0, rot: 0, altura: 1.5, ancho: 0.62, alto: 0.42, lineas: ['NO LE', 'OIGAS'] },
  { tipo: 'humedad', id: 'prueba_humedad', x: 0, y: 0, rot: 0, ancho: 0.6, alto: 0.7 },
];

/** Cuántos píxeles tienen algo pintado, y el alfa más alto del borde del cuadro. */
function medir(datos: Uint8ClampedArray, ancho: number, alto: number): { cubiertos: number; bordeMax: number } {
  let cubiertos = 0;
  let bordeMax = 0;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const a = datos[(y * ancho + x) * 4 + 3];
      if (a > 25) cubiertos++;
      if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1) bordeMax = Math.max(bordeMax, a);
    }
  }
  return { cubiertos, bordeMax };
}

describe.each(EJEMPLOS.map((d) => [d.tipo, d] as const))('Pintar un rastro de tipo %s', (_tipo, def) => {
  const p = pintar(def, 0.5);

  it('mide lo que dice su cuadro (en píxeles, según la escala)', () => {
    expect(p.datos.length).toBe(p.ancho * p.alto * 4);
    expect(p.ancho / p.alto).toBeCloseTo(def.ancho / def.alto, 1);
  });

  it('pinta algo, y el borde del cuadro queda transparente (nunca se ve el rectángulo)', () => {
    const { cubiertos, bordeMax } = medir(p.datos, p.ancho, p.alto);
    expect(cubiertos).toBeGreaterThan(0);
    expect(bordeMax).toBe(0);
  });

  it('el mismo rastro sale siempre igual, y otro id lo pinta distinto', () => {
    expect(pintar(def, 0.5).datos).toEqual(p.datos);
    expect(pintar({ ...def, id: `${def.id}_otro` }, 0.5).datos).not.toEqual(p.datos);
  });

  it('a media escala tiene la mitad de píxeles por lado', () => {
    const completo = pintar(def, 1);
    expect(Math.abs(completo.ancho - 2 * p.ancho)).toBeLessThanOrEqual(1);
    expect(Math.abs(completo.alto - 2 * p.alto)).toBeLessThanOrEqual(1);
  });
});

describe('Las letras de la estatura', () => {
  it('salen solo para las rayas con texto, a la derecha de la raya y dentro del cuadro', () => {
    const def = EJEMPLOS.find((d) => d.tipo === 'estatura')!;
    const p = pintar(def, 1);
    expect(p.letras.map((l) => l.texto)).toEqual(['uno']);
    const [l] = p.letras;
    expect(l.x).toBeGreaterThan(p.ancho * 0.3);
    expect(l.x).toBeLessThan(p.ancho);
    expect(l.y).toBeGreaterThan(0);
    expect(l.y).toBeLessThan(p.alto);
  });

  it('los demás rastros no escriben nada a lápiz', () => {
    for (const def of EJEMPLOS.filter((d) => d.tipo !== 'estatura')) expect(pintar(def, 0.5).letras).toEqual([]);
  });
});

describe('Una frase escrita con el dedo', () => {
  const def = EJEMPLOS.find((d): d is DefFrase => d.tipo === 'frase')!;
  const p = pintar(def, 1);
  const alfa = (x: number, y: number) => p.datos[(y * p.ancho + x) * 4 + 3];
  const filas = (desde: number, hasta: number) => {
    let n = 0;
    for (let y = Math.max(0, desde); y < Math.min(p.alto, hasta); y++) for (let x = 0; x < p.ancho; x++) if (alfa(x, y) > 10) n++;
    return n;
  };
  const k = p.alto / def.alto;
  const letra = letraFrase(def);
  const arribaDeTodo = Math.floor(0.04 * k);
  const baseUltimo = Math.round((0.04 + letra * 2 + 0.045) * k);

  it('sin quien trace las letras, se niega a pintar (nunca deja una frase en blanco)', () => {
    expect(() => pintarRastro(def, 1)).toThrow(/trace sus letras/);
  });

  it('no pinta nada por encima de las letras: la sangre baja, no sube (el borde solo tiembla milímetros)', () => {
    expect(filas(0, arribaDeTodo - Math.ceil(0.008 * k))).toBe(0);
  });

  it('chorrea por debajo del último renglón (más abajo de lo que tiembla el borde)', () => {
    expect(filas(baseUltimo + Math.ceil(0.009 * k), p.alto)).toBeGreaterThan(0);
  });

  it('el dedo se seca: el final de una palabra queda con menos sangre que el principio', () => {
    // El segundo renglón ("OIGAS", una sola palabra): comparo su última letra con la primera, por lo que dejó
    // donde pintó (el promedio; el área cambia con el temblor del borde). La presión también tiene ruido, así
    // que promedio seis frases: con el dedo secándose la última queda cerca del 90 %; sin secarse, del 99 %.
    const y0 = Math.floor((baseUltimo / k - letra) * k);
    const largo = Math.min(def.ancho - 0.08, 5 * letra * 0.85);
    const columna = (i: number) => (def.ancho / 2 - largo / 2 + (i + 0.5) * (largo / 5)) * k;
    const proporciones = ['a', 'b', 'c', 'd', 'e', 'f'].map((sufijo) => {
      const otra = pintar({ ...def, id: `seca_${sufijo}` }, 1);
      const intensidad = (cx: number) => {
        let suma = 0;
        let n = 0;
        for (let y = y0; y < baseUltimo; y++) {
          for (let x = Math.floor(cx - 0.03 * k); x < cx + 0.03 * k; x++) {
            const a = otra.datos[(y * otra.ancho + x) * 4 + 3];
            if (a <= 25) continue;
            suma += a;
            n++;
          }
        }
        return suma / n;
      };
      return intensidad(columna(4)) / intensidad(columna(0));
    });
    expect(proporciones.reduce((a, b) => a + b, 0) / proporciones.length).toBeLessThan(0.95);
  });
});

describe('Poner una capa debajo del rastro', () => {
  const pixel = (r: number, g: number, b: number, a: number) => new Uint8ClampedArray([r, g, b, a]);

  it('lo opaco de arriba tapa lo de abajo; lo transparente lo deja ver', () => {
    expect([...ponerDebajo(pixel(10, 20, 30, 255), pixel(200, 200, 200, 255))]).toEqual([10, 20, 30, 255]);
    expect([...ponerDebajo(pixel(10, 20, 30, 0), pixel(200, 100, 50, 255))]).toEqual([200, 100, 50, 255]);
  });

  it('a medias, mezcla los colores y suma la opacidad', () => {
    const [r, , , a] = ponerDebajo(pixel(0, 0, 0, 128), pixel(200, 200, 200, 255));
    expect(a).toBe(255);
    expect(r).toBeGreaterThan(90);
    expect(r).toBeLessThan(110);
  });

  it('se niega a mezclar capas de distinto tamaño', () => {
    expect(() => ponerDebajo(new Uint8ClampedArray(8), new Uint8ClampedArray(4))).toThrow();
  });
});
