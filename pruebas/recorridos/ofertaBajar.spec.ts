// La oferta de bajar un escalón tras morir seguido (paso 4 de la Tarea 4), caminando y muriendo de verdad:
// en Difícil, las dos primeras muertes no ofrecen nada; la tercera ofrece Normal (nunca baja sola); aceptarla
// reintenta en Normal; y a la cuarta ya no se ofrece (una vez por tramo). La telemetría anota la dificultad, la
// versión de la compilación y el cambio con su motivo.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, morir } from './acciones';

interface SesionInterna {
  entorno: { dificultad: string; compilacion: string };
  eventos: { tipo: string; datos?: Record<string, unknown> }[];
}

const actual = (page: Page) => page.evaluate(() => (window.__juego as unknown as { dificultadPartida: { actual: string } }).dificultadPartida.actual);
const sesion = (page: Page) => page.evaluate(() => (window.__juego as unknown as { telemetria: { sesion: SesionInterna } }).telemetria.sesion);

test('tras 3 muertes seguidas se ofrece bajar un escalón (solo esa vez), y la telemetría lo anota', async ({ page }) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page, '/?telemetria=1');
  await expect(page.locator('.menu__version'), 'el pie del menú dice qué versión es').toHaveText(/^Versión \d+\.\d+\.\d+\+\w+$/);
  await elegirYEmpezar(page, 'Difícil');
  await esperarJugando(page);
  expect((await sesion(page)).entorno, 'la sesión dice con qué dificultad y qué versión').toMatchObject({ dificultad: 'dificil', compilacion: expect.stringMatching(/\+local$/) });

  const muerte = page.locator('.muerte');
  const oferta = muerte.getByRole('button', { name: 'Probar en Normal desde aquí' });
  // Dos muertes: nada que ofrecer todavía.
  for (let i = 1; i <= 2; i++) {
    await morir(page);
    await expect(muerte.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(oferta, `muerte ${i}: no se ofrece`).toHaveCount(0);
    await muerte.getByRole('button', { name: 'Reintentar' }).click();
    await esperarJugando(page);
    expect(await actual(page)).toBe('dificil');
  }

  // La tercera: se ofrece Normal, en voz baja, y no baja sola.
  await morir(page);
  await expect(oferta).toBeVisible();
  await expect(muerte).toContainText('Puedes volver a subirla en Ajustes.');
  expect(await actual(page), 'ofrecer no es bajar').toBe('dificil');
  await oferta.click();
  await esperarJugando(page);
  expect(await actual(page), 'aceptar reintenta en Normal').toBe('normal');
  expect(await page.evaluate(() => window.__juego!.ctx.dificultad.puntosControl)).toBe('todos');
  const cambio = (await sesion(page)).eventos.find((e) => e.tipo === 'dificultad');
  expect(cambio?.datos, 'la telemetría anota el cambio y su motivo').toEqual({ de: 'dificil', a: 'normal', motivo: 'oferta' });

  // La cuarta muerte del mismo tramo ya no ofrece nada (en Normal se ofrecería Historia: tampoco).
  await morir(page);
  await expect(muerte.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(muerte.getByRole('button', { name: /^Probar en/ }), 'una sola vez por tramo').toHaveCount(0);
  expect(errores, 'errores de consola').toEqual([]);
});
