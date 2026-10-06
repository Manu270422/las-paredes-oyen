// Puntos de control por dificultad, caminando:
// 1) Pesadilla no guarda ni borra: con una partida de Normal guardada, se juega Pesadilla, se muere, se empieza
//    de nuevo (de cero de verdad) y "Continuar" sigue cargando la partida de Normal, intacta byte por byte.
// 2) Difícil solo guarda al medir un apartamento: leer la orden no guarda; medir el 401 sí (y la partida dice
//    que es Difícil); al morir vuelvo al 401 y "Continuar" la retoma en Difícil.
// Aquí la dificultad se elige llamando a la partida nueva por dentro (para ir directo al guardado): la pantalla
// para elegirla se prueba en pantallaDificultad.spec.ts.
import { expect, test, type Page } from '@playwright/test';
import { leerLaOrden, morir, partidaGuardada, PREFIJO } from './acciones';
import { instalarPiloto } from './piloto';

interface JuegoInterno {
  nuevaPartida(dificultad: string): void;
  dificultadPartida: { actual: string };
  puntoControl: string;
}

const perfil = (page: Page) => page.evaluate((p) => JSON.parse(localStorage.getItem(p + 'perfil') ?? 'null') as { partidasIniciadas: number; muertesTotales: number }, PREFIJO);

async function empezar(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await instalarPiloto(page);
}

