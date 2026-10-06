// Acciones de jugador que usan varios recorridos: empezar una partida eligiendo la dificultad, leer la orden de
// trabajo caminando, morir de verdad (la criatura caza con su aviso) y salir al menú desde la pausa.
import { expect, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

export const PREFIJO = 'las-paredes-oyen:';

export const partidaGuardada = (page: Page) => page.evaluate((p) => localStorage.getItem(p + 'partida'), PREFIJO);

/** Desde la pantalla de inicio: "Nueva partida", elijo la dificultad por su nombre y "Empezar" (sin confirmar avisos). */
export async function abrirEleccion(page: Page, direccion = '/'): Promise<void> {
  await page.goto(direccion);
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await expect(page.locator('.dificultad')).toBeVisible();
}

/** En la pantalla para elegir: marco esa dificultad (por su nombre) y pulso "Empezar". */
export async function elegirYEmpezar(page: Page, nombre: string): Promise<void> {
  await page.locator('.dificultad').getByRole('radio', { name: new RegExp(`^${nombre}`) }).click();
  await page.locator('.dificultad').getByRole('button', { name: 'Empezar', exact: true }).click();
}

export async function esperarJugando(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__juego?.estado === 'jugando', null, { timeout: 15_000 });
  await instalarPiloto(page);
}

/** Camino hasta la caja de la escalera y leo la orden de trabajo con E (y la cierro). */
export async function leerLaOrden(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const P = window.__piloto!;
    await P.caminar([[2.2, 9.5]]);
    P.mirarA(1.5 * 1.3, 0.56, 8.6 * 1.3);
    await P.esperarJuego(0.3);
    await P.pulsar('KeyE');
    await P.esperarEstado('documento');
    await P.esperarReal(400);
    await P.pulsar('KeyE');
    await P.esperarEstado('jugando');
  });
}

/** Camino por la ruta y la criatura me caza de verdad (aviso incluido) hasta atraparme. */
export async function morir(page: Page, ruta: ReadonlyArray<readonly [number, number]> = [[3.6, 10.5], [10, 10.5]]): Promise<void> {
  await page.evaluate(async (ruta) => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    await P.caminar(ruta);
    const p = ctx.jugador.posicion;
    ctx.entidad.manifestar(p.x + 3, p.z, ctx);
    ctx.entidad.cazar('paso', ctx);
    const limite = performance.now() + 10_000;
    while (J.estado === 'jugando' && performance.now() < limite) await P.esperarReal(20);
  }, ruta);
  await page.waitForFunction(() => window.__juego?.estado === 'muerte', null, { timeout: 15_000 });
}

/** Pausa → Ajustes → pestaña Juego. */
export async function abrirAjustesEnPausa(page: Page): Promise<void> {
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  await page.locator('.pausa').getByRole('button', { name: 'Ajustes', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('tab', { name: 'Juego' }).click();
}

/** Cierro Ajustes y vuelvo al juego desde la pausa. */
export async function volverAlJuego(page: Page): Promise<void> {
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: 'Volver', exact: true }).click();
  await page.locator('.pausa').getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
}
