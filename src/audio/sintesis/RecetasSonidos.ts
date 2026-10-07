// Aquí fabrico cada sonido del juego con síntesis. Ventajas reales:
// 1) Cero problemas de licencias en el vertical slice.
// 2) Variantes infinitas: ningún paso ni golpe suena idéntico al anterior.
// 3) Peso casi nulo de descarga (importante en celulares).
// Cuando el proyecto crezca, puedo reemplazar cualquier receta por una
// grabación de foley real sin cambiar nada más del juego (mismo IdSonido).
import type { IdSonido } from '../TiposAudio';
import {
  PasaAltos,
  PasaBajos,
  PasaBanda,
  crearMuestras,
  envolvente,
  fundidos,
  normalizar,
  ruido,
  saturar,
} from './Sintetizador';

type Generador = (tasa: number, variante: number) => Float32Array;

interface RecetaSonido {
  variantes: number;
  /** Los bucles no llevan fundido de salida para no crear un "hueco" al repetirse. */
  bucle?: boolean;
  generar: Generador;
}

const DOS_PI = Math.PI * 2;
const azar = (a: number, b: number) => a + Math.random() * (b - a);

/** Crujido por "pegar y soltar" (stick-slip): así suenan bisagras y maderas viejas de verdad. */
function crujido(tasa: number, duracion: number, minimo: number, maximo: number, resonancias: Array<[number, number, number]>, semilla: number): Float32Array {
  const filtros = resonancias.map(([f, q]) => new PasaBanda(f, q, tasa));
  let fase = 0;
  return crearMuestras(duracion, tasa, (t) => {
    const p = t / duracion;
    const ritmo = minimo + (maximo - minimo) * (0.5 + 0.5 * Math.sin(p * Math.PI * 2.3 + semilla * 1.7)) + (Math.random() - 0.5) * 10;
    fase += Math.max(1, ritmo) / tasa;
    let impulso = 0;
    if (fase >= 1) {
      fase -= 1;
      impulso = 0.5 + Math.random() * 0.5;
    }
    let s = 0;
    for (let k = 0; k < filtros.length; k++) s += filtros[k].procesar(impulso) * resonancias[k][2];
    return s * Math.pow(Math.sin(Math.PI * p), 0.6);
  });
}

function terminar(datos: Float32Array, tasa: number, pico = 0.85, bucle = false): Float32Array {
  normalizar(datos, pico);
  return bucle ? datos : fundidos(datos, tasa);
}

// ---------------------------------------------------------------------------
// PASOS: cada superficie suena distinto. El jugador aprende a oír dónde pisa.
// ---------------------------------------------------------------------------
function paso(tasa: number, tipo: 'granito' | 'parque' | 'azulejo' | 'concreto', variante: number): Float32Array {
  const k = azar(0.9, 1.1);
  const lp = new PasaBajos(tipo === 'parque' ? 1800 : 4200, tasa);
  const brillo = new PasaBanda((tipo === 'azulejo' ? 3100 : tipo === 'parque' ? 700 : 2300) * k, 1.2, tasa);
  const suela = new PasaBanda(tipo === 'parque' ? 420 : 950, 1.5, tasa);
  const arena = new PasaAltos(3000, tasa);
  const chirrido = new PasaBanda(azar(480, 620), 16, tasa);
  const cruje = tipo === 'parque' && variante % 3 === 0;
  let fase = 0;
  const datos = crearMuestras(0.3, tasa, (t) => {
    const tacon = brillo.procesar(ruido()) * envolvente(t, 0.001, tipo === 'parque' ? 0.035 : 0.016);
    const punta = suela.procesar(ruido()) * envolvente(t - 0.04 * k, 0.004, 0.03) * 0.7;
    const golpe = Math.sin(DOS_PI * (tipo === 'parque' ? 85 : 110) * t) * envolvente(t, 0.002, 0.035) * 0.7;
    const grava = tipo === 'concreto' ? arena.procesar(ruido()) * envolvente(t, 0.004, 0.06) * 0.35 : 0;
    const anillo = tipo === 'azulejo' ? Math.sin(DOS_PI * 3300 * t) * envolvente(t, 0.001, 0.025) * 0.15 : 0;
    let tabla = 0;
    if (cruje && t > 0.05 && t < 0.22) {
      fase += 70 / tasa;
      if (fase >= 1) {
        fase -= 1;
        tabla = 1;
      }
    }
    return lp.procesar(tacon + punta + golpe + grava + anillo) + chirrido.procesar(tabla) * 0.5;
  });
  return terminar(datos, tasa, 0.8);
}

