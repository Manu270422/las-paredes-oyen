// La pantalla para elegir cómo jugar (paso 3 de la Tarea 4), en el juego real:
// 1) cuatro líneas claras, Pesadilla bloqueada dice por qué, Normal viene marcada; en Difícil no hay pistas ni
//    indicador del aire; bajarla a Normal en plena partida los devuelve al instante, sin diálogo, y el final
//    dice "Difícil → Normal" (el perfil cuenta Normal);
// 2) Pesadilla (desbloqueada) sin partida guardada: bajar en plena partida NO pregunta, y hasta el primer
//    punto de control morir sigue siendo empezar de cero;
// 3) Pesadilla con una partida guardada: el aviso dice exactamente cuál se reemplaza, cancelar no cambia nada
//    y al aceptar la otra partida sigue intacta hasta el próximo punto de control.
import { expect, test, type Page } from '@playwright/test';
import { abrirAjustesEnPausa, abrirEleccion, elegirYEmpezar, esperarJugando, leerLaOrden, morir, partidaGuardada, PREFIJO, volverAlJuego } from './acciones';

interface JuegoInterno {
  dificultadPartida: { actual: string };
  accionesGuion: { terminarPartida(): void };
}

const actual = (page: Page) => page.evaluate(() => (window.__juego as unknown as JuegoInterno).dificultadPartida.actual);

/** Contengo el aire 1.5 s y digo si el indicador del aire se vio. */
const indicadorDelAire = (page: Page) =>
  page.evaluate(async () => {
    const P = window.__piloto!;
    P.sostener('KeyQ');
    await P.esperarJuego(1.5);
    const visible = document.querySelector('.estado-jugador .indicador')?.classList.contains('indicador--visible') ?? false;
    P.soltar('KeyQ');
    await P.esperarJuego(0.5);
    return visible;
  });

/** Un perfil que ya terminó el Piso 4 (en Normal): desbloquea Pesadilla. */
async function perfilQueTermino(page: Page): Promise<void> {
  await page.evaluate((p) => {
    const perfil = { version: 2, creado: 1, partidasIniciadas: 1, finales: 1, mejorTiempo: 900, menosMuertes: 1, muertesTotales: 1, encuentrosSuperados: 0, pisosCompletados: { piso4: 'normal' } };
    localStorage.setItem(p + 'perfil', JSON.stringify(perfil));
  }, PREFIJO);
}

test('elegir: líneas claras y Pesadilla bloqueada; Difícil sin pistas ni aire; bajar a Normal en plena partida los devuelve y el final lo dice', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  const pantalla = page.locator('.dificultad');

  // 1. Lo que se ve al elegir.
  await expect(pantalla.getByRole('heading', { name: '¿Cómo quieres jugar?' })).toBeVisible();
  await expect(pantalla).toContainText('bajarla no te quita nada de lo que llevas en la partida');
  await expect(pantalla.getByRole('radio', { name: /^Normal/ })).toHaveAttribute('aria-checked', 'true');
  await expect(pantalla.getByRole('radio', { name: /^Difícil/ })).toContainText('Sin pistas ni indicador del aire');
  const pesadilla = pantalla.getByRole('radio', { name: /^Pesadilla/ });
  await expect(pesadilla).toBeDisabled();
  await expect(pesadilla).toContainText('se desbloquea al terminar el Piso 4, en cualquier dificultad');
  await expect(pantalla).toContainText('La accesibilidad no depende de la dificultad: sin sustos fuertes, ayuda visual del aire');

  // "Volver" regresa al menú sin empezar nada.
  await pantalla.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.locator('.menu').getByRole('button', { name: 'Nueva partida', exact: true })).toBeVisible();
  await page.locator('.menu').getByRole('button', { name: 'Nueva partida', exact: true }).click();

  // 2. Difícil: sin pistas (la del comienzo se dispara, pero no se muestra) y sin indicador del aire.
  await elegirYEmpezar(page, 'Difícil');
  await esperarJugando(page);
  expect(await actual(page)).toBe('dificil');
  await page.evaluate(() => {
    const w = window as unknown as { __pistas: string[]; __subs: string[] };
    w.__pistas = [];
    w.__subs = [];
    window.__juego!.ctx.bus.on('pista', (p) => w.__pistas.push(p.id));
    window.__juego!.ctx.bus.on('subtitulo', (s) => w.__subs.push(s.texto));
  });
  await page.evaluate(() => window.__piloto!.esperarJuego(7.5));
  expect(await page.evaluate(() => (window as unknown as { __pistas: string[] }).__pistas), 'la pista del comienzo se dispara…').toContain('linterna');
  expect((await page.locator('.pista').textContent()) ?? '', '…pero en Difícil no se muestra').not.toContain('linterna');
  expect(await indicadorDelAire(page), 'en Difícil, sin indicador del aire').toBe(false);

  // 3. Bajo a Normal en plena partida: sin diálogo, al instante, con su subtítulo.
  await abrirAjustesEnPausa(page);
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toContainText('Puedes bajarla cuando quieras');
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('radio', { name: 'Normal', exact: true }).click();
  await expect(page.getByRole('alertdialog'), 'bajar no pide confirmación').toHaveCount(0);
  expect(await actual(page)).toBe('normal');
  await volverAlJuego(page);
  expect(await page.evaluate(() => (window as unknown as { __subs: string[] }).__subs)).toContain('Ahora juegas en Normal.');
  expect(await indicadorDelAire(page), 'en Normal vuelve el indicador del aire').toBe(true);

  // 4. El final dice la verdad, sin castigo: empezó en Difícil y se jugó en Normal; el perfil cuenta Normal.
  await page.evaluate(() => (window.__juego as unknown as JuegoInterno).accionesGuion.terminarPartida());
  await expect(page.locator('.fin__estadisticas')).toContainText('Difícil → Normal');
  const perfil = await page.evaluate((p) => JSON.parse(localStorage.getItem(p + 'perfil') ?? 'null'), PREFIJO);
  expect(perfil.pisosCompletados).toEqual({ piso4: 'normal' });
  expect(errores, 'errores de consola').toEqual([]);
});

