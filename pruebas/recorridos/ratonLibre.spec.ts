// Las pruebas automáticas no capturan el ratón del sistema. Antes, al empezar una partida, el juego le pedía a
// Windows capturar el cursor (Pointer Lock) desde el Chrome invisible de las pruebas: el ratón de quien usaba el
// computador quedaba encerrado en el rectángulo de esa ventana y se recentraba solo durante toda la corrida.
// Ahora, con el navegador manejado por una prueba, el juego hace como si estuviera capturado sin capturar nada.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';

test('jugando en una prueba, el ratón del sistema queda libre (y el juego se comporta como capturado)', async ({ page }) => {
  test.setTimeout(150_000);
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  const r = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    await window.__piloto!.esperarJuego(0.5);
    return {
      capturadoDeVerdad: document.pointerLockElement !== null,
      comoCapturado: ctx.entrada.teclado.bloqueado,
      automatizado: navigator.webdriver,
    };
  });
  expect(r.automatizado, 'el navegador de las pruebas se anuncia como automatizado').toBe(true);
  expect(r.capturadoDeVerdad, 'nadie le pidió a Windows el cursor').toBe(false);
  expect(r.comoCapturado, 'para el juego, el ratón está "bloqueado": no se pausa ni muestra el aviso').toBe(true);
});