/** Pasos de la criatura: pesados, húmedos, y con un segundo impacto arrastrado. Algo no camina bien. */
function pasoEntidad(tasa: number): Float32Array {
  const lp = new PasaBajos(900, tasa);
  const humedo = new PasaBanda(320, 2, tasa);
  const arrastre = new PasaBanda(260, 1.5, tasa);
  const segundo = azar(0.1, 0.16);
  return terminar(
    crearMuestras(0.65, tasa, (t) => {
      const golpe = Math.sin(DOS_PI * 52 * t) * envolvente(t, 0.004, 0.09);
      const moja = humedo.procesar(ruido()) * envolvente(t, 0.01, 0.12) * (0.6 + 0.4 * Math.sin(DOS_PI * 31 * t));
      const arr = arrastre.procesar(ruido()) * envolvente(t - segundo, 0.03, 0.16) * 0.6;
      const otro = Math.sin(DOS_PI * 46 * t) * envolvente(t - segundo, 0.004, 0.06) * 0.5;
      return lp.procesar(golpe + moja * 0.9 + arr + otro);
    }),
    tasa,
    0.9,
  );
}

// ---------------------------------------------------------------------------
// RESPIRACIÓN (del jugador y de la criatura)
// ---------------------------------------------------------------------------
function respiracion(tasa: number, duracion: number, f1: number, f2: number, entrando: boolean): Float32Array {
  const a = new PasaBanda(f1 * azar(0.93, 1.07), 2.2, tasa);
  const b = new PasaBanda(f2 * azar(0.93, 1.07), 3, tasa);
  const hp = new PasaAltos(250, tasa);
  return terminar(
    crearMuestras(duracion, tasa, (t) => {
      const p = t / duracion;
      const env = entrando ? Math.pow(Math.sin(Math.PI * Math.min(1, p)), 1.3) : Math.min(1, p / 0.12) * Math.exp(-p * 2.2);
      const n = hp.procesar(ruido());
      return (a.procesar(n) * 0.8 + b.procesar(n) * 0.45) * env;
    }),
    tasa,
    0.6,
  );
}

function respiraEntidad(tasa: number): Float32Array {
  const a = new PasaBanda(420, 3, tasa);
  const b = new PasaBanda(950, 4, tasa);
  const lp = new PasaBajos(1600, tasa);
  return terminar(
    crearMuestras(3.3, tasa, (t) => {
      const entrada = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t / 1.3))), 1.2);
      const salida = t > 1.5 ? Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, (t - 1.5) / 1.7))), 0.9) : 0;
      // Estertor húmedo: modulación rápida e irregular en la exhalación.
      const estertor = 0.55 + 0.45 * Math.sign(Math.sin(DOS_PI * (26 + 6 * Math.sin(t * 3)) * t));
      const n = ruido();
      const aire = (a.procesar(n) + b.procesar(n) * 0.6) * (entrada * 0.8 + salida * estertor);
      const grave = Math.sin(DOS_PI * 38 * t) * (entrada + salida) * 0.25;
      return lp.procesar(aire + grave);
    }),
    tasa,
    0.85,
  );
}

// ---------------------------------------------------------------------------
// FIRMA SONORA DE EL INQUILINO: cada estado suena distinto para que el
// jugador aprenda a "leerla" sin verla. Todo grave, húmedo y con algo roto.
// ---------------------------------------------------------------------------

