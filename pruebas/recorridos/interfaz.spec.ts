// Errores de interfaz que no se ven en el tipado: se prueban en el juego real.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, leerLaOrden } from './acciones';

async function iniciar(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
}

test('sin telemetría, la pantalla final no muestra "Exportar registro de la prueba"', async ({ page }) => {
  await iniciar(page);
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await page.waitForTimeout(1000);
  // Es la pantalla final, abierta por código: aquí solo se prueba cómo se dibuja.
  await page.evaluate(() => (window.__juego as unknown as { accionesGuion: { terminarPartida(): void } }).accionesGuion.terminarPartida());
  await expect(page.locator('.fin__estadisticas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar registro de la prueba' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Volver al menú' })).toBeVisible();
  // Los totales de la partida, sin marcas: el mejor tiempo es de cada piso y va en su línea (decisión del creador,
  // 2026-10-12: "Tu mejor tiempo" del Piso 4 junto al tiempo total confundía).
  // Cada dato es el valor (en negrita) y su nombre (el texto que sigue).
  const nombres = await page.locator('.fin__estadisticas li').evaluateAll((lis) => lis.map((li) => li.lastChild?.textContent ?? ''));
  expect(nombres).toEqual(['Tiempo', 'Dificultad', 'Cosas que cambiaron', 'Veces que te cazó', 'Veces que te oyó']);
  const datos = await page.locator('.fin__estadisticas li').allTextContents();
  expect(datos.some((d) => /mejor tiempo/i.test(d)), 'sin "mejor tiempo" en los totales').toBe(false);
  // "Jugar otra vez" lleva a elegir la dificultad y empieza una partida nueva, sin pasar por el menú.
  await page.getByRole('button', { name: 'Jugar otra vez' }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando', null, { timeout: 10_000 });
  const nueva = await page.evaluate(() => {
    const { ctx } = window.__juego!;
    return { banderas: ctx.progreso.exportar().banderas.length, cambios: ctx.memoria.cambiosMundo };
  });
  expect(nueva, 'empieza de cero').toEqual({ banderas: 0, cambios: 0 });
});

test('con ?telemetria=1, el botón de exportar sí aparece', async ({ page }) => {
  await page.goto('/?telemetria=1');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await page.waitForTimeout(1000);
  await page.evaluate(() => (window.__juego as unknown as { accionesGuion: { terminarPartida(): void } }).accionesGuion.terminarPartida());
  await expect(page.getByRole('button', { name: 'Exportar registro de la prueba' })).toBeVisible();
});

test('una pantalla oculta sale del árbol de accesibilidad y no se puede enfocar', async ({ page }) => {
  await iniciar(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__juego?.estado === 'menu');
  // La salida es una animación de 300 ms: hasta que termina, la pantalla sigue "visible" (es normal).
  // No espero un tiempo fijo: con la máquina cargada (la suite completa) 700 ms a veces no alcanzaban.
  // Pregunto hasta que se oculten; si una nunca se oculta, falla igual al vencer el plazo.
  const revisar = () =>
    page.evaluate(() => {
      const ocultas = [...document.querySelectorAll<HTMLElement>('.pantalla.pantalla--oculta')];
      return {
        total: ocultas.length,
        visibles: ocultas.filter((p) => getComputedStyle(p).visibility !== 'hidden').map((p) => p.className),
      };
    });
  await expect.poll(async () => (await revisar()).visibles, { message: 'pantallas ocultas que siguen visibles', timeout: 5000 }).toEqual([]);
  expect((await revisar()).total, 'hay pantallas ocultas que revisar').toBeGreaterThan(5);
  // Lo que ve un lector de pantalla: la pantalla de inicio ya no existe, el menú sí.
  await expect(page.getByRole('button', { name: /Este juego se escucha/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nueva partida', exact: true })).toBeVisible();
});

// El final del Piso 4 ya no es la pantalla final (se despierta en la escalera), así que un probador exporta desde la
// pausa, a media partida. El archivo debe traer lo jugado hasta ese instante, con su resumen.
test('con ?telemetria=1, la pausa exporta el registro a media partida, con resumen', async ({ page }) => {
  await abrirEleccion(page, '/?telemetria=1');
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  await leerLaOrden(page);
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  const boton = page.locator('.pausa').getByRole('button', { name: 'Exportar registro de la prueba' });
  await expect(boton).toBeVisible();
  const [descarga] = await Promise.all([page.waitForEvent('download'), boton.click()]);
  await expect(page.locator('.pausa').getByRole('button', { name: 'Registro descargado' })).toBeVisible();
  const ruta = await descarga.path();
  const archivo = JSON.parse(readFileSync(ruta, 'utf-8')) as { sesiones: { terminada: string; resumen: unknown; eventos: { tipo: string }[] }[] };
  const sesion = archivo.sesiones.at(-1)!;
  expect(sesion.terminada, 'la sesión sigue abierta: exportar no la cierra').toBe('en-curso');
  expect(sesion.resumen, 'trae el resumen aunque no haya terminado').not.toBeNull();
  expect(sesion.eventos.some((e) => e.tipo === 'documento'), 'trae lo jugado desde el último autoguardado').toBe(true);
});

test('sin telemetría, la pausa no muestra "Exportar registro de la prueba"', async ({ page }) => {
  await abrirEleccion(page, '/?telemetria=0');
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  await expect(page.locator('.pausa').getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
  await expect(page.locator('.pausa').getByRole('button', { name: 'Exportar registro de la prueba' })).toBeHidden();
});

// Los créditos (decisión del creador, 2026-10-14): el estudio en el pie del menú; en Créditos, "Desarrollado por" y
// "Creado y dirigido por" debajo del título, y la ayuda de IA en la sección de tecnología, no como autoría.
test('el menú lleva el nombre del estudio y Créditos separa la autoría de la ayuda de IA', async ({ page }) => {
  await iniciar(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__juego?.estado === 'menu');
  await expect(page.locator('.menu__estudio'), 'el estudio en el pie del menú').toHaveText('El Mundo de Manu');
  await page.getByRole('button', { name: 'Créditos', exact: true }).click();
  const creditos = page.locator('.creditos__texto');
  await expect(creditos).toBeVisible();
  const lineas = await creditos.evaluate((caja) => {
    const hijos = [...caja.children].map((h) => ({ etiqueta: h.tagName, texto: h.textContent?.trim() ?? '' }));
    const tecnologia = hijos.findIndex((h) => h.etiqueta === 'H3' && h.texto === 'Tecnología');
    const siguiente = hijos.findIndex((h, i) => i > tecnologia && h.etiqueta === 'H3');
    return {
      autoria: hijos.filter((h) => h.etiqueta === 'P').map((h) => h.texto).slice(1, 3),
      enTecnologia: hijos.slice(tecnologia + 1, siguiente === -1 ? undefined : siguiente).map((h) => h.texto),
      antesDeTecnologia: hijos.slice(0, tecnologia).map((h) => h.texto),
    };
  });
  expect(lineas.autoria).toEqual(['Desarrollado por El Mundo de Manu', 'Creado y dirigido por Carlos Manuel Turizo Hernández']);
  expect(lineas.enTecnologia).toContain('Desarrollado con asistencia de IA (Claude, de Anthropic)');
  expect(lineas.antesDeTecnologia.join(' '), 'la IA no está en la autoría').not.toContain('IA');
});
