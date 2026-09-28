// Aquí están las "recetas" de cada superficie del edificio.
// La identidad visual que busco: un edificio residencial colombiano de los
// años 60-70, abandonado. Zócalo verde institucional, papel de colgar
// amarillento, piso de granito pulido, parqué gastado, techos con goteras.
import type { Pixel, RecetaTextura } from './GeneradorTexturas';
import type { Ruido2D } from '../../utilidades/Ruido';

export type IdTextura =
  | 'pinturaPasillo'
  | 'papelTapiz'
  | 'azulejo'
  | 'granito'
  | 'parque'
  | 'concreto'
  | 'yeso'
  | 'madera'
  | 'tela'
  | 'metal';

// --- Pequeñas ayudas para escribir las recetas con menos ruido visual ---
const frac = (x: number) => x - Math.floor(x);
const sat = (x: number) => Math.min(1, Math.max(0, x));
/** Hash determinista para variar baldosas/tablones individualmente. */
const hash = (a: number, b: number) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const fbm = (r: Ruido2D, u: number, v: number, octavas: number, periodo: number) =>
  r.fractal(u * periodo, v * periodo, octavas, periodo);

function pintarPx(px: Pixel, r: number, g: number, b: number, altura: number, rugosidad: number): void {
  px.r = r;
  px.g = g;
  px.b = b;
  px.altura = altura;
  px.rugosidad = rugosidad;
}