/** Una respiración que se repite sin costura: el período del ciclo divide exacto la duración. */
function cicloRespiracion(
  tasa: number,
  duracion: number,
  ciclos: number,
  forma: (fase: number) => number,
  formantes: [number, number],
  estertor: number,
  grave: number,
): Float32Array {
  const a = new PasaBanda(formantes[0], 3, tasa);
  const b = new PasaBanda(formantes[1], 4, tasa);
  const lp = new PasaBajos(1500, tasa);
  const periodo = duracion / ciclos;
  // Genero un poco de más y lo fundo sobre el inicio: los filtros "suenan" un
  // instante después de la envolvente y, sin esto, el bucle hace clic al repetirse.
  const solape = Math.floor(0.04 * tasa);
  const total = Math.floor(duracion * tasa);
  const extendido = crearMuestras(duracion + solape / tasa, tasa, (t) => {
    const fase = (t % periodo) / periodo;
    const env = forma(fase);
    // Estertor: la garganta vibra en la exhalación (la segunda mitad del ciclo).
    const vibra = fase > 0.5 ? 1 - estertor + estertor * (0.5 + 0.5 * Math.sign(Math.sin(DOS_PI * 29 * t))) : 1;
    const n = ruido();
    const aire = (a.procesar(n) + b.procesar(n) * 0.55) * env * vibra;
    return lp.procesar(aire + Math.sin(DOS_PI * 41 * t) * env * grave);
  });
  const datos = extendido.slice(0, total);
  for (let i = 0; i < solape && total + i < extendido.length; i++) {
    const k = i / solape;
    datos[i] = datos[i] * k + extendido[total + i] * (1 - k);
  }
  return datos;
}

/** Mientras caza: jadeo rápido, ronco y rítmico. Dice DÓNDE está en una persecución. */
function jadeoEntidad(tasa: number): Float32Array {
  // 4 ciclos en 2.4 s: ~100 respiraciones por minuto, animal.
  const forma = (f: number) => (f < 0.42 ? Math.pow(Math.sin((Math.PI * f) / 0.42), 1.4) * 0.75 : Math.pow(Math.sin((Math.PI * (f - 0.42)) / 0.58), 0.8));
  return normalizar(cicloRespiracion(tasa, 2.4, 4, forma, [380, 820], 0.6, 0.35), 0.8);
}

/** Mientras acecha: una respiración lentísima, contenida. Solo se oye muy de cerca. */
function respiraAcecho(tasa: number): Float32Array {
  // Inhala largo, retiene, suelta húmedo y queda en silencio casi dos segundos.
  const forma = (f: number) => {
    if (f < 0.3) return Math.pow(Math.sin((Math.PI * f) / 0.6), 1.5);
    if (f < 0.42) return Math.max(0, 1 - (f - 0.3) / 0.03);
    if (f < 0.68) return Math.pow(Math.sin((Math.PI * (f - 0.42)) / 0.26), 1.1) * 0.8;
    return 0;
  };
  return normalizar(cicloRespiracion(tasa, 5.2, 1, forma, [300, 700], 0.8, 0.5), 0.7);
}

/** Articulaciones que crujen: dos a cuatro chasquidos secos con cuerpo de hueso. */
function chasquido(tasa: number, variante: number): Float32Array {
  const hueso = new PasaBanda(azar(1500, 2200), 9, tasa);
  const cuerpo = new PasaBanda(azar(520, 700), 5, tasa);
  const golpes: number[] = [];
  let t0 = 0.01;
  const total = 2 + (variante % 3);
  for (let i = 0; i < total; i++) {
    golpes.push(t0);
    t0 += azar(0.03, 0.09);
  }
  const duracion = t0 + 0.15;
  return terminar(
    crearMuestras(duracion, tasa, (t) => {
      let impulso = 0;
      for (const g of golpes) if (t >= g && t < g + 0.0015) impulso += ruido() * 3;
      return hueso.procesar(impulso) * 0.9 + cuerpo.procesar(impulso) * 0.6;
    }),
    tasa,
    0.8,
  );
}

/** Algo grande rozando el yeso por dentro del muro: fricción lenta con tirones. */
function friccionMuro(tasa: number, variante: number): Float32Array {
  const duracion = 1.6;
  const banda = new PasaBanda(azar(420, 650), 1.2, tasa);
  const lp = new PasaBajos(1100, tasa);
  const tirones = crujido(tasa, duracion, 6, 22, [[340, 6, 0.6], [780, 8, 0.35]], variante);
  const datos = crearMuestras(duracion, tasa, (t, i) => {
    const p = t / duracion;
    const empuje = Math.pow(Math.sin(Math.PI * p), 0.7) * (0.65 + 0.35 * Math.sin(DOS_PI * (1.3 + variante * 0.4) * t));
    return lp.procesar(banda.procesar(ruido()) * empuje + tirones[i] * 0.8);
  });
  return terminar(datos, tasa, 0.75);
}

