// Accesibilidad que no depende de la dificultad (paso 5 de la Tarea 4), en el juego real:
// 1) "Sin sustos fuertes": al morir no queda su cara a la vista ni hay grito fuerte ni destello; la muerte se
//    explica igual. Sin la opción, el susto es el de siempre.
// 2) "Ayuda visual del aire": con poco aire el borde de la pantalla late y un subtítulo avisa antes del jadeo.
//    Apagada (por defecto en Normal), nada. Historia la trae sin tocar Ajustes.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, morir } from './acciones';

/** Pausa → Ajustes → Accesibilidad → enciendo esa opción → de vuelta al juego. */
async function encender(page: Page, opcion: string): Promise<void> {
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  await page.locator('.pausa').getByRole('button', { name: 'Ajustes', exact: true }).click();
  const ajustes = page.getByRole('dialog', { name: 'Ajustes' });
  await ajustes.getByRole('tab', { name: 'Accesibilidad' }).click();
  const interruptor = ajustes.getByRole('switch', { name: opcion });
  await interruptor.click();
  await expect(interruptor).toHaveAttribute('aria-checked', 'true');
  await ajustes.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.locator('.pausa').getByRole('button', { name: 'Continuar', exact: true }).click();
  await esperarJugando(page);
}

/** Mido el destello del susto cuadro a cuadro (se desvanece en fracciones de segundo): me quedo con el máximo. */
const medirDestello = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __destello: number };
    w.__destello = 0;
    const efectos = window.__juego!.ctx.renderizador.efectos;
    const medir = () => {
      w.__destello = Math.max(w.__destello, efectos.susto);
      requestAnimationFrame(medir);
    };
    requestAnimationFrame(medir);
  });

/** El susto, justo al morir: ¿se ve su cara, cuál fue el destello más fuerte? */
const alMorir = (page: Page) =>
  page.evaluate(() => {
    const { ctx } = window.__juego!;
    return { caraVisible: ctx.entidad.modelo.raiz.visible, destello: (window as unknown as { __destello: number }).__destello };
  });

test('sin sustos fuertes: al morir no queda su cara ni el destello, y la muerte se explica igual', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);

  // Sin la opción: el susto de siempre.
  await medirDestello(page);
  await morir(page);
  expect(await alMorir(page), 'sin la opción: su cara y el destello').toMatchObject({ caraVisible: true });
  expect((await alMorir(page)).destello).toBeGreaterThan(0.5);
  await page.locator('.muerte').getByRole('button', { name: 'Reintentar' }).click();
  await esperarJugando(page);

  // Con la opción: ni su cara ni el destello; la explicación de la muerte sigue ahí.
  await encender(page, 'Sin sustos fuertes');
  await medirDestello(page);
  await morir(page);
  expect(await alMorir(page), 'con la opción: sin cara y sin destello').toEqual({ caraVisible: false, destello: 0 });
  await expect(page.locator('.muerte__linea')).not.toBeEmpty();
  expect(errores, 'errores de consola').toEqual([]);
});

/** Contengo el aire hasta que quede menos de 0.15 y digo si el borde avisó; suelto antes del jadeo. */
const aguantarHastaPocoAire = (page: Page) =>
  page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const avisos: string[] = [];
    const jadeos: string[] = [];
    const quitarSub = J.ctx.bus.on('subtitulo', (s) => avisos.push(s.texto));
    const quitarRuido = J.ctx.bus.on('ruido', (r) => {
      if (r.causa === 'jadeo') jadeos.push(r.causa);
    });
    P.sostener('KeyQ');
    const limite = performance.now() + 20_000;
    while (J.ctx.jugador.respiracion.aire > 0.15 && performance.now() < limite) await P.esperarReal(30);
    await P.esperarJuego(0.1);
    const borde = document.querySelector('.aviso-aire')!.classList.contains('aviso-aire--activo');
    P.soltar('KeyQ');
    await P.esperarJuego(4);
    quitarSub();
    quitarRuido();
    return { borde, aviso: avisos.some((t) => t.startsWith('[Te queda poco aire')), jadeos: jadeos.length };
  });

test('ayuda visual del aire: apagada no avisa; encendida, el borde late y un subtítulo avisa antes del jadeo', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);

  expect(await aguantarHastaPocoAire(page), 'en Normal viene apagada').toEqual({ borde: false, aviso: false, jadeos: 0 });
  await encender(page, 'Ayuda visual del aire');
  expect(await aguantarHastaPocoAire(page), 'encendida: borde, aviso y sin jadeo').toEqual({ borde: true, aviso: true, jadeos: 0 });
  expect(errores, 'errores de consola').toEqual([]);
});

test('Historia trae la ayuda visual del aire sin tocar Ajustes', async ({ page }) => {
  test.setTimeout(240_000);
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  expect(await aguantarHastaPocoAire(page)).toEqual({ borde: true, aviso: true, jadeos: 0 });
});
