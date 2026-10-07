// El tope de complejidad del orquestador (A5 del Sprint 3): Juego.ts no pasa de 700 líneas. Llegó a 789 sin que
// nadie lo notara; esta prueba lo nota. Si algo nuevo no cabe, va a su propio archivo (como ViajeEscalera o
// FinDePiso), no aquí.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const TOPE = 700;

it(`Juego.ts no pasa de ${TOPE} líneas`, () => {
  const lineas = readFileSync(new URL('../../src/nucleo/Juego.ts', import.meta.url), 'utf8').trimEnd().split('\n').length;
  expect(lineas, `Juego.ts tiene ${lineas} líneas: saca algo a su propio archivo`).toBeLessThanOrEqual(TOPE);
});