/** Un pie que se arrastra por el piso: la retirada suena a cansancio, no a huida. */
function arrastre(tasa: number): Float32Array {
  const duracion = azar(0.7, 1);
  const banda = new PasaBanda(azar(260, 380), 1.4, tasa);
  const grano = new PasaAltos(1800, tasa);
  let aspereza = 1;
  return terminar(
    crearMuestras(duracion, tasa, (t, i) => {
      if (i % Math.floor(tasa * 0.004) === 0) aspereza = 0.4 + Math.random() * 0.6;
      const p = t / duracion;
      const env = Math.min(1, p / 0.25) * Math.pow(1 - p, 0.7);
      const n = ruido();
      return (banda.procesar(n) + grano.procesar(n) * 0.12 * aspereza) * env;
    }),
    tasa,
    0.7,
  );
}

// ---------------------------------------------------------------------------
// SUSURRO: fonemas falsos con formantes. Suena a voz... pero nunca a palabras.
// El jugador "casi" entiende. Esa ambigüedad es el punto.
// ---------------------------------------------------------------------------
function susurro(tasa: number): Float32Array {
  const vocales: Array<[number, number]> = [[730, 1090], [270, 2290], [530, 1840], [300, 870], [570, 840]];
  const f1 = new PasaBanda(500, 6, tasa);
  const f2 = new PasaBanda(1500, 8, tasa);
  const sibilante = new PasaAltos(4500, tasa);
  const silabas: Array<{ inicio: number; fin: number; vocal: [number, number]; s: boolean; amp: number }> = [];
  let t0 = azar(0.05, 0.2);
  while (t0 < 2.5) {
    const d = azar(0.12, 0.3);
    silabas.push({ inicio: t0, fin: t0 + d, vocal: vocales[Math.floor(Math.random() * vocales.length)], s: Math.random() < 0.4, amp: azar(0.5, 1) });
    t0 += d + azar(0.02, 0.2);
  }
  let actual = -1;
  return terminar(
    crearMuestras(2.8, tasa, (t) => {
      const indice = silabas.findIndex((s) => t >= s.inicio && t < s.fin);
      if (indice !== actual && indice >= 0) {
        actual = indice;
        f1.fijar(silabas[indice].vocal[0]);
        f2.fijar(silabas[indice].vocal[1]);
      }
      const n = ruido();
      if (indice < 0) return sibilante.procesar(n) * 0.01;
      const s = silabas[indice];
      const local = (t - s.inicio) / (s.fin - s.inicio);
      const env = Math.pow(Math.sin(Math.PI * local), 0.8) * s.amp;
      const sib = s.s && local < 0.3 ? sibilante.procesar(n) * (1 - local / 0.3) * 0.35 : 0;
      return (f1.procesar(n) * 0.8 + f2.procesar(n) * 0.5) * env + sib;
    }),
    tasa,
    0.7,
  );
}

