// La nota de examinar (una línea suelta, sin panel) no se monta sobre lo que ya está en pantalla: ni sobre el
// indicador de interacción, ni sobre la mira, ni sobre tres subtítulos a la vez, y cabe a lo ancho. En PC va
// debajo del indicador; en un teléfono acostado (poca altura) ahí no cabe y va encima de la mira.
import { expect, test } from '@playwright/test';
import { instalarPiloto } from './piloto';

/** La línea más larga del Piso 3 (dos renglones). */
const LINEA = 'Un niño de palitos y, detrás, alguien muy alto sin cara. Abajo dice: «el que mide».';

interface Caja {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const separadas = (a: Caja, b: Caja) => a.bottom <= b.top || b.bottom <= a.top;

for (const { nombre, viewport } of [
  { nombre: 'PC', viewport: { width: 1280, height: 720 } },
  { nombre: 'teléfono acostado', viewport: { width: 740, height: 360 } },
]) {
  test(`la nota de examinar no tapa el indicador, la mira ni los subtítulos (${nombre})`, async ({ browser }, info) => {
    test.setTimeout(180_000);
    const contexto = await browser.newContext({ baseURL: info.project.use.baseURL, viewport });
    const page = await contexto.newPage();
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
    await instalarPiloto(page);

    const r = await page.evaluate(async (linea) => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      // Miro la orden de trabajo para que el indicador esté en pantalla, como al examinar algo de verdad.
      // Espero a que pase la tarjeta de cine del comienzo (sale al segundo y usa el mismo lugar de la pantalla).
      await P.caminar([[2.2, 9.5]]);
      P.mirarA(1.5 * 1.3, 0.56, 8.6 * 1.3);
      await P.esperarJuego(1.5);
      for (const texto of ['[un golpe en la pared ←]', '[tres golpes en la pared ↓]', '[algo se arrastra →]']) {
        ctx.bus.emit('subtitulo', { texto, duracion: 8, tipo: 'efecto' });
      }
      ctx.bus.emit('tarjeta', { titulo: linea, subtitulo: '', estilo: 'nota' });
      await P.esperarReal(900);
      const caja = (selector: string) => {
        const c = document.querySelector(selector)!.getBoundingClientRect();
        return { top: c.top, bottom: c.bottom, left: c.left, right: c.right };
      };
      return {
        enfocado: J.interaccion.enfocado?.id ?? null,
        visible: document.querySelector('.tarjeta')!.classList.contains('tarjeta--visible'),
        nota: caja('.tarjeta--nota h2'),
        indicador: caja('.interaccion'),
        mira: caja('.mira'),
        subtitulos: caja('.subtitulos'),
        ancho: window.innerWidth,
      };
    }, LINEA);
    await page.screenshot({ path: info.outputPath('nota.png') });

    expect(r.enfocado, 'el indicador está en pantalla').toBe('docOrden');
    expect(r.visible).toBe(true);
    expect(separadas(r.nota, r.indicador), `nota ${JSON.stringify(r.nota)} / indicador ${JSON.stringify(r.indicador)}`).toBe(true);
    expect(separadas(r.nota, r.mira), 'la nota no tapa la mira').toBe(true);
    expect(separadas(r.nota, r.subtitulos), `nota ${JSON.stringify(r.nota)} / subtítulos ${JSON.stringify(r.subtitulos)}`).toBe(true);
    expect(r.nota.left).toBeGreaterThanOrEqual(0);
    expect(r.nota.right).toBeLessThanOrEqual(r.ancho);
    expect(errores).toEqual([]);
    await contexto.close();
  });
}
