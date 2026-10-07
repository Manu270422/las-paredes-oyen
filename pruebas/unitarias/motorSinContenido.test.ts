// La segunda matraca: el motor no escribe a mano NINGÚN nombre del contenido de un piso (ids de cuartos,
// puertas, lámparas, objetos, documentos, interactuables, puntos de control ni banderas de la historia).
// La primera matraca (motorSinPisos) busca 401/402/403; esta busca todo lo que declara cualquier paquete
// del catálogo, así el próximo piso queda vigilado solo.
//
// Hay palabras que el piso usa como id y que también son vocabulario del motor (por ejemplo 'pasillo' es
// un tipo de reverberación y 'emergencia' un tipo de lámpara). Esas coincidencias legítimas están en
// COINCIDENCIAS, archivo por archivo y con la cuenta EXACTA (misma regla de matraca que la primera prueba).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PISOS } from '../../src/pisos/catalogo';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));

/** archivo → { palabra → cuántas veces aparece entre comillas }. Todas son vocabulario del motor, no contenido. */
const COINCIDENCIAS: Record<string, Record<string, number>> = {
  // Ids de SONIDO ('llave' = girar una llave, 'tablero' = palanca del tablero eléctrico).
  'src/audio/TiposAudio.ts': { llave: 1, tablero: 1 },
  'src/interaccion/objetos/InteractuablePuerta.ts': { llave: 1 },
  'src/mundo/RejaEscalera.ts': { llave: 1 },
  // Tipos de LÁMPARA ('emergencia' es un tipo de luz, no la lámpara de la escalera del Piso 4).
  'src/director/eventos/LuzFalla.ts': { emergencia: 1 },
  'src/mundo/PoolLuces.ts': { emergencia: 1 },
  // Tipo de DOCUMENTO ('orden' de trabajo es una forma de papel, como 'diario' o 'cinta').
  'src/interaccion/objetos/Modelos.ts': { orden: 1 },
  'src/narrativa/TiposNarrativa.ts': { orden: 1 },
  // Forma 3D de un recogible ('pilas' es un modelo; el objeto del Piso 4 también se llama así).
  'src/interaccion/objetos/Recogible.ts': { pilas: 1 },
  // 'tablero': el sonido de la palanca y la CAUSA de ruido de un tablero, y el TIPO de interactuable.
  'src/interaccion/objetos/Tablero.ts': { tablero: 2 },
  'src/nucleo/Eventos.ts': { tablero: 1 },
  'src/mundo/Nivel.ts': { tablero: 1 },
  // Uniones de tipos: TipoLampara ('emergencia'), TipoReverb ('escalera', 'pasillo'), TipoInteractuable ('tablero').
  'src/mundo/datos/TiposMapa.ts': { emergencia: 1, escalera: 1, pasillo: 1, tablero: 1 },
};

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta);
    return ruta.endsWith('.ts') ? [ruta] : [];
  });
}

function sinComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .split('\n')
    .map((linea) => linea.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n');
}

const relativa = (ruta: string) => relative(RAIZ, ruta).split(sep).join('/');

/** Todo nombre que declara un paquete. */
function nombresDelContenido(): Set<string> {
  const nombres = new Set<string>();
  for (const piso of PISOS) {
    const m = piso.mapa;
    for (const lista of [m.habitaciones, m.puertas, m.lamparas, m.interactuables]) for (const x of lista) nombres.add(x.id);
    for (const i of m.interactuables) if (i.bandera) nombres.add(i.bandera);
    for (const o of piso.objetivos) {
      nombres.add(o.id);
      nombres.add(o.bandera);
    }
    for (const lista of [m.puntosControl, piso.puntosControl, piso.luzPorBandera, piso.objetos, piso.documentos, piso.transcripciones]) {
      for (const clave of Object.keys(lista)) nombres.add(clave);
    }
    for (const valor of Object.values(piso.puntosControl)) nombres.add(valor);
    for (const valor of Object.values(piso.reglas)) nombres.add(valor);
    nombres.add(piso.puntoInicial);
  }
  return nombres;
}

describe('El motor no escribe a mano nombres del contenido de un piso', () => {
  const nombres = nombresDelContenido();
  const motor = archivosDe(join(RAIZ, 'src'))
    .map(relativa)
    .filter((r) => !r.startsWith('src/pisos/'));

  const encontrados: Record<string, Record<string, number>> = {};
  for (const archivo of motor) {
    const codigo = sinComentarios(readFileSync(join(RAIZ, archivo), 'utf8'));
    for (const nombre of nombres) {
      const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const n = (codigo.match(new RegExp(`['"\`]${escapado}['"\`]`, 'g')) ?? []).length;
      if (n > 0) (encontrados[archivo] ??= {})[nombre] = n;
    }
  }

  it('solo aparecen las coincidencias declaradas, con su cuenta exacta', () => {
    expect(encontrados).toEqual(COINCIDENCIAS);
  });

  it('el motor no escribe posiciones del mapa a mano (un número por CONFIG.celda): son datos del piso', () => {
    // Así se coló el viento de la escalera (2, 12) en Juego.ts hasta el Sprint 4.
    const aMano = /\b\d+(\.\d+)?\s*\*\s*CONFIG\.celda\b|\bCONFIG\.celda\s*\*\s*\d/;
    const infractores = motor.filter((archivo) => aMano.test(sinComentarios(readFileSync(join(RAIZ, archivo), 'utf8'))));
    expect(infractores).toEqual([]);
  });

  it('el catálogo declara nombres (la prueba no está vacía)', () => {
    expect(nombres.size).toBeGreaterThan(30);
  });
});
