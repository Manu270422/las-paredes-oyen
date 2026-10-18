// Ayudas para probar el final del juego (la puerta principal del Piso 1): llegar una vez hasta las llaves (su punto
// de control es el de frente a la puerta) y, después, retomar ESE guardado cuantas veces haga falta, como una persona
// que vuelve a la partida con "Continuar". Las usan cerraduras.spec y medirCerraduras.spec.
import { expect, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, PREFIJO } from './acciones';
import { calmar, instalarAyudas, llegarAlPiso1 } from './ayudasPiso2';

/**
 * Partida nueva en Normal hasta el Piso 1, a la portería y al cuarto de don Aurelio por las llaves (caminando).
 * Devuelve el guardado de frente a la puerta.
 */
export async function llegarALasLlaves(page: Page): Promise<string> {
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  await instalarAyudas(page);
  expect((await llegarAlPiso1(page)).piso).toBe('piso1');
  await calmar(page);
  await page.evaluate(async () => {
    const P = window.__piloto!;
    await P.caminar([[5.5, 10.5], [6.6, 10.5], [10, 10.5], [22.4, 10.5]], 0.18);
    await window.__abrirPuerta!('pPorteria');
    await P.caminar([[24.5, 10.5], [26.5, 10.6], [26.5, 9.2], [26.5, 8.5]], 0.18);
    await window.__abrirPuerta!('pCuarto101');
    await P.caminar([[26.5, 7.5], [26.5, 6.2], [28.2, 3.5]], 0.15);
    await window.__usar!('llavesAurelio', -0.6);
    await P.esperarJuego(0.6);
  });
  const guardado = await page.evaluate((p) => localStorage.getItem(p + 'partida'), PREFIJO);
  expect(guardado, 'tomar las llaves guarda frente a la puerta').toContain('"puntoControl":"vestibulo"');
  return guardado!;
}

/** Vuelvo al menú desde donde esté (jugando, muerto o en la pantalla final). */
export async function alMenu(page: Page): Promise<void> {
  const estado = await page.evaluate(() => window.__juego!.estado);
  if (estado === 'jugando') {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Salir al menú principal', exact: true }).click();
    // Confirma: "Volverás al menú. Tu progreso queda guardado en el último punto de control."
    await page.getByRole('alertdialog').getByRole('button', { name: 'Salir al menú', exact: true }).click();
  } else if (estado === 'muerte') {
    await page.getByRole('button', { name: 'Menú principal', exact: true }).click();
  } else if (estado === 'fin') {
    await page.getByRole('button', { name: 'Volver al menú', exact: true }).click();
  }
  await page.waitForFunction(() => window.__juego?.estado === 'menu', null, { timeout: 30_000 });
}

/**
 * Retomo el guardado frente a la puerta con esa dificultad, Math.random sembrado y sin las muertes de antes (si no,
 * el alivio del director haría más fácil cada intento siguiente).
 */
export async function retomar(page: Page, guardado: string, dificultad: string, semilla: number): Promise<void> {
  await page.evaluate(
    ({ guardado, dificultad, prefijo }) => {
      const datos = { ...JSON.parse(guardado), dificultad, dificultadInicial: dificultad, dificultadMasBaja: dificultad };
      localStorage.setItem(prefijo + 'partida', JSON.stringify(datos));
    },
    { guardado, dificultad, prefijo: PREFIJO },
  );
  await alMenu(page);
  // El del menú principal (la pausa también tiene un "Continuar", y puede seguir saliendo de la pantalla). El menú
  // arma "Continuar" al mostrarse: si se mostró antes de que existiera el guardado, lo vuelvo a mostrar.
  const continuar = page.locator('.menu__opciones').getByRole('button', { name: 'Continuar', exact: true });
  if (!(await continuar.isVisible())) {
    await page.getByRole('button', { name: 'Créditos', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar' }).click();
  }
  await page.evaluate((semilla) => {
    window.__juego!.ctx.memoria.muertesSinProgreso = 0;
    let a = semilla >>> 0;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, semilla);
  await continuar.click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando', null, { timeout: 60_000 });
  await page.evaluate(() => window.__piloto!.esperarJuego(0.5));
}
