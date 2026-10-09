// La llave del 402, de verdad y caminando: la puerta se resiste sin llave; en el estudio del 403 (abriendo dos
// puertas con E) ya no está la llave sino la nota de M., que dice dónde quedó; al leerla aparece en la mesita de
// doña Rosalba, en el 401, junto al diario; se toma con E y la puerta del 402 cede.
// Es la ruta que lleva por la historia (propuesta P4-ritmo): si se rompe, el juego no se termina.
import { expect, test } from '@playwright/test';
import { instalarPiloto } from './piloto';

test('sin llave el 402 se resiste; la nota del estudio del 403 lleva a la llave en la mesita del 401', async ({ page }) => {
  test.setTimeout(300_000);
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

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const puerta = (id: string) => ctx.nivel.puertas.find((p) => p.id === id)!;
    const objeto = (id: string) => ctx.nivel.interactuables.find((i) => i.id === id)!;
    const subtitulos: string[] = [];
    ctx.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
    const apuntarA = async (x: number, y: number, z: number) => {
      P.mirarA(x, y, z);
      await P.esperarJuego(0.3);
    };
    const apuntarAObjeto = async (id: string) => {
      const o = objeto(id).objeto;
      const p = o.getWorldPosition(o.position.clone());
      await apuntarA(p.x, p.y, p.z);
    };
    const abrir = async (id: string) => {
      const h = puerta(id).puntoInteraccion();
      await apuntarA(h.x, h.y, h.z);
      await P.pulsar('KeyE');
      const limite = performance.now() + 8000;
      while (!puerta(id).abierta && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.8);
    };
    const salida: Record<string, unknown> = {};

    // 1) Sin llave: la puerta del 402 no cede.
    await P.caminar([[3.6, 10.5], [12, 10.5], [14.5, 10.5]]);
    const h402 = puerta('p402').puntoInteraccion();
    await apuntarA(h402.x, h402.y, h402.z);
    salida.textoSinLlave = J.interaccion.enfocado?.texto(ctx) ?? null;
    await P.pulsar('KeyE');
    await P.esperarJuego(1.5);
    salida.cerradaSinLlave = !puerta('p402').abierta;
    salida.llaveAntesDeLaNota = objeto('llave402').activo;

    // 2) Al estudio del 403: en el escritorio está la nota, no la llave. Se lee con E.
    await P.caminar([[16.5, 10.3], [18.2, 10.3], [20.5, 10.5]]);
    await abrir('p403');
    await P.caminar([[20.5, 8.5], [20.5, 6], [24.5, 5.6], [24.5, 5.5]]);
    await abrir('pEstudio403');
    await P.caminar([[24.5, 3.5], [23.4, 3.3], [23.4, 2.4]], 0.2);
    await apuntarAObjeto('docNotaEscritorio');
    salida.enfocadoNota = J.interaccion.enfocado?.id ?? null;
    await P.pulsar('KeyE');
    await P.esperarEstado('documento');
    await P.esperarReal(400);
    await P.pulsar('KeyE');
    await P.esperarEstado('jugando');
    salida.leyoNota = ctx.progreso.tiene('leyo:nota_escritorio');
    salida.llaveTrasLaNota = objeto('llave402').activo;

    // 3) Al dormitorio del 401: la llave está en la mesita, junto al diario (los dos se pueden tomar).
    await P.caminar([[24.5, 3.5], [24.5, 5.5], [24.5, 5.6], [20.5, 6], [20.5, 8.5], [20.5, 10.5], [18.2, 10.3], [16.5, 10.3], [12, 10.5], [7.5, 10.5]]);
    await abrir('p401');
    await P.caminar([[7.5, 9.5], [7.5, 7.6], [6.5, 7.6], [6.5, 6], [6.5, 4.5], [6.5, 3.5], [7.6, 3.3], [7.9, 1.7]], 0.2);
    salida.habitacionLlave = ctx.memoria.habitacionActual;
    await apuntarAObjeto('docDiario');
    salida.enfocadoDiario = J.interaccion.enfocado?.id ?? null;
    await apuntarAObjeto('llave402');
    salida.enfocado = J.interaccion.enfocado?.id ?? null;
    salida.textoLlave = J.interaccion.enfocado?.texto(ctx) ?? null;
    await P.pulsar('KeyE');
    await P.esperarJuego(0.5);
    salida.tieneLlave = ctx.progreso.tieneObjeto('llave_402');
    salida.llaveVisible = objeto('llave402').objeto.visible;
    salida.mensajeLlave = subtitulos.find((s) => s.includes('«402»')) ?? null;

    // 4) De vuelta a la puerta del 402: ahora cede.
    await P.caminar([[7.6, 3.3], [6.5, 3.5], [6.5, 4.5], [6.5, 6], [6.5, 7.6], [7.5, 7.6], [7.5, 9.5], [7.5, 10.5], [12, 10.5], [14.5, 10.5]]);
    const h = puerta('p402').puntoInteraccion();
    await apuntarA(h.x, h.y, h.z);
    salida.textoConLlave = J.interaccion.enfocado?.texto(ctx) ?? null;
    await P.pulsar('KeyE');
    const limite = performance.now() + 10_000;
    while (!puerta('p402').abierta && performance.now() < limite) await P.esperarReal(30);
    salida.abiertaConLlave = puerta('p402').abierta;
    await P.esperarJuego(1);
    await P.caminar([[14.5, 12.5]]);
    salida.habitacion = ctx.memoria.habitacionActual;
    salida.estado = J.estado;
    return salida;
  });

  expect(r.cerradaSinLlave, 'sin llave la puerta del 402 no se abre').toBe(true);
  expect(r.textoSinLlave).toBe('Está cerrada con llave');
  expect(r.llaveAntesDeLaNota, 'antes de leer la nota, la llave no está en la mesita').toBe(false);
  expect(r.enfocadoNota, 'en el escritorio del estudio está la nota').toBe('docNotaEscritorio');
  expect(r.leyoNota).toBe(true);
  expect(r.llaveTrasLaNota, 'leída la nota, la llave está en la mesita').toBe(true);
  expect(r.habitacionLlave).toBe('dormitorio401');
  expect(r.enfocadoDiario, 'el diario sigue al alcance junto a la llave').toBe('docDiario');
  expect(r.enfocado, 'la mirada cae sobre la llave').toBe('llave402');
  expect(r.textoLlave, 'el texto sale de la declaración del objeto').toBe('Tomar la llave del 402');
  expect(r.tieneLlave, 'la llave entra al inventario').toBe(true);
  expect(r.llaveVisible, 'tomada, desaparece de la mesita').toBe(false);
  expect(r.mensajeLlave).toContain('cajón');
  expect(r.textoConLlave).toBe('Abrir con la llave');
  expect(r.abiertaConLlave, 'con la llave la puerta cede').toBe(true);
  expect(r.habitacion, 'se cruza al 402').toBe('sala402');
  expect(r.estado).toBe('jugando');
  expect(errores, 'errores de consola').toEqual([]);
});