test('Pesadilla sin partida guardada: bajar en plena partida no pregunta, y hasta el primer punto de control morir es empezar de cero', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await perfilQueTermino(page);
  await abrirEleccion(page);
  const pesadilla = page.locator('.dificultad').getByRole('radio', { name: /^Pesadilla/ });
  await expect(pesadilla, 'terminar el piso la desbloquea').toBeEnabled();
  await expect(pesadilla).toContainText('si mueres o sales, empiezas de cero');

  // Al empezar avisa que no guarda (sin partida guardada, no habla de ella).
  await elegirYEmpezar(page, 'Pesadilla');
  const aviso = page.getByRole('alertdialog');
  await expect(aviso).toContainText('Pesadilla no guarda: si mueres o sales, empiezas de cero.');
  await expect(aviso).not.toContainText('partida guardada');
  await aviso.getByRole('button', { name: 'Empezar en Pesadilla' }).click();
  await esperarJugando(page);

  // Bajo a Normal: no hay partida guardada que reemplazar, así que no hay diálogo.
  await abrirAjustesEnPausa(page);
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('radio', { name: 'Normal', exact: true }).click();
  await expect(page.getByRole('alertdialog'), 'sin partida guardada, bajar no pregunta').toHaveCount(0);
  expect(await actual(page)).toBe('normal');
  await volverAlJuego(page);

  // Muero antes de cualquier punto de control: sigue siendo empezar de cero (no hay nada guardado).
  await morir(page);
  await page.locator('.muerte').getByRole('button', { name: 'Empezar de nuevo' }).click();
  await esperarJugando(page);
  expect(await actual(page), 'empiezo de cero en Normal').toBe('normal');
  expect(await page.evaluate(() => window.__juego!.ctx.progreso.exportar().banderas)).toEqual([]);
  expect(await partidaGuardada(page)).toBeNull();

  // El primer punto de control ya guarda, en Normal.
  await leerLaOrden(page);
  expect(JSON.parse((await partidaGuardada(page)) ?? 'null')).toMatchObject({ dificultad: 'normal', puntoControl: 'escalera' });
  expect(errores, 'errores de consola').toEqual([]);
});

test('Pesadilla con partida guardada: el aviso dice cuál se reemplaza y cuándo; hasta el punto de control sigue intacta', async ({ page }) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await perfilQueTermino(page);

  // Una partida de Normal guardada.
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  await leerLaOrden(page);
  const normal = await partidaGuardada(page);
  expect(JSON.parse(normal ?? 'null')).toMatchObject({ dificultad: 'normal' });
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  await page.locator('.pausa').getByRole('button', { name: 'Salir al menú principal' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Salir al menú', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'menu');

  // Pesadilla: el aviso dice que la partida guardada no se toca.
  await page.locator('.menu').getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await elegirYEmpezar(page, 'Pesadilla');
  await expect(page.getByRole('alertdialog')).toContainText('Tu partida guardada no se toca.');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Empezar en Pesadilla' }).click();
  await esperarJugando(page);

  // Bajar a Normal: el aviso dice exactamente qué se reemplaza y cuándo. Cancelar no cambia nada.
  await abrirAjustesEnPausa(page);
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('radio', { name: 'Normal', exact: true }).click();
  const aviso = page.getByRole('alertdialog');
  await expect(aviso).toContainText('Tu partida guardada (Normal) se reemplazará en el próximo punto de control.');
  await expect(aviso).toContainText('Hasta ese primer guardado, si mueres, empiezas de cero.');
  await aviso.getByRole('button', { name: 'Cancelar' }).click();
  expect(await actual(page), 'cancelar no cambia la dificultad').toBe('pesadilla');
  await expect(page.getByRole('dialog', { name: 'Ajustes' }).getByRole('radio', { name: 'Pesadilla', exact: true })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('radio', { name: 'Normal', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cambiar a Normal' }).click();
  expect(await actual(page)).toBe('normal');
  expect(await partidaGuardada(page), 'hasta el punto de control, la otra partida sigue intacta').toBe(normal);
  await volverAlJuego(page);

  // El primer punto de control la reemplaza: esta partida empezó en Pesadilla y se jugó en Normal.
  await leerLaOrden(page);
  expect(JSON.parse((await partidaGuardada(page)) ?? 'null')).toMatchObject({ dificultad: 'normal', dificultadInicial: 'pesadilla', dificultadMasBaja: 'normal' });
  expect(errores, 'errores de consola').toEqual([]);
});