export const RECETAS: Record<IdTextura, RecetaTextura> = {
  // Pared del pasillo: zócalo verde brillante abajo, crema mate arriba, humedad subiendo del piso.
  pinturaPasillo: {
    semilla: 11,
    fuerzaNormal: 2.2,
    pintar(u, v, r, px) {
      const mancha = fbm(r, u, v, 5, 4);
      const grano = fbm(r, u + 0.37, v + 0.11, 3, 32);
      const humedad = sat((0.3 - v) / 0.3) * (0.55 + 0.45 * fbm(r, u, v, 3, 8));
      const chorreo = sat((r.valor(u * 48, v * 3, 48) - 0.62) * 4) * (1 - v);
      const desconchado = fbm(r, u + 5, v + 3, 5, 8) > 0.72;
      const zocalo = v < 0.4;
      let cr = zocalo ? 56 : 174;
      let cg = zocalo ? 74 : 164;
      let cb = zocalo ? 60 : 138;
      if (Math.abs(v - 0.4) < 0.005) [cr, cg, cb] = [34, 32, 28];
      if (desconchado) [cr, cg, cb] = [146, 139, 124];
      let k = 0.78 + 0.3 * grano - 0.5 * Math.max(0, mancha - 0.52);
      k *= 1 - humedad * 0.5 - chorreo * 0.25;
      pintarPx(
        px,
        cr * k + humedad * 14,
        cg * k + humedad * 6,
        cb * k,
        grano * 0.35 + (desconchado ? -0.45 : 0),
        (zocalo ? 0.5 : 0.88) - humedad * 0.25,
      );
    },
  },

  // Papel de colgar de los apartamentos: rayas y un motivo floral desteñido, con manchas en anillo.
  papelTapiz: {
    semilla: 23,
    fuerzaNormal: 1.4,
    pintar(u, v, r, px) {
      const raya = Math.sin(u * Math.PI * 2 * 14) > 0.55 ? 1 : 0;
      const motivo = Math.abs(Math.sin(u * Math.PI * 14) * Math.sin(v * Math.PI * 14 + Math.sin(u * Math.PI * 28) * 0.6));
      const flor = motivo > 0.82 ? 1 : 0;
      const mancha = fbm(r, u, v, 5, 3);
      const anillo = Math.abs(mancha - 0.58) < 0.012 ? 1 : 0;
      const costura = frac(u * 4) < 0.004 ? 1 : 0;
      const suciedad = sat((0.25 - v) * 3) * fbm(r, u, v, 4, 16);
      let cr = 128 - raya * 14 - flor * 26;
      let cg = 114 - raya * 12 - flor * 22;
      let cb = 78 - raya * 8 - flor * 12;
      const k = 0.85 + 0.2 * fbm(r, u + 3, v, 3, 24) - Math.max(0, mancha - 0.58) * 0.9 - suciedad * 0.4;
      cr = cr * k - anillo * 40 - costura * 30;
      cg = cg * k - anillo * 38 - costura * 28;
      cb = cb * k - anillo * 30 - costura * 22;
      pintarPx(px, cr, cg, cb, flor * 0.2 - costura * 0.5 + (mancha > 0.58 ? 0.1 : 0), 0.9);
    },
  },

  // Azulejo de baño y cocina: blanco verdoso, juntas sucias, alguno quebrado.
  azulejo: {
    semilla: 37,
    fuerzaNormal: 3,
    pintar(u, v, r, px) {
      const n = 10;
      const fx = frac(u * n);
      const fy = frac(v * n);
      const ix = Math.floor(u * n);
      const iy = Math.floor(v * n);
      const borde = Math.min(fx, fy, 1 - fx, 1 - fy);
      const junta = borde < 0.035;
      const variacion = hash(ix, iy);
      const sucio = fbm(r, u, v, 4, 8);
      const roto = variacion > 0.9 && Math.abs(fbm(r, u * 3, v * 3, 3, 12) - 0.5) < 0.012;
      if (junta) {
        const k = 0.6 + sucio * 0.4;
        pintarPx(px, 62 * k, 60 * k, 52 * k, 0, 0.95);
        return;
      }
      const k = (0.88 + variacion * 0.1) * (1 - Math.max(0, sucio - 0.55) * 0.8);
      const bisel = Math.min(1, borde / 0.08);
      pintarPx(px, 184 * k - (roto ? 90 : 0), 196 * k - (roto ? 90 : 0), 184 * k - (roto ? 85 : 0), 0.4 + 0.6 * bisel, 0.18 + sucio * 0.3);
    },
  },

  // Piso de granito pulido (el clásico de los edificios viejos): gris con esquirlas de colores.
  granito: {
    semilla: 41,
    fuerzaNormal: 1.2,
    pintar(u, v, r, px) {
      const n = 2;
      const fx = frac(u * n);
      const fy = frac(v * n);
      const junta = Math.min(fx, fy, 1 - fx, 1 - fy) < 0.006;
      const chip = r.valor(u * 180, v * 180, 180);
      const chipRojo = r.valor(u * 140 + 9, v * 140 + 4, 140);
      const sucio = fbm(r, u, v, 5, 4);
      let cr = 118;
      let cg = 114;
      let cb = 106;
      if (chip > 0.8) [cr, cg, cb] = [196, 190, 178];
      else if (chip < 0.18) [cr, cg, cb] = [46, 44, 41];
      else if (chipRojo > 0.87) [cr, cg, cb] = [128, 72, 56];
      const k = 0.9 - Math.max(0, sucio - 0.5) * 0.9;
      if (junta) {
        pintarPx(px, 40, 38, 35, 0, 0.9);
        return;
      }
      pintarPx(px, cr * k, cg * k, cb * k, 0.5 + chip * 0.05, 0.32 + sucio * 0.45);
    },
  },

  // Parqué de madera gastado con tablones de largos distintos.
  parque: {
    semilla: 53,
    fuerzaNormal: 2,
    pintar(u, v, r, px) {
      const tablas = 6;
      const columna = Math.floor(u * tablas);
      const desfase = hash(columna, 7);
      const fila = Math.floor(v * 2 + desfase);
      const fx = frac(u * tablas);
      const fy = frac(v * 2 + desfase);
      const ranura = fx < 0.03 || fy < 0.01;
      const tono = hash(columna, fila);
      const veta = Math.sin((v * 60 + fbm(r, u * 2, v, 3, 8) * 8 + tono * 10) * Math.PI);
      const desgaste = fbm(r, u, v, 4, 4);
      const k = 0.75 + tono * 0.3 + veta * 0.06 - Math.max(0, desgaste - 0.55) * 0.5;
      if (ranura) {
        pintarPx(px, 22, 14, 9, 0, 0.9);
        return;
      }
      pintarPx(px, 92 * k, 60 * k, 38 * k, 0.6 + veta * 0.08, 0.55 + desgaste * 0.35);
    },
  },

  concreto: {
    semilla: 67,
    fuerzaNormal: 2.5,
    pintar(u, v, r, px) {
      const base = fbm(r, u, v, 6, 8);
      const poro = r.valor(u * 200, v * 200, 200) < 0.08;
      const mancha = fbm(r, u + 2, v + 7, 4, 3);
      const k = 0.7 + base * 0.4 - Math.max(0, mancha - 0.6) * 0.8;
      pintarPx(px, 98 * k, 96 * k, 92 * k, base * 0.6 - (poro ? 0.4 : 0), 0.92);
    },
  },

  // Techo de yeso con goteras antiguas (anillos marrones) y grietas.
  yeso: {
    semilla: 71,
    fuerzaNormal: 1.8,
    pintar(u, v, r, px) {
      const mancha = fbm(r, u, v, 5, 3);
      const anillo = Math.abs(mancha - 0.6) < 0.014;
      const dentro = mancha > 0.6;
      const grieta = Math.abs(fbm(r, u + 4, v + 1, 5, 6) - 0.5) < 0.006;
      const grano = fbm(r, u, v, 3, 40);
      const k = 0.85 + grano * 0.15;
      let cr = 166 * k;
      let cg = 160 * k;
      let cb = 146 * k;
      if (dentro) {
        cr -= 12;
        cg -= 20;
        cb -= 34;
      }
      if (anillo) [cr, cg, cb] = [112, 88, 58];
      if (grieta) [cr, cg, cb] = [50, 46, 40];
      pintarPx(px, cr, cg, cb, grano * 0.3 - (grieta ? 0.6 : 0), 0.95);
    },
  },

  // Madera barnizada oscura de puertas y muebles.
  madera: {
    semilla: 83,
    fuerzaNormal: 1.6,
    pintar(u, v, r, px) {
      const veta = Math.sin((u * 30 + fbm(r, u, v * 0.3, 4, 6) * 10) * Math.PI);
      const nudo = fbm(r, u, v, 4, 4);
      const rayon = r.valor(u * 6, v * 120, 120) > 0.93;
      const k = 0.8 + veta * 0.1 + (nudo - 0.5) * 0.3;
      pintarPx(px, 68 * k + (rayon ? 30 : 0), 44 * k + (rayon ? 22 : 0), 30 * k + (rayon ? 16 : 0), veta * 0.2 - (rayon ? 0.3 : 0), 0.5 + nudo * 0.3);
    },
  },

  // Sábanas sobre los muebles: tela percudida con pliegues.
  tela: {
    semilla: 97,
    fuerzaNormal: 2.4,
    pintar(u, v, r, px) {
      const trama = Math.sin(u * Math.PI * 2 * 160) * Math.sin(v * Math.PI * 2 * 160);
      const pliegue = fbm(r, u, v, 4, 5);
      const mancha = fbm(r, u + 9, v + 3, 5, 4);
      const k = 0.84 + trama * 0.03 + (pliegue - 0.5) * 0.25 - Math.max(0, mancha - 0.6) * 0.6;
      pintarPx(px, 182 * k, 176 * k - Math.max(0, mancha - 0.6) * 20, 162 * k - Math.max(0, mancha - 0.6) * 50, pliegue + trama * 0.05, 0.96);
    },
  },

  // Metal pintado con óxido (tablero eléctrico, tuberías del ducto).
  metal: {
    semilla: 101,
    fuerzaNormal: 1.6,
    pintar(u, v, r, px) {
      const oxido = fbm(r, u, v, 5, 5);
      const rayon = r.valor(u * 120, v * 4, 120) > 0.9;
      const hayOxido = oxido > 0.58;
      if (hayOxido) {
        const k = 0.7 + (oxido - 0.58) * 1.5;
        pintarPx(px, 104 * k, 56 * k, 30 * k, 0.3 + oxido * 0.4, 0.9);
        return;
      }
      pintarPx(px, 70 + (rayon ? 40 : 0), 80 + (rayon ? 40 : 0), 84 + (rayon ? 38 : 0), 0.5 - (rayon ? 0.2 : 0), rayon ? 0.35 : 0.6);
    },
  },
};
