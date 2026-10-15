// La cabina que se detiene entre el 2 y el 1 (P2-guion, tanda 3), en el juego real, cada camino en su partida:
// 1) me adelanto a aguantar el aire en cuanto cae encima: ella sigue arrastrándose y no escucha hasta que lo suelto y
//    lo recupero (la justicia del aire); cuando se queda quieta, aguanto, se va trepando, el piso queda completado y la
//    cabina sigue al Piso 1;
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
    ctx.bus.on('tarjeta', (t) => anotar(t.titulo));
    ctx.bus.on('paso-jugador', () => anotar('paso'));
    window.__cabina = lista;
  });
  expect(await bajarAlUnoConLaLlave(page)).toBe('Bajar al Piso 1');
}

test('me adelanto a aguantar: no escucha hasta que recupero el aire; quieto y sin aire, se va y la cabina sigue', async ({ page }, info) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  await prepararse(page, errores);
  // Frena pasada la mitad del viaje; cae encima: me adelanto a aguantar el aire y miro la trampilla del techo.
  const a = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    const lista = window.__cabina!;
    const limite = performance.now() + 20_000;
    while (ctx.nivel.ascensor!.fase !== 'detenido' && performance.now() < limite) await P.esperarReal(20);
    const fase = ctx.nivel.ascensor!.fase;
    const finCaida = performance.now() + 5_000;
    while (!lista.some((x) => x.que === 'algo cae sobre el techo de la cabina') && performance.now() < finCaida) await P.esperarReal(20);
    P.sostener('KeyQ');
    (window as unknown as { __inicioAguante: number }).__inicioAguante = ctx.programador.ahora;
    ctx.jugador.pitch = 1.45;
    let temblor = 0;
    const finMirar = performance.now() + 700;
    while (performance.now() < finMirar) {
      temblor = Math.max(temblor, ctx.nivel.ascensor!.estadoTrampilla.temblor);
      await P.esperarReal(16);
    }
    return { fase, cayo: lista.some((x) => x.que === 'algo cae sobre el techo de la cabina'), temblor };
  });
  await page.screenshot({ path: info.outputPath('la-trampilla-tiembla.png') });
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
    // Sigo aguantando hasta completar 3 s (antes de que se quede a escuchar).
    const inicioAguante = (window as unknown as { __inicioAguante: number }).__inicioAguante;
    while (ctx.programador.ahora < inicioAguante + 3) await P.esperarReal(20);
    const escuchoMientrasAguantaba = hay('encuentro:inicio');
    P.soltar('KeyQ');
    ctx.jugador.pitch = 0;
    // Suelto: recupero el aire y entonces se queda quieta a escuchar. Ahí aguanto hasta que se va.
    const empezo = await esperar('encuentro:inicio', 15_000);
    const aireAlEmpezar = ctx.jugador.respiracion.aire;
    P.sostener('KeyQ');
    const supero = await esperar('encuentro:superado', 15_000);
    P.soltar('KeyQ');
    const fallo = hay('encuentro:fallido');
    // Se va trepando y la cabina sigue: llega abajo y termina el piso.
    const finViaje = performance.now() + 30_000;
    while (!(J.estado === 'jugando' && J.ctx.piso.id === 'piso1') && performance.now() < finViaje) await P.esperarReal(50);
    return {
      escuchoMientrasAguantaba,
      empezo,
      aireAlEmpezar,
      supero,
      fallo,
      seFue: hay('[Se va trepando por el pozo, hacia arriba]'),
      estado: J.estado,
      piso: J.ctx.piso.id,
      superado: hay('Piso 2 superado'),
    };
  });
  await page.screenshot({ path: info.outputPath('fin.png') });
  expect(a.fase, 'la cabina frenó entre pisos').toBe('detenido');
  expect(a.cayo, 'algo cayó sobre el techo').toBe(true);
  expect(a.temblor, 'la trampilla del techo tiembla con ella encima').toBeGreaterThan(0.3);
  expect(r.escuchoMientrasAguantaba, 'mientras me adelantaba a aguantar, no se puso a escuchar').toBe(false);
  expect(r.empezo, 'cuando recuperé el aire, se quedó a escuchar').toBe(true);
  expect(r.aireAlEmpezar, 'con el aire casi lleno').toBeGreaterThanOrEqual(0.95);
  expect(r.supero, 'quieto y sin aire, lo superé').toBe(true);
  expect(r.fallo).toBe(false);
  expect(r.seFue).toBe(true);
  expect(r.superado, 'el Piso 2 quedó completado (su tarjeta, sobre el negro)').toBe(true);
  expect(r.piso, 'la cabina siguió hasta el Piso 1').toBe('piso1');
  expect(r.estado).toBe('jugando');
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
    // Aguanto el aire (mi respiración no me delata), pero pasada la gracia camino nervioso en la cabina, de un lado al
    // otro. Un paso suena al completar la zancada (0.72 m) y contra la pared de la cabina no siempre se completa: yendo
    // y viniendo, sí, antes de que termine el encuentro más corto.
    P.sostener('KeyQ');
    const t0 = ctx.programador.ahora;
    while (ctx.programador.ahora < t0 + ctx.dificultad.graciaEncuentro + 0.1) await P.esperarReal(20);
    let tecla = 'KeyW';
    let vuelta = ctx.programador.ahora;
    P.sostener(tecla);
    const finPaso = performance.now() + 6_000;
    while (!hay('encuentro:fallido') && performance.now() < finPaso) {
      if (ctx.programador.ahora - vuelta > 0.4) {
        P.soltar(tecla);
        tecla = tecla === 'KeyW' ? 'KeyS' : 'KeyW';
        P.sostener(tecla);
        vuelta = ctx.programador.ahora;
      }
      await P.esperarReal(10);
    }
    P.soltar(tecla);
    P.soltar('KeyQ');
    // El aviso se mide desde el instante en que me oyó (el evento), no desde que esta espera lo nota: con el PC cargado,
    // eso llega uno o dos fotogramas tarde y el aviso parecería más corto de lo que fue.
    const tFallo = lista.find((x) => x.que === 'encuentro:fallido')?.t ?? ctx.programador.ahora;
    await P.esperarReal(50);
    const E = ctx.entidad;
    await P.esperarReal(250);
    const alCaer = { fisica: E.fisica, avisando: E.avisando, estado: E.estado, trampilla: ctx.nivel.ascensor!.estadoTrampilla.apertura };
    const finMuerte = performance.now() + 15_000;
    while (J.estado === 'jugando' && performance.now() < finMuerte) await P.esperarReal(10);
    const avisoDuro = ctx.programador.ahora - tFallo;
    while (J.estado !== 'muerte' && performance.now() < finMuerte) await P.esperarReal(20);
    return {
      pasos: lista.filter((x) => x.que === 'paso' && x.t >= t0).length,
      alCaer,
      trampilla: hay('[La trampilla del techo revienta]'),
      avisoDuro,
      estado: J.estado,
      motivo: E.motivoCaza,
    };
  });
  await page.screenshot({ path: info.outputPath('muerte.png') });
  expect(r.pasos, 'di al menos un paso mientras escuchaba').toBeGreaterThanOrEqual(1);
  expect(r.trampilla, 'revienta la trampilla').toBe(true);
  expect(r.alCaer.trampilla, 'y se ve: la tapa cuelga abierta').toBe(1);
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
