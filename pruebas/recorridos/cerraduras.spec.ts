// El final del juego (P1-guion, tanda 3) en el juego real, caminando, desde el punto de control frente a la puerta:
// 1) "la puerta la llama": abro la cadena con ella lejos, dentro de los muros y con el director en calma (recién
//    cargado no la deja salir). Viene corriendo por el muro (se oye, con su subtítulo) y sale junto a la puerta.
//    Cuando se queda a escucharme, empiezo el cerrojo: me delata y me caza ("Oyó la cerradura.").
// 2) si me alejo a medias, suelto la cerradura: no cede y no suena su final.
// 3) "el timbre la ocupa": timbro a los contadores y camino normal hasta la puerta; mis pasos no la sacan del timbre.
// Cada prueba retoma el mismo guardado con "Continuar" y la misma semilla (ayudasFinal.ts). La dificultad real (cuántas
// veces se sale con cada estrategia) se mide aparte, con el robot: medirCerraduras.spec.
import { expect, test, type Page } from '@playwright/test';
import { llegarALasLlaves, retomar } from './ayudasFinal';
import { calmar } from './ayudasPiso2';

test.describe.serial('Las tres cerraduras de la puerta principal', () => {
  test.setTimeout(420_000);
  let page: Page;
  let guardado = '';
  const errores: string[] = [];

  test.beforeAll(async ({ browser }, info) => {
    test.setTimeout(420_000);
    const contexto = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1280, height: 720 } });
    page = await contexto.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });
    page.on('pageerror', (e) => errores.push(String(e)));
    guardado = await llegarALasLlaves(page);
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('una cerradura la trae por el muro y sale junto a la puerta; empezar otra mientras escucha me delata', async ({}, info) => {
    await retomar(page, guardado, 'normal', 7919);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const relevantes: string[] = [];
      const encuentros: string[] = [];
      let motivo: string | null = null;
      ctx.bus.on('sonido-relevante', (s) => relevantes.push(s.descripcion));
      ctx.bus.on('encuentro', (e) => encuentros.push(e.estado));
      ctx.bus.on('jugador-atrapado', (a) => {
        motivo = a.motivo;
      });
      const fase = ctx.director.fase;
      const ella = ctx.entidad;
      const puerta = ctx.nivel.salidas[0];
      const p = puerta.objeto.position;
      const lejosAlEmpezar = Math.hypot(ella.posicion.x - p.x, ella.posicion.z - p.z);
      await P.caminar([[16, 12.9]], 0.2);
      await window.__usar!('puertaPrincipal');
      let fin = performance.now() + 8000;
      while (puerta.cerradurasAbiertas < 1 && performance.now() < fin) await P.esperarReal(20);
      const cede = ctx.programador.ahora;
      fin = performance.now() + 12_000;
      while (!ella.fisica && performance.now() < fin) await P.esperarReal(20);
      const sale = ctx.programador.ahora - cede;
      const faseAlSalir = ctx.director.fase;
      const salioCerca = Math.hypot(ella.posicion.x - p.x, ella.posicion.z - p.z);
      // Quieto, la dejo llegar. Cuando se queda a escucharme, empiezo el cerrojo.
      fin = performance.now() + 15_000;
      while (!encuentros.includes('inicio') && performance.now() < fin) await P.esperarReal(20);
      const escucho = encuentros.includes('inicio');
      const texto = await window.__usar!('puertaPrincipal');
      fin = performance.now() + 15_000;
      while (J.estado !== 'muerte' && performance.now() < fin) await P.esperarReal(20);
      return { fase, lejosAlEmpezar, sale, faseAlSalir, salioCerca, escucho, texto, encuentros, motivo, estado: J.estado, relevantes };
    });
    await page.screenshot({ path: info.outputPath('1-me-delato-la-cerradura.png') });
    expect(r.fase, 'recién cargado, el director está en calma').toBe('calma');
    expect(r.lejosAlEmpezar, 'ella empieza lejos (su guarida)').toBeGreaterThan(10);
    expect(r.relevantes, 'se la oye venir por el muro').toContain('algo corre por dentro del muro, hacia la puerta');
    expect(r.sale, 'sale pocos segundos después de que cede la cadena').toBeLessThan(6);
    expect(r.faseAlSalir, 'aunque el director no está en pico').not.toBe('pico');
    expect(r.salioCerca, 'junto a la puerta').toBeLessThan(8);
    expect(r.relevantes).toContain('algo se desprende del muro, cerca de la puerta');
    expect(r.escucho, 'llegó y se quedó a escucharme').toBe(true);
    expect(r.texto).toBe('Correr el cerrojo');
    expect(r.encuentros).toContain('fallido');
    expect(r.estado).toBe('muerte');
    expect(r.motivo, 'me delató la cerradura').toBe('cerradura');
    await expect(page.locator('.muerte__linea')).toHaveText('Oyó la cerradura.');
  });

  test('si me alejo a medias, suelto la cerradura: no cede y no suena su final', async () => {
    await retomar(page, guardado, 'normal', 15838);
    await calmar(page);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const subtitulos: string[] = [];
      let ruidos = 0;
      ctx.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
      ctx.bus.on('ruido', (x) => {
        if (x.causa === 'cerradura') ruidos++;
      });
      await P.caminar([[16, 12.9]], 0.2);
      const texto = await window.__usar!('puertaPrincipal');
      await P.esperarJuego(1);
      await P.caminar([[16, 11.6]], 0.2);
      await P.esperarJuego(3);
      return { texto, subtitulos, ruidos, abiertas: ctx.nivel.salidas[0].cerradurasAbiertas, bandera: ctx.progreso.tiene('cerradura:1') };
    });
    expect(r.texto).toBe('Quitar la cadena');
    expect(r.subtitulos).toContain('[Forcejeas con la cadena]');
    expect(r.subtitulos).toContain('Soltaste la cadena a medias.');
    expect(r.subtitulos).not.toContain('[La cadena cae al piso]');
    expect(r.ruidos, 'solo el forcejeo del principio').toBe(1);
    expect(r.abiertas).toBe(0);
    expect(r.bandera).toBe(false);
  });

  test('el timbre la ocupa: timbro a los contadores, camino normal a la puerta y mis pasos no la sacan de ahí', async () => {
    await retomar(page, guardado, 'normal', 23757);
    await calmar(page);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const C = 1.3;
      // A la portería (la abro si está cerrada) y frente al panel.
      await P.caminar([[22.2, 10.5]], 0.2);
      const pPorteria = ctx.nivel.puertas.find((x) => x.id === 'pPorteria')!;
      if (!pPorteria.abierta) await window.__abrirPuerta!('pPorteria');
      await P.caminar([[24.3, 10.5], [28.1, 11.3]], 0.15);
      // Ella, en los muros del otro lado del vestíbulo y sin nada en la memoria (la dejo quieta en los muros).
      const E = ctx.entidad;
      if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
      E.posicion.x = 10 * C;
      E.posicion.z = 12.5 * C;
      E.memoria.ultimoRuido = null;
      E.memoria.sospecha = 0;
      const timbre = { x: 16.8 * C, z: 1.1 * C };
      const antes = Math.hypot(E.posicion.x - timbre.x, E.posicion.z - timbre.z);
      await window.__usar!('panelCitofono:timbreContadores');
      await P.esperarJuego(3.2);
      // Camino normal (no agachado) hasta la puerta: mis pasos le llegan, pero el timbre la tiene ocupada.
      let ignorados = 0;
      const vigilar = setInterval(() => {
        if (!E.memoria.atendioUltimo) ignorados++;
      }, 50);
      await P.caminar([[24.3, 10.5], [22.2, 10.5], [16, 12.9]], 0.2);
      clearInterval(vigilar);
      const memoria = E.memoria.ultimoRuido as { x: number; z: number } | null;
      return {
        antes,
        despues: Math.hypot(E.posicion.x - timbre.x, E.posicion.z - timbre.z),
        enElTimbre: memoria ? Math.hypot(memoria.x - timbre.x, memoria.z - timbre.z) : null,
        ignorados,
        estado: J.estado,
      };
    });
    expect(r.estado).toBe('jugando');
    expect(r.enElTimbre, 'su memoria sigue en el timbre').not.toBeNull();
    expect(r.enElTimbre!).toBeLessThan(0.5);
    expect(r.despues, 'y fue hacia allá').toBeLessThan(r.antes - 4);
    expect(r.ignorados, 'oyó pasos y no la sacaron del timbre').toBeGreaterThan(0);
  });
});