/** Salgo al menú desde la pausa en una dificultad que guarda: el aviso dice que el progreso queda guardado. */
async function salirAlMenu(page: Page): Promise<void> {
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  await page.locator('.pausa').getByRole('button', { name: 'Salir al menú principal' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Tu progreso queda guardado');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salir al menú', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'menu', null, { timeout: 10_000 });
}

const estado = (page: Page) =>
  page.evaluate(() => {
    const J = window.__juego!;
    const interno = J as unknown as JuegoInterno;
    return {
      dificultad: interno.dificultadPartida.actual,
      puntosControl: J.ctx.dificultad.puntosControl,
      puntoControl: interno.puntoControl,
      banderas: J.ctx.progreso.exportar().banderas,
      muertes: J.ctx.memoria.muertes,
    };
  });

test('Pesadilla no guarda ni borra: muere, empieza de cero, y "Continuar" carga la partida de Normal intacta', async ({ page }) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await empezar(page);

  // 1. Normal: leo la orden y eso guarda (punto de control de la escalera).
  await leerLaOrden(page);
  const normal = await partidaGuardada(page);
  expect(JSON.parse(normal ?? 'null'), 'la partida de Normal quedó guardada').toMatchObject({ dificultad: 'normal', puntoControl: 'escalera' });
  await salirAlMenu(page);
  const perfilAntes = await perfil(page);

  // 2. Pesadilla: empezarla no borra la de Normal.
  await page.evaluate(() => (window.__juego as unknown as JuegoInterno).nuevaPartida('pesadilla'));
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  expect(await partidaGuardada(page), 'empezar Pesadilla no la borra').toBe(normal);
  await leerLaOrden(page);
  expect((await estado(page)).banderas, 'en Pesadilla leer la orden también avanza…').toContain('leyo:orden_trabajo');
  expect(await partidaGuardada(page), '…pero no guarda nada').toBe(normal);

  // 3. Muero: la pantalla dice que se empieza de nuevo, y morir no toca la partida de Normal.
  await morir(page);
  await expect(page.getByRole('button', { name: 'Empezar de nuevo' })).toBeVisible();
  expect(await partidaGuardada(page), 'morir en Pesadilla no la toca').toBe(normal);

  // 4. Empiezo de nuevo: de cero de verdad (sin banderas, estadísticas en 0), sigo en Pesadilla.
  await page.getByRole('button', { name: 'Empezar de nuevo' }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  expect(await estado(page)).toEqual({ dificultad: 'pesadilla', puntosControl: 'ninguno', puntoControl: 'escalera', banderas: [], muertes: 0 });
  const perfilDespues = await perfil(page);
  expect(perfilDespues.muertesTotales, 'la muerte cuenta en el perfil').toBe(perfilAntes.muertesTotales + 1);
  expect(perfilDespues.partidasIniciadas, 'Pesadilla + el reinicio: dos partidas iniciadas').toBe(perfilAntes.partidasIniciadas + 2);
  expect(await partidaGuardada(page)).toBe(normal);

  // 5. En la pausa, "volver al punto de control" también dice la verdad.
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  // Dentro de la pausa: la pantalla de muerte todavía puede estar en su fundido de salida (300 ms).
  await expect(page.locator('.pausa').getByRole('button', { name: 'Empezar de nuevo' })).toBeVisible();

  // 6. Salir en Pesadilla pierde la partida: el aviso lo dice, y "Seguir jugando" no sale.
  await page.locator('.pausa').getByRole('button', { name: 'Salir al menú principal' }).click();
  const aviso = page.getByRole('alertdialog');
  await expect(aviso).toContainText('Si sales, pierdes esta partida');
  await aviso.getByRole('button', { name: 'Seguir jugando' }).click();
  await expect(aviso).toHaveCount(0);
  expect(await page.evaluate(() => window.__juego!.estado), 'sigo en la pausa, con la partida').toBe('pausa');
  await page.locator('.pausa').getByRole('button', { name: 'Salir al menú principal' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salir y perderla' }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'menu');

  // 7. "Continuar" carga la partida de Normal: su dificultad, su punto de control y sus banderas.
  await page.locator('.menu').getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  const continuada = await estado(page);
  expect(continuada).toMatchObject({ dificultad: 'normal', puntosControl: 'todos', puntoControl: 'escalera' });
  expect(continuada.banderas).toContain('leyo:orden_trabajo');
  expect(await partidaGuardada(page), 'cargarla no la cambia').toBe(normal);
  expect(errores, 'errores de consola').toEqual([]);
});

test('Difícil solo guarda al medir un apartamento, y "Continuar" la retoma en Difícil', async ({ page }) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await empezar(page);
  await page.evaluate(() => (window.__juego as unknown as JuegoInterno).nuevaPartida('dificil'));
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await instalarPiloto(page);

  // Leer la orden en Normal guarda; en Difícil, no.
  await leerLaOrden(page);
  expect(await partidaGuardada(page), 'en Difícil leer la orden no guarda').toBeNull();

  // Medir el 401 sí guarda, y la partida dice que es Difícil.
  await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    await P.caminar([[3.6, 10.5], [7.5, 10.5]]);
    const puerta = ctx.nivel.puertas.find((p) => p.id === 'p401')!;
    const h = puerta.puntoInteraccion();
    P.mirarA(h.x, h.y, h.z);
    await P.esperarJuego(0.3);
    await P.pulsar('KeyE');
    const limite = performance.now() + 6000;
    while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
    await P.esperarJuego(0.8);
    await P.caminar([[7.5, 9.5], [7.5, 7.6], [9.5, 7.25]], 0.18);
    const x = ctx.nivel.interactuables.find((i) => i.id === 'medir401')!.objeto.position;
    P.mirarA(x.x, 0, x.z);
    ctx.jugador.pitch = -1.2;
    await P.esperarJuego(0.3);
    P.sostener('KeyQ');
    await P.pulsar('KeyE');
    const inicio = ctx.programador.ahora;
    while (!ctx.progreso.tiene('medido:401') && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
    P.soltar('KeyQ');
  });
  expect(JSON.parse((await partidaGuardada(page)) ?? 'null'), 'medir el 401 guarda en Difícil').toMatchObject({ dificultad: 'dificil', puntoControl: 'sala401' });

  // Muero (salgo del 401 por su puerta): reintentar me devuelve al 401, en Difícil.
  await morir(page, [[7.5, 7.6], [7.5, 9.5], [7.5, 10.5], [10, 10.5]]);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  expect(await estado(page)).toMatchObject({ dificultad: 'dificil', puntosControl: 'mayores', puntoControl: 'sala401' });

  // "Continuar" desde el menú también la retoma en Difícil.
  await salirAlMenu(page);
  await page.evaluate(() => {
    // Desde el menú, la próxima partida "por defecto" no debe colarse: Continuar manda la guardada.
    (window.__juego as unknown as JuegoInterno).dificultadPartida.actual = 'normal';
  });
  await page.locator('.menu').getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  expect(await estado(page)).toMatchObject({ dificultad: 'dificil', puntosControl: 'mayores', puntoControl: 'sala401' });
  expect(errores, 'errores de consola').toEqual([]);
});
