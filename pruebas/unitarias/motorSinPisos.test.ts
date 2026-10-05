// El motor no debe conocer el contenido de un piso. Esta prueba falla si cualquier archivo de
// src/ FUERA de src/pisos/ nombra un apartamento del Piso 4 (401, 402, 403: en el código,
// no en los comentarios) o importa la carpeta de un piso directamente.
//
// Fue una MATRACA durante A1: cada mención que quedaba estaba en una lista de excepciones que solo podía
// bajar. Con el paso 8 (los datos del Piso 4 en su carpeta) la lista quedó vacía y se borró: hoy el motor
// tiene CERO menciones y cualquiera nueva hace fallar la prueba.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(RAIZ, 'src');

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
  it('ningún archivo del motor nombra 401, 402 o 403 en su código', () => {
    const menciones = delMotor
      .map((ruta) => ({ archivo: relativa(ruta), n: (sinComentarios(readFileSync(ruta, 'utf8')).match(/40[123]/g) ?? []).length }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.archivo}: ${x.n}`);
    expect(menciones, 'archivos del motor que nombran un apartamento').toEqual([]);
  });

  it('la prueba mira de verdad: el motor tiene muchos archivos y el piso sí nombra sus apartamentos', () => {
    expect(delMotor.length).toBeGreaterThan(100);
    const delPiso = archivosDe(join(SRC, 'pisos'));
    const enElPiso = delPiso.reduce((n, ruta) => n + (sinComentarios(readFileSync(ruta, 'utf8')).match(/40[123]/g) ?? []).length, 0);
    expect(enElPiso).toBeGreaterThan(50);
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
