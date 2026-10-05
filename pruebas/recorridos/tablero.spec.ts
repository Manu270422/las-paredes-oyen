// El tablero eléctrico, de verdad y caminando: por el pasillo hasta el cuarto de servicio, se abre su puerta
// con E y se sube el interruptor con E. La bandera que marca sale del MAPA (dato del interactuable), no del
// código del tablero; y con ella la luz vuelve al piso (los datos de luzPorBandera).
import { expect, test } from '@playwright/test';
import { instalarPiloto } from './piloto';

test('subir el interruptor del cuarto de servicio marca la bandera del mapa y devuelve la luz', async ({ page }) => {
  test.setTimeout(240_000);
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

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const bandera = ctx.piso.mapa.interactuables.find((i) => i.tipo === 'tablero')!.bandera!;
    const salida: Record<string, unknown> = { bandera, antes: ctx.progreso.tiene(bandera) };

    await P.caminar([[3.6, 10.5], [12, 10.5], [16.5, 10.3], [18.2, 10.3], [20.5, 10.5], [26.2, 10.75], [27.5, 10.5]]);
    const puerta = ctx.nivel.puertas.find((p) => p.id === 'pServicio')!;
    const h = puerta.puntoInteraccion();
    P.mirarA(h.x, h.y, h.z);
    await P.esperarJuego(0.3);
    await P.pulsar('KeyE');
    const limite = performance.now() + 6000;
    while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
    await P.esperarJuego(0.8);
    await P.caminar([[29.5, 10.5]]);

    const tablero = ctx.nivel.interactuables.find((i) => i.id === 'tablero')!;
    const pos = tablero.objeto.getWorldPosition(tablero.objeto.position.clone());
    P.mirarA(pos.x, pos.y, pos.z);
    await P.esperarJuego(0.3);
    salida.enfocado = J.interaccion.enfocado?.id ?? null;
    await P.pulsar('KeyE');
    await P.esperarJuego(0.6);
    salida.despues = ctx.progreso.tiene(bandera);
    salida.yaNoSeAcciona = !tablero.activo;
    salida.pasillo = ctx.nivel.lamparas.filter((l) => l.id.startsWith('pasillo')).map((l) => l.estado);
    // Al recargar el punto de control, el interruptor sigue arriba.
    ctx.nivel.restablecer(ctx);
    salida.trasRestablecer = !tablero.activo;
    salida.estado = J.estado;
    return salida;
  });

  expect(r.bandera, 'la bandera del tablero es un dato del mapa').toBe('tablero_activado');
  expect(r.antes).toBe(false);
  expect(r.enfocado, 'la mirada cae sobre el tablero').toBe('tablero');
  expect(r.despues, 'subir el interruptor marca la bandera del mapa').toBe(true);
  expect(r.yaNoSeAcciona, 'arriba, ya no se puede volver a accionar').toBe(true);
  expect(r.pasillo, 'la luz vuelve al pasillo').toEqual(['encendida', 'encendida', 'encendida', 'encendida', 'encendida']);
  expect(r.trasRestablecer, 'al restaurar la partida, el interruptor sigue arriba').toBe(true);
  expect(r.estado).toBe('jugando');
  expect(errores, 'errores de consola').toEqual([]);
});
