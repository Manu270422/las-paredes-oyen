// Guardado versionado (A2) en el juego real: un jugador que tiene datos de la
// versión publicada hoy (ajustes SIN versión y una partida v1 en el 401)
// recibe la actualización. Nada de lo suyo se pierde, sigue jugando caminando,
// muere, recarga la página y su perfil y su partida siguen ahí.
import { expect, test } from '@playwright/test';
import { instalarPiloto } from './piloto';

const PREFIJO = 'las-paredes-oyen:';

test('los datos de la versión publicada sobreviven a la actualización y el perfil persiste', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));

  // Lo que la versión publicada guardó en el navegador de un jugador real.
  await page.addInitScript((prefijo) => {
    if (sessionStorage.getItem('sembrado')) return;
    sessionStorage.setItem('sembrado', '1');
    localStorage.setItem(prefijo + 'ajustes', JSON.stringify({ volumenMaestro: 0.37, subtitulosEfectos: false }));
    localStorage.setItem(
      prefijo + 'partida',
      JSON.stringify({
        version: 1,
        puntoControl: 'sala401',
        progreso: { banderas: ['leyo:orden_trabajo', 'medido:401'], inventario: [], documentos: ['orden_trabajo'] },
        bateria: 0.8,
        tiempoJugado: 240,
        fecha: 1,
        estadisticas: { persecuciones: 0, muertes: 0, sustos: 1 },
      }),
    );
  }, PREFIJO);

  const abrirMenu = async () => {
    await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__juego?.estado === 'menu');
  };

  await page.goto('/');
  await abrirMenu();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await instalarPiloto(page);

  const r = await page.evaluate(async (prefijo) => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const antes = {
      volumen: ctx.ajustes.valores.volumenMaestro,
      subtitulosEfectos: ctx.ajustes.valores.subtitulosEfectos,
      ajustesGuardados: JSON.parse(localStorage.getItem(prefijo + 'ajustes') ?? 'null'),
      habitacion: ctx.memoria.habitacionActual,
    };
    // Salgo del 401 caminando (abro la puerta con E si está cerrada).
    await P.caminar([[7.5, 7.6], [7.5, 8.4]]);
    const puerta = ctx.nivel.puertas.find((p) => p.id === 'p401')!;
    if (!puerta.abierta) {
      const hoja = puerta.puntoInteraccion();
      P.mirarA(hoja.x, hoja.y, hoja.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      const limite = performance.now() + 5000;
      while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.8);
    }
    await P.caminar([[7.5, 9.5], [7.5, 10.5], [10, 10.5]]);
    const enPasillo = ctx.memoria.habitacionActual;

    // Muero de verdad (la caza avisa y me atrapa) para que el perfil lo registre.
    const p = ctx.jugador.posicion;
    ctx.entidad.manifestar(p.x + 3, p.z, ctx);
    ctx.entidad.cazar('paso', ctx);
    const limite = performance.now() + 10_000;
    while (J.estado === 'jugando' && performance.now() < limite) await P.esperarReal(20);
    return { antes, enPasillo, estado: J.estado };
  }, PREFIJO);

  expect(r.antes.volumen, 'el volumen del jugador sobrevivió a la actualización').toBe(0.37);
  expect(r.antes.subtitulosEfectos).toBe(false);
  expect(r.antes.ajustesGuardados, 'los ajustes quedaron guardados en el formato nuevo').toMatchObject({ version: 1, valores: { volumenMaestro: 0.37 } });
  expect(r.antes.habitacion).toBe('sala401');
  expect(r.enPasillo).toBe('pasillo');
  expect(r.estado).toBe('muerte');

  // Recargo la página: como cerrar el navegador y volver otro día.
  await page.reload();
  await abrirMenu();
  const guardado = await page.evaluate((prefijo) => ({
    perfil: JSON.parse(localStorage.getItem(prefijo + 'perfil') ?? 'null'),
    partida: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null'),
    volumen: window.__juego!.ctx.ajustes.valores.volumenMaestro,
  }), PREFIJO);
  expect(guardado.perfil).toMatchObject({ version: 2, muertesTotales: 1 });
  expect(guardado.partida, 'la partida v1 quedó migrada a la actual, del Piso 4').toMatchObject({ version: 4, piso: 'piso4', dificultad: 'normal', puntoControl: 'sala401' });
  expect(typeof guardado.partida.estadisticas.cambiosMundo, 'con el contador nuevo').toBe('number');
  expect(guardado.volumen).toBe(0.37);
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
  expect(errores, 'errores de consola').toEqual([]);
});
