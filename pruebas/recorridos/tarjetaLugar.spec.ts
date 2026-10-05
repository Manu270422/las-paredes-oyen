// La tarjeta discreta de lugar, caminando: al cruzar por primera vez al 401 aparece "Apartamento 401" (pequeña,
// abajo, breve), no se repite al volver a entrar y una partida nueva no hereda la bandera que la recuerda.
import { expect, test } from '@playwright/test';
import { instalarPiloto } from './piloto';

declare global {
  interface Window {
    /** Los títulos de las tarjetas discretas que salieron, anotados desde el bus. */
    __tarjetas?: string[];
  }
}

/** Desde el pasillo: camino hasta el 401, abro su puerta con E y entro hasta la sala. Devuelve la tarjeta en pantalla. */
async function entrarAl401(): Promise<{ texto: string; clases: string; bandera: boolean }> {
  const J = window.__juego!;
  const P = window.__piloto!;
  const { ctx } = J;
  await P.caminar([[3.6, 10.5], [7.5, 10.55]]);
  const puerta = ctx.nivel.puertas.find((q) => q.id === 'p401')!;
  if (!puerta.abierta) {
    const h = puerta.puntoInteraccion();
    P.mirarA(h.x, h.y, h.z);
    await P.esperarJuego(0.3);
    await P.pulsar('KeyE');
    const limite = performance.now() + 6000;
    while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
    await P.esperarJuego(0.8);
  }
  await P.caminar([[7.5, 9.5], [7.5, 7.6]]);
  const tarjeta = document.querySelector('.tarjeta')!;
  return { texto: tarjeta.textContent ?? '', clases: tarjeta.className, bandera: ctx.progreso.tiene('lugar:401') };
}
test('al cruzar al 401 sale una tarjeta discreta una sola vez, y una partida nueva no hereda "lugar:401"', async ({ page }) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await instalarPiloto(page);
  await page.evaluate(() => {
    window.__tarjetas = [];
    // Solo las discretas: la de cine del comienzo (lugar y hora) no es de esta prueba.
    window.__juego!.ctx.bus.on('tarjeta', (t) => {
      if (t.estilo === 'discreta') window.__tarjetas!.push(t.titulo);
    });
  });

  // 1. Primera vez en el 401: la tarjeta discreta, y la bandera que la recuerda.
  const primera = await page.evaluate(entrarAl401);
  expect(primera.texto, 'la tarjeta en pantalla').toBe('Apartamento 401');
  expect(primera.clases).toContain('tarjeta--visible');
  expect(primera.clases).toContain('tarjeta--discreta');
  expect(primera.bandera).toBe(true);

  // 2. Salgo al pasillo y vuelvo a entrar: no se repite.
  await page.evaluate(async () => {
    await window.__piloto!.caminar([[7.5, 9.5], [7.5, 10.5]]);
  });
  await page.evaluate(entrarAl401);
  expect(await page.evaluate(() => window.__tarjetas), 'una sola tarjeta por apartamento').toEqual(['Apartamento 401']);

  // 3. Al menú y "Nueva partida": la bandera no pasa a la partida nueva, y la tarjeta vuelve a salir.
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  await page.getByRole('button', { name: 'Salir al menú principal' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salir al menú', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'menu', null, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  // Si quedó una partida guardada, el menú pide confirmar que se borra.
  const confirmar = page.getByRole('alertdialog').getByRole('button', { name: 'Empezar de nuevo' });
  if (await confirmar.isVisible()) await confirmar.click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando', null, { timeout: 10_000 });
  const alEmpezar = await page.evaluate(() => {
    const { ctx } = window.__juego!;
    return { tiene: ctx.progreso.tiene('lugar:401'), exportadas: ctx.progreso.exportar().banderas.filter((b) => b.startsWith('lugar:')) };
  });
  expect(alEmpezar, 'la partida nueva empieza sin banderas de lugar').toEqual({ tiene: false, exportadas: [] });
  const otraVez = await page.evaluate(entrarAl401);
  expect(otraVez.texto).toBe('Apartamento 401');
  expect(await page.evaluate(() => window.__tarjetas)).toEqual(['Apartamento 401', 'Apartamento 401']);
  expect(errores, 'errores de consola').toEqual([]);
});
