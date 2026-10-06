// Las luces que cambian con una bandera salen de los DATOS del piso (luzPorBandera), por dos caminos:
// 1) en el momento: se marca la bandera y el guion/nivel aplica el cambio;
// 2) al restaurar: se vuelve a cargar un punto de control y el nivel reconstruye las luces desde las banderas.
// La prueba no teletransporta: solo cambia el progreso y mira el estado real de cada lámpara.
import { expect, test } from '@playwright/test';

test('el tablero y el apagón cambian las luces del piso, en el momento y al restaurar', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');

  const r = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const estados = () => Object.fromEntries(ctx.nivel.lamparas.map((l) => [l.id, l.estado]));
    const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const inicio = estados();

    // 1) En el momento: marcar la bandera del tablero (el guion aplica la luz de su paquete).
    ctx.progreso.marcar('tablero_activado');
    await esperar(300);
    const trasTablero = estados();

    // 2) El apagón ya ocurrido (la bandera que deja la secuencia al terminar).
    ctx.progreso.marcar('apagon_pasillo');
    ctx.nivel.restablecer(ctx);
    const restaurado = estados();

    // 3) Una partida sin esas banderas vuelve a su estado inicial.
    ctx.progreso.importar(null);
    ctx.nivel.restablecer(ctx);
    const sinBanderas = estados();
    return { inicio, trasTablero, restaurado, sinBanderas };
  });

  const GENERAL = ['pasillo1', 'pasillo2', 'pasillo3', 'pasillo4', 'pasillo5', 'lampara403', 'lamparaEstudio', 'lamparaServicio'];
  expect(r.inicio.lampara402, 'el 402 empieza roto').toBe('rota');
  for (const id of GENERAL) expect(r.inicio[id], `${id} empieza apagada`).toBe('apagada');

  for (const id of GENERAL) expect(r.trasTablero[id], `${id}: el tablero devuelve la luz`).toBe('encendida');
  expect(r.trasTablero.lampara402, 'en el 402 nunca hay luz').toBe('rota');
  expect(r.trasTablero.emergencia, 'la luz de emergencia no depende del tablero').toBe(r.inicio.emergencia);
  expect(r.trasTablero.lampara401, 'la lámpara fantasma del 401 tampoco').toBe(r.inicio.lampara401);

  for (const id of ['pasillo1', 'pasillo2', 'pasillo3', 'pasillo4', 'pasillo5']) expect(r.restaurado[id], `${id}: tras el apagón queda rota`).toBe('rota');
  for (const id of ['lampara403', 'lamparaEstudio', 'lamparaServicio']) expect(r.restaurado[id], `${id}: el apagón no la toca`).toBe('encendida');
  expect(r.restaurado.lampara402).toBe('rota');

  expect(r.sinBanderas, 'sin banderas, las luces vuelven al estado inicial').toEqual(r.inicio);
  expect(errores, 'errores de consola').toEqual([]);
});
