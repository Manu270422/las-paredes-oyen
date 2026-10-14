// La cabina que se detiene entre el 2 y el 1 (P2-guion, tanda 3), en el juego real, cada camino en su partida:
// 1) me adelanto a aguantar el aire en cuanto cae encima: ella sigue arrastrándose y no escucha hasta que lo suelto y
//    lo recupero (la justicia del aire); cuando se queda quieta, aguanto, se va trepando, la cabina sigue y termina el
//    piso;
// 2) aguanto el aire pero doy un paso mientras escucha: revienta la trampilla y cae adentro; su aviso dura lo que en cualquier caza (mientras
//    avisa no atrapa, aunque esté encima), muero por lo que hice y reaparezco en el 202 con la llave en el bolsillo.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { bajarAlPiso2, bajarAlUnoConLaLlave, calmar, instalarAyudas } from './ayudasPiso2';

declare global {
  interface Window {
    /** Lo que pasó en la cabina, con el tiempo de juego de cada cosa. */
    __cabina?: Array<{ que: string; t: number }>;
  }
}

/** Partida nueva en Normal, abajo hasta el Piso 2, y anoto lo que pasa en la cabina. */
async function prepararse(page: Page, errores: string[]): Promise<void> {
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  await instalarAyudas(page);
  expect(await bajarAlPiso2(page)).toBe('piso2');
  await calmar(page);
  await page.evaluate(() => {
    const { ctx } = window.__juego!;
    const lista: Array<{ que: string; t: number }> = [];
    const anotar = (que: string) => lista.push({ que, t: window.__juego!.ctx.programador.ahora });
    ctx.bus.on('encuentro', (e) => anotar(`encuentro:${e.estado}`));
    ctx.bus.on('sonido-relevante', (s) => anotar(s.descripcion));
    ctx.bus.on('subtitulo', (s) => anotar(s.texto));
    window.__cabina = lista;
  });
  expect(await bajarAlUnoConLaLlave(page)).toBe('Bajar al Piso 1');
}

test('me adelanto a aguantar: no escucha hasta que recupero el aire; quieto y sin aire, se va y la cabina sigue', async ({ page }, info) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  await prepararse(page, errores);
  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    const lista = window.__cabina!;
    const hay = (que: string) => lista.some((x) => x.que === que);
    const esperar = async (que: string, ms: number) => {
      const fin = performance.now() + ms;
      while (!hay(que) && performance.now() < fin) await P.esperarReal(20);
      return hay(que);
    };
    // Frena pasada la mitad del viaje.
    const limite = performance.now() + 20_000;
    while (ctx.nivel.ascensor!.fase !== 'detenido' && performance.now() < limite) await P.esperarReal(20);
    const fase = ctx.nivel.ascensor!.fase;
    // Cae encima: me adelanto y aguanto el aire 3 s (antes de que se quede a escuchar).
    const cayo = await esperar('algo cae sobre el techo de la cabina', 5_000);
    P.sostener('KeyQ');
    const inicioAguante = ctx.programador.ahora;
    while (ctx.programador.ahora < inicioAguante + 3) await P.esperarReal(20);
    const escuchoMientrasAguantaba = hay('encuentro:inicio');
    P.soltar('KeyQ');
    // Suelto: recupero el aire y entonces se queda quieta a escuchar. Ahí aguanto hasta que se va.
    const empezo = await esperar('encuentro:inicio', 15_000);
    const aireAlEmpezar = ctx.jugador.respiracion.aire;
    P.sostener('KeyQ');
    const supero = await esperar('encuentro:superado', 15_000);
    P.soltar('KeyQ');
    const fallo = hay('encuentro:fallido');
    // Se va trepando y la cabina sigue: llega abajo y termina el piso.
    const finPartida = performance.now() + 30_000;
    while (J.estado !== 'fin' && performance.now() < finPartida) await P.esperarReal(50);
    return {
      fase,
      cayo,
      escuchoMientrasAguantaba,
      empezo,
      aireAlEmpezar,
      supero,
      fallo,
      seFue: hay('[Se va trepando por el pozo, hacia arriba]'),
      estado: J.estado,
      titulo: document.querySelector('.fin__titulo')?.textContent ?? null,
    };
  });
  await page.screenshot({ path: info.outputPath('fin.png') });
  expect(r.fase, 'la cabina frenó entre pisos').toBe('detenido');
  expect(r.cayo, 'algo cayó sobre el techo').toBe(true);
  expect(r.escuchoMientrasAguantaba, 'mientras me adelantaba a aguantar, no se puso a escuchar').toBe(false);
  expect(r.empezo, 'cuando recuperé el aire, se quedó a escuchar').toBe(true);
  expect(r.aireAlEmpezar, 'con el aire casi lleno').toBeGreaterThanOrEqual(0.95);
  expect(r.supero, 'quieto y sin aire, lo superé').toBe(true);
  expect(r.fallo).toBe(false);
  expect(r.seFue).toBe(true);
  expect(r.estado, 'la cabina siguió y terminó el piso').toBe('fin');
  expect(r.titulo).toBe('Piso 2 completado');
  expect(errores, 'errores de consola').toEqual([]);
});

