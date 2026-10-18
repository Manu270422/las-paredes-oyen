// El encierro del 402 (lo encontró un probador el 2026-10-17), en el juego real y caminando. En el orden de los
// objetivos del Piso 4 el tablero va antes que la llave del 402: restablezco la luz, vuelvo al pasillo y llega el
// apagón, que guarda la partida adentro del 402. Si ella me mata entonces, sin la llave, antes reaparecía encerrado
// (la puerta con llave y la llave en el 401). Ahora reaparezco en el cuarto del tablero y salgo al pasillo.
// Con la llave en el bolsillo, ese mismo guardado me deja adentro del 402, como pide el clímax, y la puerta se abre.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, morir, PREFIJO } from './acciones';
import { retomar } from './ayudasFinal';
import { instalarAyudas } from './ayudasPiso2';

test.describe.serial('El 402 no encierra a nadie', () => {
  test.setTimeout(300_000);
  let page: Page;
  const errores: string[] = [];

  test.beforeAll(async ({ browser }, info) => {
    const contexto = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1280, height: 720 } });
    page = await contexto.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });
    page.on('pageerror', (e) => errores.push(String(e)));
    await abrirEleccion(page);
    await elegirYEmpezar(page, 'Normal');
    await esperarJugando(page);
    await instalarAyudas(page);
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('sin la llave: el apagón guarda adentro del 402, pero al morir reaparezco en el cuarto del tablero', async ({}, info) => {
    const r = await page.evaluate(async (prefijo) => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      // Lo de antes del tablero, en silencio (lo prueban sus propios recorridos): la orden, el 401 y el 403 medidos y
      // el primer encuentro del pasillo ya pasado.
      for (const b of ['leyo:orden_trabajo', 'medido:401', 'encuentro_pasillo', 'medido:403']) ctx.progreso.marcarSilencioso(b);
      ctx.director.bloquear(999);
      if (!ctx.linterna.encendida) await P.pulsar('KeyF');
      // Al fondo del pasillo (esquivando las dos bolsas), el cuarto de servicio y su tablero.
      await P.caminar([[3.6, 10.5], [12, 10.5], [16.5, 10.3], [18.2, 10.3], [20.5, 10.5], [26.2, 10.75], [27.5, 10.5]]);
      await window.__abrirPuerta!('pServicio');
      await P.caminar([[29.5, 10.5]]);
      const texto = await window.__usar!('tablero');
      let fin = performance.now() + 5000;
      while (!ctx.progreso.tiene('tablero_activado') && performance.now() < fin) await P.esperarReal(30);
      // Vuelvo al pasillo: a los pocos segundos, el apagón.
      await P.caminar([[27.5, 10.5], [26.2, 10.75], [23, 10.5]]);
      fin = performance.now() + 30_000;
      while (!ctx.progreso.tiene('apagon_pasillo') && performance.now() < fin) await P.esperarReal(50);
      await P.esperarJuego(0.5);
      return {
        texto,
        tablero: ctx.progreso.tiene('tablero_activado'),
        apagon: ctx.progreso.tiene('apagon_pasillo'),
        guardado: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null')?.puntoControl ?? null,
        llave: ctx.progreso.tieneObjeto('llave_402'),
      };
    }, PREFIJO);
    expect(r.texto).toBe('Subir el interruptor general');
    expect(r.tablero).toBe(true);
    expect(r.apagon, 'llegó el apagón').toBe(true);
    expect(r.guardado, 'el apagón guardó adentro del 402').toBe('sala402');
    expect(r.llave, 'y yo todavía no tengo su llave').toBe(false);

    // Ella me mata en el pasillo.
    await morir(page, [[22, 10.5]]);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.waitForFunction(() => window.__juego?.estado === 'jugando');
    const cuarto = await page.evaluate(() => {
      const { ctx } = window.__juego!;
      return ctx.nivel.habitacionEn(ctx.jugador.posicion.x, ctx.jugador.posicion.z)?.id ?? null;
    });
    expect(cuarto, 'reaparezco en el cuarto del tablero, no encerrado en el 402').toBe('servicio');
    // Y salgo de ahí al pasillo, caminando (la puerta del servicio vuelve cerrada: la abro desde adentro).
    const afuera = await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      const P = window.__piloto!;
      ctx.director.bloquear(999);
      await P.caminar([[29.5, 10.5]]);
      await window.__abrirPuerta!('pServicio');
      await P.caminar([[27.5, 10.5], [26.2, 10.75], [24, 10.5]]);
      return ctx.nivel.habitacionEn(ctx.jugador.posicion.x, ctx.jugador.posicion.z)?.id ?? null;
    });
    await page.screenshot({ path: info.outputPath('1-afuera-del-tablero.png') });
    expect(afuera, 'y salgo al pasillo').toBe('pasillo');
  });

  test('con la llave: el mismo guardado me deja adentro del 402 (el clímax), y la puerta se abre con ella', async ({}, info) => {
    // Una partida guardada en el 402 con la llave en el bolsillo (quien tomó la llave antes de restablecer la luz).
    const guardado = await page.evaluate((p) => localStorage.getItem(p + 'partida'), PREFIJO);
    const datos = JSON.parse(guardado!);
    expect(datos.puntoControl).toBe('sala402');
    datos.progreso.inventario.push('llave_402');
    datos.progreso.banderas.push('objeto:llave_402');
    await retomar(page, JSON.stringify(datos), 'normal', 7919);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const cuarto = ctx.nivel.habitacionEn(ctx.jugador.posicion.x, ctx.jugador.posicion.z)?.id ?? null;
      const puerta = ctx.nivel.puertas.find((p) => p.id === 'p402')!;
      const h = puerta.puntoInteraccion();
      P.mirarA(h.x, h.y, h.z);
      await P.esperarJuego(0.4);
      return { cuarto, texto: J.interaccion.enfocado?.id === 'p402' ? J.interaccion.enfocado.texto(ctx) : null };
    });
    await page.screenshot({ path: info.outputPath('2-adentro-del-402-con-la-llave.png') });
    expect(r.cuarto).toBe('sala402');
    expect(r.texto, 'la puerta del 402 se abre con la llave que tengo').toBe('Abrir con la llave');
  });
});