// ---------------------------------------------------------------------------
// Catálogo completo de recetas
// ---------------------------------------------------------------------------
export const RECETAS_SONIDO: Record<IdSonido, RecetaSonido> = {
  paso_granito: { variantes: 4, generar: (t, v) => paso(t, 'granito', v) },
  paso_parque: { variantes: 5, generar: (t, v) => paso(t, 'parque', v) },
  paso_azulejo: { variantes: 4, generar: (t, v) => paso(t, 'azulejo', v) },
  paso_concreto: { variantes: 4, generar: (t, v) => paso(t, 'concreto', v) },
  paso_entidad: { variantes: 4, generar: (t) => pasoEntidad(t) },

  // Golpe de nudillos contra la pared. Siempre de a tres.
  golpe: {
    variantes: 3,
    generar: (tasa, v) => {
      const f = 145 + v * 14;
      const clic = new PasaBanda(1800, 1, tasa);
      const lp = new PasaBajos(2600, tasa);
      return terminar(
        crearMuestras(0.4, tasa, (t) => {
          const cuerpo =
            Math.sin(DOS_PI * f * t) * envolvente(t, 0.001, 0.06) +
            Math.sin(DOS_PI * f * 1.62 * t) * envolvente(t, 0.001, 0.035) * 0.5 +
            Math.sin(DOS_PI * f * 0.5 * t) * envolvente(t, 0.002, 0.09) * 0.6;
          return lp.procesar(cuerpo + clic.procesar(ruido()) * envolvente(t, 0.0005, 0.006) * 0.8);
        }),
        tasa,
      );
    },
  },

  puerta_crujido: {
    variantes: 3,
    generar: (tasa, v) => terminar(crujido(tasa, 1.1, 40, 110, [[780, 14, 1], [1540, 12, 0.6], [2350, 10, 0.4], [330, 8, 0.5]], v), tasa),
  },
  puerta_lenta: {
    variantes: 2,
    generar: (tasa, v) => terminar(crujido(tasa, 2.6, 16, 48, [[640, 16, 1], [1320, 12, 0.5], [290, 8, 0.6]], v + 5), tasa, 0.7),
  },
  crujido_madera: {
    variantes: 3,
    generar: (tasa, v) => terminar(crujido(tasa, 1.6, 6, 22, [[180, 10, 1], [420, 12, 0.6], [900, 8, 0.3]], v + 9), tasa),
  },

  puerta_cerrar: {
    variantes: 2,
    generar: (tasa) => {
      const lp = new PasaBajos(500, tasa);
      const cerrojo = new PasaBanda(3200, 8, tasa);
      return terminar(
        crearMuestras(0.45, tasa, (t) => {
          const golpe = Math.sin(DOS_PI * 70 * t) * envolvente(t, 0.002, 0.12) + lp.procesar(ruido()) * envolvente(t, 0.001, 0.05);
          const clic = (t > 0.05 && t < 0.053) || (t > 0.09 && t < 0.093) ? ruido() : 0;
          return golpe + cerrojo.procesar(clic) * 2;
        }),
        tasa,
      );
    },
  },

  portazo: {
    variantes: 2,
    generar: (tasa) => {
      const lp = new PasaBajos(2500, tasa);
      const traqueteo = new PasaBanda(2600, 10, tasa);
      return terminar(
        crearMuestras(1.0, tasa, (t) => {
          const boom = Math.sin(DOS_PI * 48 * t) * envolvente(t, 0.002, 0.35);
          const crack = lp.procesar(ruido()) * envolvente(t, 0.001, 0.08);
          const prob = t > 0.04 && t < 0.6 ? 0.004 * (1 - t / 0.6) : 0;
          return boom + crack * 0.8 + traqueteo.procesar(Math.random() < prob ? 1 : 0) * 1.5;
        }),
        tasa,
        0.95,
      );
    },
  },

  cerradura: {
    variantes: 2,
    generar: (tasa) => {
      const golpes = Array.from({ length: 5 }, () => azar(0, 0.6)).sort();
      const a = new PasaBanda(2200, 30, tasa);
      const b = new PasaBanda(3700, 25, tasa);
      const c = new PasaBanda(400, 5, tasa);
      return terminar(
        crearMuestras(0.8, tasa, (t) => {
          const imp = golpes.some((g) => t >= g && t < g + 0.002) ? 1 : 0;
          return a.procesar(imp) + b.procesar(imp) * 0.7 + c.procesar(imp) * 0.8;
        }),
        tasa,
      );
    },
  },

  llave: {
    variantes: 1,
    generar: (tasa) => {
      const hp = new PasaAltos(2500, tasa);
      const clic = new PasaBanda(2800, 20, tasa);
      return terminar(
        crearMuestras(0.6, tasa, (t) => {
          const raspa = t < 0.25 ? hp.procesar(ruido()) * 0.3 * (0.5 + 0.5 * Math.sin(DOS_PI * 40 * t)) : 0;
          const giro = clic.procesar(t > 0.35 && t < 0.352 ? 1 : 0) * 3;
          const golpe = Math.sin(DOS_PI * 180 * t) * envolvente(t - 0.42, 0.002, 0.05);
          return raspa + giro + golpe;
        }),
        tasa,
      );
    },
  },

  // Un candado pequeño que cae sobre un escalón de concreto: el golpe metálico y dos rebotes más débiles.
  candado: {
    variantes: 2,
    generar: (tasa) => {
      const bandas = [new PasaBanda(1750, 25, tasa), new PasaBanda(3150, 30, tasa), new PasaBanda(5200, 20, tasa)];
      const seco = new PasaBajos(900, tasa);
      const golpes: Array<[number, number]> = [
        [0.005, 1],
        [0.17 + azar(-0.02, 0.02), 0.5],
        [0.29 + azar(-0.02, 0.02), 0.22],
      ];
      return terminar(
        crearMuestras(0.7, tasa, (t) => {
          let imp = 0;
          for (const [g, fuerza] of golpes) if (t >= g && t < g + 0.0015) imp += fuerza;
          const metal = bandas[0].procesar(imp) + bandas[1].procesar(imp) * 0.6 + bandas[2].procesar(imp) * 0.35;
          return metal + seco.procesar(imp * ruido()) * 0.8;
        }),
        tasa,
      );
    },
  },

  // Una cadena que se desliza entre barrotes: eslabones que chocan, cada vez menos, y el roce del metal.
  cadena: {
    variantes: 2,
    generar: (tasa) => {
      const a = new PasaBanda(2900, 18, tasa);
      const b = new PasaBanda(4300, 14, tasa);
      const roce = new PasaBanda(3500, 2, tasa);
      return terminar(
        crearMuestras(1.0, tasa, (t) => {
          const imp = Math.random() < 0.012 * envolvente(t, 0.05, 0.6) ? azar(0.4, 1) : 0;
          return a.procesar(imp) + b.procesar(imp) * 0.6 + roce.procesar(ruido()) * 0.05 * envolvente(t, 0.05, 0.5);
        }),
        tasa,
      );
    },
  },

  clic: {
    variantes: 2,
    generar: (tasa) => {
      const bp = new PasaBanda(4200, 6, tasa);
      return terminar(
        crearMuestras(0.08, tasa, (t) => bp.procesar((t < 0.003 || (t > 0.018 && t < 0.021)) ? ruido() : 0)),
        tasa,
        0.6,
      );
    },
  },

  respira_in: { variantes: 3, generar: (t) => respiracion(t, 0.95, 1100, 2600, true) },
  respira_out: { variantes: 3, generar: (t) => respiracion(t, 1.15, 700, 1700, false) },
  jadeo: {
    variantes: 2,
    generar: (tasa) => {
      const bp = new PasaBanda(1400, 1.2, tasa);
      const voz = new PasaBanda(700, 5, tasa);
      let fase = 0;
      return terminar(
        crearMuestras(0.6, tasa, (t) => {
          fase += 92 / tasa;
          let pulso = 0;
          if (fase >= 1) {
            fase -= 1;
            pulso = 1;
          }
          const env = envolvente(t, 0.03, 0.2);
          return (bp.procesar(ruido()) + voz.procesar(pulso) * 0.6) * env;
        }),
        tasa,
        0.8,
      );
    },
  },

  latido: {
    variantes: 1,
    generar: (tasa) => {
      const lp = new PasaBajos(160, tasa);
      return terminar(
        crearMuestras(0.55, tasa, (t) =>
          lp.procesar(
            Math.sin(DOS_PI * 58 * t) * envolvente(t, 0.008, 0.05) + Math.sin(DOS_PI * 48 * (t - 0.2)) * envolvente(t - 0.2, 0.008, 0.045) * 0.7,
          ),
        ),
        tasa,
        0.9,
      );
    },
  },

  respira_entidad: { variantes: 2, generar: (t) => respiraEntidad(t) },
  jadeo_entidad: { variantes: 1, bucle: true, generar: (t) => jadeoEntidad(t) },
  respira_acecho: { variantes: 1, bucle: true, generar: (t) => respiraAcecho(t) },
  chasquido: { variantes: 4, generar: (t, v) => chasquido(t, v) },
  friccion_muro: { variantes: 3, generar: (t, v) => friccionMuro(t, v) },
  arrastre: { variantes: 3, generar: (t) => arrastre(t) },
  susurro: { variantes: 4, generar: (t) => susurro(t) },

  estatica: {
    variantes: 1,
    bucle: true,
    generar: (tasa) => {
      const bp = new PasaBanda(3000, 0.7, tasa);
      const hp = new PasaAltos(1500, tasa);
      return terminar(
        crearMuestras(2, tasa, (t) => {
          const siseo = bp.procesar(ruido()) * 0.5 * (0.75 + 0.25 * Math.sin(DOS_PI * 0.5 * t));
          const chasquido = hp.procesar(Math.random() < 0.002 ? ruido() * 4 : 0);
          return siseo + chasquido + Math.sin(DOS_PI * 60 * t) * 0.05;
        }),
        tasa,
        0.6,
        true,
      );
    },
  },

  // Zumbido eléctrico de 60 Hz (red eléctrica colombiana) con armónicos: el sonido de "hay luz".
  zumbido: {
    variantes: 1,
    bucle: true,
    generar: (tasa) => {
      const amplitudes = [0.3, 1, 0.25, 0.5, 0.12, 0.2, 0.05, 0.08];
      return terminar(
        crearMuestras(1, tasa, (t) => {
          let s = 0;
          for (let k = 0; k < amplitudes.length; k++) s += amplitudes[k] * Math.sin(DOS_PI * 60 * (k + 1) * t);
          return s + saturar(Math.sin(DOS_PI * 120 * t), 3) * 0.2;
        }),
        tasa,
        0.5,
        true,
      );
    },
  },

  goteo: {
    variantes: 3,
    generar: (tasa) => {
      let fase = 0;
      const hp = new PasaAltos(3000, tasa);
      const base = azar(800, 1100);
      return terminar(
        crearMuestras(0.3, tasa, (t) => {
          const f = base + 1300 * Math.min(1, t / 0.03);
          fase += (DOS_PI * f) / tasa;
          return Math.sin(fase) * envolvente(t, 0.001, 0.025) + hp.procesar(ruido()) * envolvente(t, 0.0005, 0.008) * 0.1;
        }),
        tasa,
        0.6,
      );
    },
  },

  // Tubería golpeada: parciales inarmónicos con cola larga. Suena a edificio entero.
  tuberia: {
    variantes: 2,
    generar: (tasa, v) => {
      const parciales = [[220, 0.9, 1.8], [587, 0.6, 1.4], [1033, 0.4, 1.0], [1720, 0.25, 0.7], [2890, 0.15, 0.4]].map(([f, a, d]) => [f * (1 + v * 0.07), a, d]);
      const lp = new PasaBajos(900, tasa);
      return terminar(
        crearMuestras(2.4, tasa, (t) => {
          let s = 0;
          for (const [f, a, d] of parciales) s += Math.sin(DOS_PI * f * t) * a * envolvente(t, 0.001, d * 0.5);
          return s + Math.sin(DOS_PI * 60 * t) * envolvente(t, 0.002, 0.08) + lp.procesar(ruido()) * envolvente(t, 0.001, 0.03);
        }),
        tasa,
      );
    },
  },

  chillido: {
    variantes: 1,
    generar: (tasa) => {
      const hp = new PasaAltos(800, tasa);
      const fases = [0, 0, 0, 0, 0];
      const desafine = [1, 1.03, 0.97, 1.51, 0.5];
      return terminar(
        crearMuestras(1.8, tasa, (t) => {
          const p = t / 1.8;
          const f = (380 + 520 * Math.sqrt(p)) * (1 + 0.02 * Math.sin(DOS_PI * 7 * t));
          let s = 0;
          for (let i = 0; i < fases.length; i++) {
            fases[i] += (f * desafine[i]) / tasa;
            s += (2 * (fases[i] - Math.floor(fases[i])) - 1) * (i === 4 ? 0.8 : 0.5);
          }
          s *= Math.sin(DOS_PI * 97 * t) * 0.5 + 0.7;
          const ataque = hp.procesar(ruido()) * envolvente(t, 0.001, 0.25);
          const env = Math.min(1, t / 0.005) * (p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35));
          return saturar((s + ataque) * env, 4);
        }),
        tasa,
        0.95,
      );
    },
  },

  siseo_cinta: {
    variantes: 1,
    bucle: true,
    generar: (tasa) => {
      const hp = new PasaAltos(3000, tasa);
      const lp = new PasaBajos(500, tasa);
      return terminar(
        crearMuestras(2, tasa, (t) => (hp.procesar(ruido()) * 0.3 + lp.procesar(ruido()) * 0.08) * (0.9 + 0.1 * Math.sin(DOS_PI * 1.5 * t))),
        tasa,
        0.4,
        true,
      );
    },
  },

  bip: {
    variantes: 1,
    generar: (tasa) =>
      terminar(
        crearMuestras(0.12, tasa, (t) => Math.sin(DOS_PI * 1000 * t) * Math.min(1, t / 0.01, (0.12 - t) / 0.01)),
        tasa,
        0.4,
      ),
  },

  chispa: {
    variantes: 2,
    generar: (tasa) => {
      const hp = new PasaAltos(2000, tasa);
      const lp = new PasaBajos(700, tasa);
      return terminar(
        crearMuestras(0.45, tasa, (t) => {
          const chasquidos = hp.procesar(Math.random() < 0.03 * (1 - t / 0.45) ? ruido() * 3 : 0);
          const pop = lp.procesar(ruido()) * envolvente(t, 0.001, 0.02) + Math.sin(DOS_PI * 90 * t) * envolvente(t, 0.001, 0.04);
          return chasquidos + pop;
        }),
        tasa,
      );
    },
  },

  // Algo rascando por dentro de la pared: trazos granulares.
  rasguno: {
    variantes: 3,
    generar: (tasa) => {
      const bp = new PasaBanda(azar(2800, 3600), 2, tasa);
      let grano = 1;
      return terminar(
        crearMuestras(1.3, tasa, (t, i) => {
          if (i % Math.floor(tasa * 0.003) === 0) grano = Math.random() > 0.55 ? 1 : 0.25;
          const trazo = Math.floor(t / 0.3);
          const local = (t - trazo * 0.3) / 0.22;
          const env = local < 1 ? Math.sin(Math.PI * local) : 0;
          return bp.procesar(ruido()) * env * grano;
        }),
        tasa,
        0.7,
      );
    },
  },

  papel: {
    variantes: 2,
    generar: (tasa) => {
      const hp = new PasaAltos(1500, tasa);
      let grano = 1;
      return terminar(
        crearMuestras(0.5, tasa, (t, i) => {
          if (i % Math.floor(tasa * 0.008) === 0) grano = Math.random();
          return hp.procesar(ruido()) * grano * envolvente(t, 0.01, 0.2);
        }),
        tasa,
        0.5,
      );
    },
  },

  recoger: {
    variantes: 2,
    generar: (tasa) => {
      const lp = new PasaBajos(1200, tasa);
      const tintineo = new PasaBanda(2500, 15, tasa);
      return terminar(
        crearMuestras(0.3, tasa, (t) => lp.procesar(ruido()) * envolvente(t, 0.005, 0.05) + tintineo.procesar(t > 0.05 && t < 0.052 ? 1 : 0) * 2),
        tasa,
        0.5,
      );
    },
  },

  tablero: {
    variantes: 1,
    generar: (tasa) => {
      const clic = new PasaBanda(1800, 12, tasa);
      return terminar(
        crearMuestras(1.4, tasa, (t) => {
          const golpe = Math.sin(DOS_PI * 110 * t) * envolvente(t, 0.001, 0.06) + clic.procesar(t < 0.002 ? 1 : 0) * 3;
          const subida = Math.min(1, Math.max(0, (t - 0.2) / 0.8));
          const zumbido = (Math.sin(DOS_PI * 60 * t) * 0.3 + Math.sin(DOS_PI * 120 * t) * 0.6) * subida * 0.4;
          return golpe + zumbido;
        }),
        tasa,
      );
    },
  },

  viento: {
    variantes: 1,
    bucle: true,
    generar: (tasa) => {
      const lp = new PasaBajos(500, tasa);
      return terminar(
        crearMuestras(4, tasa, (t) => {
          lp.fijarCorte(350 + 300 * Math.sin(DOS_PI * 0.25 * t));
          return lp.procesar(ruido()) * (0.6 + 0.4 * Math.sin(DOS_PI * 0.5 * t + Math.sin(DOS_PI * 0.25 * t)));
        }),
        tasa,
        0.6,
        true,
      );
    },
  },

  ui: {
    variantes: 1,
    generar: (tasa) => {
      const bp = new PasaBanda(1800, 4, tasa);
      return terminar(crearMuestras(0.07, tasa, (t) => bp.procesar(t < 0.002 ? 1 : 0) * 4 + Math.sin(DOS_PI * 900 * t) * envolvente(t, 0.001, 0.012) * 0.3), tasa, 0.35);
    },
  },
};