test('aguanto el aire pero doy un paso mientras escucha: cae adentro con su aviso, muero por caminar y reaparezco en el 202 con la llave', async ({ page }, info) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  await prepararse(page, errores);
  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    const lista = window.__cabina!;
    const hay = (que: string) => lista.some((x) => x.que === que);
    const fin = performance.now() + 25_000;
    while (!hay('encuentro:inicio') && performance.now() < fin) await P.esperarReal(20);
    // Aguanto el aire (mi respiración no me delata), pero pasada la gracia doy un paso en la cabina.
    P.sostener('KeyQ');
    const t0 = ctx.programador.ahora;
    while (ctx.programador.ahora < t0 + 1.5) await P.esperarReal(20);
    P.sostener('KeyW');
    const finPaso = performance.now() + 5_000;
    while (!hay('encuentro:fallido') && performance.now() < finPaso) await P.esperarReal(10);
    P.soltar('KeyW');
    P.soltar('KeyQ');
    const tFallo = ctx.programador.ahora;
    await P.esperarReal(50);
    const E = ctx.entidad;
    const alCaer = { fisica: E.fisica, avisando: E.avisando, estado: E.estado, adentro: ctx.nivel.ascensor!.adentro(ctx) };
    const finMuerte = performance.now() + 15_000;
    while (J.estado === 'jugando' && performance.now() < finMuerte) await P.esperarReal(10);
    const avisoDuro = ctx.programador.ahora - tFallo;
    while (J.estado !== 'muerte' && performance.now() < finMuerte) await P.esperarReal(20);
    return {
      alCaer,
      trampilla: hay('[La trampilla del techo revienta]'),
      avisoDuro,
      estado: J.estado,
      motivo: E.motivoCaza,
    };
  });
  await page.screenshot({ path: info.outputPath('muerte.png') });
  expect(r.trampilla, 'revienta la trampilla').toBe(true);
  expect(r.alCaer.fisica, 'cae adentro, con cuerpo').toBe(true);
  expect(r.alCaer.estado).toBe('cazando');
  expect(r.alCaer.avisando, 'empieza con el aviso').toBe(true);
  expect(r.avisoDuro, 'el aviso dura lo de Normal (0.8 s) antes de atraparme, aunque esté encima').toBeGreaterThanOrEqual(0.75);
  expect(r.estado).toBe('muerte');
  expect(r.motivo, 'me delató caminar').toBe('paso');
  await expect(page.locator('.muerte__linea')).not.toBeEmpty();
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  const despues = await page.evaluate(() => {
    const { ctx } = window.__juego!;
    const p = ctx.jugador.posicion;
    return {
      piso: ctx.piso.id,
      cuarto: ctx.nivel.habitacionEn(p.x, p.z)?.id ?? null,
      llave: ctx.progreso.tieneObjeto('llave_servicio'),
      ascensor: ctx.nivel.ascensor!.fase,
      superada: ctx.progreso.tiene('cabina:superada'),
    };
  });
  expect(despues).toEqual({ piso: 'piso2', cuarto: 'sala202', llave: true, ascensor: 'lejos', superada: false });
  expect(errores, 'errores de consola').toEqual([]);
});
