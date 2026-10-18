// El pulido del Piso 1 (P1-guion, tanda 4), caminando: llego en la cabina y recorro la planta baja como una persona.
// En el vestíbulo miro los buzones (una línea) y la frase junto a la puerta principal; en la portería, las rayas que
// don Aurelio contó junto al citófono y el televisor (otra línea); en su cuarto, el charco arrastrado hacia el muro.
// Cada rastro lo mido con el medidor (medidorRastros.ts): visto, se ve con la linterna, y se ve menos sin ella.
// Ella y el director quedan quietos: aquí se prueba lo que se ve.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { calmar, instalarAyudas, llegarAlPiso1 } from './ayudasPiso2';
import { comprobarMedidas, instalarMedidor, type MedidaRastro } from './medidorRastros';

test.describe.serial('Lo que quedó en la planta baja', () => {
  test.setTimeout(360_000);
  let page: Page;
  const errores: string[] = [];
  const medidas: MedidaRastro[] = [];
  const lineas: string[] = [];

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
    await instalarMedidor(page);
    expect((await llegarAlPiso1(page)).piso).toBe('piso1');
    await calmar(page);
    await page.evaluate(() => {
      const { ctx } = window.__juego!;
      const lineas: string[] = [];
      ctx.bus.on('tarjeta', (t) => {
        if (t.estilo === 'nota') lineas.push(t.titulo);
      });
      (window as unknown as { __lineas: string[] }).__lineas = lineas;
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('en el vestíbulo: los buzones y la frase junto a la puerta principal', async ({}, info) => {
    await calmar(page);
    const r = await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      const P = window.__piloto!;
      const M = window.__medidor!;
      const defs = ctx.piso.rastros ?? [];
      const enEscena = defs.filter((d) => ctx.escena.getObjectByName(`rastro:${d.id}`)).map((d) => d.id);
      const sinVerAlLlegar = [...ctx.nivel.vigiaRastros.sinVer];
      await P.caminar([[5.5, 10.5], [6.6, 10.5], [10.9, 10.5], [10.9, 6.6]], 0.18);
      const texto = await window.__usar!('exBuzones');
      await P.esperarJuego(0.5);
      await P.caminar([[12.5, 9], [13.9, 12.9]], 0.18);
      const frase = await M.medir('frase_puerta');
      return { ids: defs.map((d) => d.id), enEscena, sinVerAlLlegar, texto, frase };
    });
    await page.screenshot({ path: info.outputPath('1-que-nadie-salga.png') });
    medidas.push(r.frase);
    expect(r.ids, 'el Piso 1 declara sus tres rastros').toEqual(['conteo_citofono', 'frase_puerta', 'charco_101']);
    expect(r.enEscena, 'todos están en la escena').toEqual(r.ids);
    expect(r.sinVerAlLlegar, 'al llegar no se ha visto ninguno').toEqual(r.ids);
    expect(r.texto).toBe('Mirar los buzones');
  });

  test('en la portería: las rayas junto al citófono y el televisor', async ({}, info) => {
    await calmar(page);
    const r = await page.evaluate(async () => {
      const P = window.__piloto!;
      const M = window.__medidor!;
      await P.caminar([[16, 11.5], [22.4, 10.5]], 0.18);
      await window.__abrirPuerta!('pPorteria');
      await P.caminar([[24.5, 10.5], [27.6, 11.9]], 0.18);
      const conteo = await M.medir('conteo_citofono');
      const texto = await window.__usar!('exTelevisor');
      await P.esperarJuego(0.5);
      return { conteo, texto };
    });
    await page.screenshot({ path: info.outputPath('2-las-llamadas.png') });
    medidas.push(r.conteo);
    expect(r.texto).toBe('Mirar el televisor');
  });

  test('en el cuarto de don Aurelio: el charco arrastrado hacia el muro; y todo quedó visto', async ({}, info) => {
    await calmar(page);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const M = window.__medidor!;
      await P.caminar([[26.5, 10.6], [26.5, 9.2], [26.5, 8.5]], 0.15);
      await window.__abrirPuerta!('pCuarto101');
      await P.caminar([[26.5, 7.5], [26.5, 6.2], [26.9, 4.4]], 0.15);
      const charco = await M.medir('charco_101');
      return {
        charco,
        sinVerAlFinal: [...ctx.nivel.vigiaRastros.sinVer],
        examinados: ['examinado:exBuzones', 'examinado:exTelevisor'].map((b) => ctx.progreso.tiene(b)),
        lineas: [...(window as unknown as { __lineas: string[] }).__lineas],
        estado: J.estado,
      };
    });
    await page.screenshot({ path: info.outputPath('3-el-charco.png') });
    medidas.push(r.charco);
    lineas.push(...r.lineas);
    console.log(JSON.stringify(medidas));
    expect(medidas.map((m) => m.id).sort(), 'los medí todos').toEqual(['charco_101', 'conteo_citofono', 'frase_puerta']);
    comprobarMedidas(medidas);
    expect(r.sinVerAlFinal, 'al final del recorrido los vi todos').toEqual([]);
    expect(r.examinados, 'los dos examinados quedan anotados').toEqual([true, true]);
    expect(lineas).toEqual([
      'Cartas que nadie recogió desde marzo. La casilla del 402 ya no cierra de tantas.',
      'Un televisor pequeño, apagado. El volumen quedó en el máximo.',
    ]);
    expect(r.estado).toBe('jugando');
  });
});
