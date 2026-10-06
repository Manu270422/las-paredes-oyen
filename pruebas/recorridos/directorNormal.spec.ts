// Golden master de Normal: con la misma semilla, el director del juego de hoy hace EXACTAMENTE lo mismo que el
// del juego congelado para el Gate 1 (etiqueta gate1-congelado). Cubre de 0 a 4 muertes seguidas, así que
// también prueba que el alivio de Normal no cambió.
//
// El archivo esperado se grabó con el código de la etiqueta (ver docs/propuestas/T4-dificultad.md):
//   1. git archive gate1-congelado | tar -x -C <carpeta>   (solo lee el repositorio)
//   2. en esa carpeta: node_modules enlazado (junction) al del proyecto, y Vite en el puerto 5175 con una config que
//      importe el vite.config de la etiqueta y le ponga su propio cacheDir (para no pisar la caché del proyecto)
//   3. GRABAR_DIRECTOR_DESDE=http://localhost:5175 npx playwright test --config pruebas/playwright.config.ts directorNormal
// Sin esa variable, la prueba corre contra el juego de hoy y compara.
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SIMULACION_NORMAL, simularDirector, type RegistroDirector } from './simulacionDirector';

const ESPERADO = new URL('../datos/director-normal-gate1.json', import.meta.url);
const GRABAR_DESDE = process.env.GRABAR_DIRECTOR_DESDE?.trim();

interface Grabacion {
  origen: string;
  opciones: typeof SIMULACION_NORMAL;
  registro: RegistroDirector;
}

test('Normal: con la misma semilla, el director hace lo mismo que en gate1-congelado (alivio incluido)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(GRABAR_DESDE ?? '/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  const registro = await simularDirector(page);

  if (GRABAR_DESDE) {
    const grabacion: Grabacion = { origen: `gate1-congelado, grabado desde ${GRABAR_DESDE}`, opciones: SIMULACION_NORMAL, registro };
    writeFileSync(ESPERADO, JSON.stringify(grabacion, null, 1) + '\n');
    return;
  }

  const esperado = JSON.parse(readFileSync(ESPERADO, 'utf8')) as Grabacion;
  expect(esperado.opciones, 'la grabación usa la misma simulación').toEqual(SIMULACION_NORMAL);
  // Que la simulación de verdad haga algo (si el director no lanzara nada, "igual" no probaría nada).
  const eventos = Object.values(registro).flat().filter((l) => !l.includes(' fase ')).length;
  expect(eventos, 'eventos del director en todas las corridas').toBeGreaterThan(200);
  for (const [corrida, lineas] of Object.entries(esperado.registro)) {
    expect(registro[corrida], `corrida ${corrida}`).toEqual(lineas);
  }
  expect(Object.keys(registro).sort()).toEqual(Object.keys(esperado.registro).sort());
});
