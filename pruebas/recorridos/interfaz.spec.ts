// Errores de interfaz que no se ven en el tipado: se prueban en el juego real.
import { expect, test, type Page } from '@playwright/test';

async function iniciar(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
}

test('sin telemetría, la pantalla final no muestra "Exportar registro de la prueba"', async ({ page }) => {
  await iniciar(page);
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await page.waitForTimeout(1000);
  // Es la pantalla final, abierta por código: aquí solo se prueba cómo se dibuja.
  await page.evaluate(() => (window.__juego as unknown as { terminarDemo(): void }).terminarDemo());
  await expect(page.locator('.fin__estadisticas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar registro de la prueba' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Volver al menú' })).toBeVisible();
});

test('con ?telemetria=1, el botón de exportar sí aparece', async ({ page }) => {
  await page.goto('/?telemetria=1');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await page.waitForTimeout(1000);
  await page.evaluate(() => (window.__juego as unknown as { terminarDemo(): void }).terminarDemo());
  await expect(page.getByRole('button', { name: 'Exportar registro de la prueba' })).toBeVisible();
});

test('una pantalla oculta sale del árbol de accesibilidad y no se puede enfocar', async ({ page }) => {
  await iniciar(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__juego?.estado === 'menu');
  // La salida es una animación de 300 ms: hasta que termina, la pantalla sigue "visible" (es normal).
  // No espero un tiempo fijo: con la máquina cargada (la suite completa) 700 ms a veces no alcanzaban.
  // Pregunto hasta que se oculten; si una nunca se oculta, falla igual al vencer el plazo.
  const revisar = () =>
    page.evaluate(() => {
      const ocultas = [...document.querySelectorAll<HTMLElement>('.pantalla.pantalla--oculta')];
      return {
        total: ocultas.length,
        visibles: ocultas.filter((p) => getComputedStyle(p).visibility !== 'hidden').map((p) => p.className),
      };
    });
  await expect.poll(async () => (await revisar()).visibles, { message: 'pantallas ocultas que siguen visibles', timeout: 5000 }).toEqual([]);
  expect((await revisar()).total, 'hay pantallas ocultas que revisar').toBeGreaterThan(5);
  // Lo que ve un lector de pantalla: la pantalla de inicio ya no existe, el menú sí.
  await expect(page.getByRole('button', { name: /Este juego se escucha/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nueva partida', exact: true })).toBeVisible();
});
