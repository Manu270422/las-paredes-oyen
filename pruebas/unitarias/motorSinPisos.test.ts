// El motor no debe conocer el contenido de un piso. Esta prueba falla si cualquier archivo de
// src/ FUERA de src/pisos/ nombra un apartamento del Piso 4 (401, 402, 403: en el código,
// no en los comentarios) o importa la carpeta de un piso directamente.
//
// Es una MATRACA: hoy el motor todavía tiene menciones (A1 está en curso), así que cada una
// está en EXCEPCIONES con el paso de A1 que la elimina. El número debe coincidir EXACTO:
//   - si agregas una mención nueva, la prueba falla (la lista no puede crecer);
//   - si quitas una, también falla, para obligarte a bajar la cifra aquí.
// Al terminar el paso 8, EXCEPCIONES queda vacía y se borra.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(RAIZ, 'src');

interface Excepcion {
  /** Cuántas menciones de 401/402/403 hay hoy en el código de ese archivo. */
  menciones: number;
  /** El paso de A1 (docs/propuestas/A1-pisos-como-paquetes.md) que las elimina. */
  hastaElPaso: number;
}

const EXCEPCIONES: Record<string, Excepcion> = {
  // Paso 6: el guion (cintas, apagón, final) es un módulo del piso.
  'src/narrativa/Guion.ts': { menciones: 7, hastaElPaso: 6 },
  'src/narrativa/SecuenciaFinal.ts': { menciones: 1, hastaElPaso: 6 },
  // Paso 8: los datos del Piso 4 se mueven físicamente a src/pisos/piso4/.
  'src/mundo/datos/MapaPiso4.ts': { menciones: 59, hastaElPaso: 8 },
  'src/narrativa/Documentos.ts': { menciones: 17, hastaElPaso: 8 },
  'src/narrativa/Objetivos.ts': { menciones: 12, hastaElPaso: 8 },
  'src/narrativa/Transcripciones.ts': { menciones: 4, hastaElPaso: 8 },
  // Paso 5: los objetos del mapa (la llave del 402) pasan a ser datos del paquete: el id del objeto
  // deja de ser una unión fija de tipos y su modelo y texto salen de ahí (decidido por el dueño).
  'src/mundo/datos/TiposMapa.ts': { menciones: 1, hastaElPaso: 5 },
  'src/interaccion/objetos/Recogible.ts': { menciones: 4, hastaElPaso: 5 },
};

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta);
    return ruta.endsWith('.ts') ? [ruta] : [];
  });
}

/** El código sin comentarios (los comentarios pueden hablar de los apartamentos). */
function sinComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .split('\n')
    .map((linea) => linea.replace(/(^|[^:'"`])\/\/.*$/, '$1'))
    .join('\n');
}

const relativa = (ruta: string) => relative(RAIZ, ruta).split(sep).join('/');
const delMotor = archivosDe(SRC).filter((r) => !relativa(r).startsWith('src/pisos/'));

describe('El motor no conoce el contenido de un piso', () => {
  const menciones = new Map<string, number>();
  for (const ruta of delMotor) {
    const n = (sinComentarios(readFileSync(ruta, 'utf8')).match(/40[123]/g) ?? []).length;
    if (n > 0) menciones.set(relativa(ruta), n);
  }

  it('no hay menciones nuevas de 401, 402 o 403 fuera de las excepciones (la lista no crece)', () => {
    const nuevas = [...menciones].filter(([archivo]) => !(archivo in EXCEPCIONES)).map(([archivo, n]) => `${archivo}: ${n}`);
    expect(nuevas, 'archivos del motor que nombran un apartamento y no están en EXCEPCIONES').toEqual([]);
  });

  it('cada excepción coincide EXACTO con la realidad (si bajó, hay que bajar la cifra aquí)', () => {
    const desajustes = Object.entries(EXCEPCIONES)
      .map(([archivo, e]) => ({ archivo, esperadas: e.menciones, reales: menciones.get(archivo) ?? 0 }))
      .filter((x) => x.esperadas !== x.reales)
      .map((x) => `${x.archivo}: la lista dice ${x.esperadas}, el código tiene ${x.reales}`);
    expect(desajustes).toEqual([]);
  });

  it('todas las excepciones apuntan a archivos que existen', () => {
    const existentes = new Set(delMotor.map(relativa));
    expect(Object.keys(EXCEPCIONES).filter((a) => !existentes.has(a))).toEqual([]);
  });

  it('los objetivos, documentos y cintas se leen de ctx.piso: nadie fuera de src/pisos/ importa los datos globales', () => {
    // Los TIPOS (import type) sí se pueden importar; los DATOS (OBJETIVOS, DOCUMENTOS, TRANSCRIPCIONES) no.
    const infractores = delMotor
      .filter((ruta) => /^import\s+\{[^}]*\b(OBJETIVOS|DOCUMENTOS|TRANSCRIPCIONES)\b[^}]*\}\s+from/m.test(sinComentarios(readFileSync(ruta, 'utf8'))))
      .map(relativa);
    expect(infractores).toEqual([]);
  });

  it('nada fuera de src/pisos/ importa la carpeta de un piso: se pide por el catálogo', () => {
    const infractores = delMotor
      .filter((ruta) => /from\s+['"][^'"]*pisos\/piso\d+/.test(sinComentarios(readFileSync(ruta, 'utf8'))))
      .map(relativa);
    expect(infractores).toEqual([]);
  });
});
