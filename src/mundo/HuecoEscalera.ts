// Aquí encuentro los huecos de escalera de un mapa (las celdas 'E') y entiendo su forma: qué rectángulo
// ocupan, por qué lado se asoma el jugador (la "boca") y cómo paso de las medidas del hueco al mundo.
// Es pura lógica, sin three.js: así lo pruebo sin WebGL y el constructor de la escalera solo dibuja.
//
// Reglas de un hueco (si el mapa las rompe, lo digo con un error claro al cargar el piso):
// - es un rectángulo lleno de 'E';
// - tiene UNA sola boca: un lado entero que da a celdas por donde se camina (sin puertas);
// - los otros tres lados son muro;
// - mide al menos 2 x 2 celdas (caben los dos tramos y el descanso).
import type { Direccion } from './datos/TiposMapa';
import type { Rejilla } from './Rejilla';

export interface HuecoEscalera {
  /** Rectángulo inclusivo en celdas. */
  gx0: number;
  gy0: number;
  gx1: number;
  gy1: number;
  /** El lado por donde el jugador se asoma al hueco. */
  boca: Direccion;
}

/**
 * Marco local del hueco: u corre a lo largo de la boca (0..ancho), v entra al hueco (0..fondo) y la
 * altura no cambia. Al mundo: x = origenX + u·cos(angulo) + v·sin(angulo); z = origenZ − u·sin(angulo) + v·cos(angulo)
 * (la misma rotación en Y que usa three.js).
 */
export interface MarcoHueco {
  origenX: number;
  origenZ: number;
  angulo: number;
  /** Metros a lo largo de la boca. */
  ancho: number;
  /** Metros desde la boca hasta la pared del fondo. */
  fondo: number;
}

const MINIMO_CELDAS = 2;
/** Las cuatro vecinas de lado de una celda. */
const VECINAS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Las celdas de afuera que tocan cada lado del rectángulo. */
function vecinasDelLado(h: Omit<HuecoEscalera, 'boca'>, lado: Direccion): Array<[number, number]> {
  const celdas: Array<[number, number]> = [];
  if (lado === 'n' || lado === 's') {
    const gy = lado === 'n' ? h.gy0 - 1 : h.gy1 + 1;
    for (let gx = h.gx0; gx <= h.gx1; gx++) celdas.push([gx, gy]);
  } else {
    const gx = lado === 'o' ? h.gx0 - 1 : h.gx1 + 1;
    for (let gy = h.gy0; gy <= h.gy1; gy++) celdas.push([gx, gy]);
  }
  return celdas;
}

/** Recorro la rejilla y devuelvo cada hueco con su boca. Lanzo un error si alguno rompe las reglas. */
export function encontrarHuecos(rejilla: Rejilla): HuecoEscalera[] {
  const visto = new Set<number>();
  const clave = (gx: number, gy: number) => gy * rejilla.ancho + gx;
  const huecos: HuecoEscalera[] = [];

  for (let gy = 0; gy < rejilla.alto; gy++) {
    for (let gx = 0; gx < rejilla.ancho; gx++) {
      if (!rejilla.esHueco(gx, gy) || visto.has(clave(gx, gy))) continue;

      // Relleno las celdas 'E' conectadas para saber qué rectángulo forman.
      const pendientes: Array<[number, number]> = [[gx, gy]];
      visto.add(clave(gx, gy));
      let cuantas = 0;
      const r = { gx0: gx, gy0: gy, gx1: gx, gy1: gy };
      while (pendientes.length > 0) {
        const [cx, cy] = pendientes.pop()!;
        cuantas++;
        r.gx0 = Math.min(r.gx0, cx);
        r.gy0 = Math.min(r.gy0, cy);
        r.gx1 = Math.max(r.gx1, cx);
        r.gy1 = Math.max(r.gy1, cy);
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (!rejilla.esHueco(nx, ny) || visto.has(clave(nx, ny))) continue;
          visto.add(clave(nx, ny));
          pendientes.push([nx, ny]);
        }
      }

      const donde = `El hueco de escalera de (${r.gx0}, ${r.gy0}) a (${r.gx1}, ${r.gy1})`;
      if (cuantas !== (r.gx1 - r.gx0 + 1) * (r.gy1 - r.gy0 + 1)) throw new Error(`${donde} no es un rectángulo.`);
      if (r.gx1 - r.gx0 + 1 < MINIMO_CELDAS || r.gy1 - r.gy0 + 1 < MINIMO_CELDAS) {
        throw new Error(`${donde} mide menos de ${MINIMO_CELDAS} x ${MINIMO_CELDAS} celdas: no caben los tramos.`);
      }

      const bocas: Direccion[] = [];
      for (const lado of ['n', 's', 'e', 'o'] as const) {
        const vecinas = vecinasDelLado(r, lado);
        const libres = vecinas.filter(([x, y]) => rejilla.esTransitable(x, y) && !rejilla.esPuerta(x, y)).length;
        const muros = vecinas.filter(([x, y]) => rejilla.esMuro(x, y)).length;
        if (libres === vecinas.length) bocas.push(lado);
        else if (muros !== vecinas.length) throw new Error(`${donde}: el lado "${lado}" no es ni boca entera ni muro entero.`);
      }
      if (bocas.length !== 1) throw new Error(`${donde} tiene ${bocas.length} bocas; debe tener exactamente una.`);
      huecos.push({ ...r, boca: bocas[0] });
    }
  }
  return huecos;
}

/** Paso el rectángulo del hueco a su marco local (en metros), según hacia dónde mira la boca. */
export function marcoDelHueco(h: HuecoEscalera, celda: number): MarcoHueco {
  const x0 = h.gx0 * celda;
  const z0 = h.gy0 * celda;
  const x1 = (h.gx1 + 1) * celda;
  const z1 = (h.gy1 + 1) * celda;
  const enX = x1 - x0;
  const enZ = z1 - z0;
  switch (h.boca) {
    case 'n':
      return { origenX: x0, origenZ: z0, angulo: 0, ancho: enX, fondo: enZ };
    case 's':
      return { origenX: x1, origenZ: z1, angulo: Math.PI, ancho: enX, fondo: enZ };
    case 'o':
      return { origenX: x0, origenZ: z1, angulo: Math.PI / 2, ancho: enZ, fondo: enX };
    case 'e':
      return { origenX: x1, origenZ: z0, angulo: -Math.PI / 2, ancho: enZ, fondo: enX };
  }
}

/** Un punto del marco local (u, v) en metros del mundo (x, z). */
export function aMundo(m: MarcoHueco, u: number, v: number): { x: number; z: number } {
  const c = Math.cos(m.angulo);
  const s = Math.sin(m.angulo);
  return { x: m.origenX + u * c + v * s, z: m.origenZ - u * s + v * c };
}

/**
 * ¿Puede arrancar aquí un tramo que lleva a otro piso? Tiene que ser una celda por donde se camina pegada de
 * lado a un hueco: como un hueco solo se abre por su boca, eso es una celda de la boca, al borde de los escalones.
 */
export function esArranqueDeTramo(rejilla: Rejilla, gx: number, gy: number): boolean {
  if (!rejilla.esTransitable(gx, gy)) return false;
  return VECINAS.some(([dx, dy]) => rejilla.esHueco(gx + dx, gy + dy));
}
