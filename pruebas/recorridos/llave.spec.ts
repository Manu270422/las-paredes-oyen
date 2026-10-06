// La llave del 402, de verdad y caminando: la puerta se resiste sin llave; se camina hasta el estudio del 403
// (abriendo dos puertas con E), se toma la llave con E y entonces la puerta del 402 cede.
// Es la ruta que más confunde a los jugadores (la llave está del lado del 403): si se rompe, el juego no se termina.
import { expect, test } from '@playwright/test';
import { instalarPiloto } from './piloto';

test('sin llave la puerta del 402 se resiste; con la llave del estudio del 403 se abre', async ({ page }) => {
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
    const subtitulos: string[] = [];
    ctx.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
    const apuntarA = async (x: number, y: number, z: number) => {
      P.mirarA(x, y, z);
      await P.esperarJuego(0.3);
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
    salida.tieneLlaveAntes = ctx.progreso.tieneObjeto('llave_402');

    // 2) Al estudio del 403, abriendo sus puertas, y tomar la llave con E.
    await P.caminar([[16.5, 10.3], [18.2, 10.3], [20.5, 10.5]]);
    await abrir('p403');
    await P.caminar([[20.5, 8.5], [20.5, 6], [24.5, 5.6], [24.5, 5.5]]);
    await abrir('pEstudio403');
    await P.caminar([[24.5, 3.5], [23.4, 3.3], [23.4, 2.4]], 0.2);
    const llave = ctx.nivel.interactuables.find((i) => i.id === 'llave402')!;
    const posicion = llave.objeto.getWorldPosition(llave.objeto.position.clone());
    await apuntarA(posicion.x, posicion.y, posicion.z);
    salida.enfocado = J.interaccion.enfocado?.id ?? null;
    salida.textoLlave = J.interaccion.enfocado?.texto(ctx) ?? null;
    await P.pulsar('KeyE');
    await P.esperarJuego(0.5);
    salida.tieneLlave = ctx.progreso.tieneObjeto('llave_402');
    salida.llaveVisible = llave.objeto.visible;
    salida.mensajeLlave = subtitulos.find((s) => s.includes('«402»')) ?? null;

    // 3) De vuelta a la puerta del 402: ahora cede.
    await P.caminar([[24.5, 3.5], [24.5, 5.5], [24.5, 5.6], [20.5, 6], [20.5, 8.5], [20.5, 10.5], [18.2, 10.3], [16.5, 10.3], [14.5, 10.5]]);
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
  expect(r.tieneLlaveAntes).toBe(false);
  expect(r.enfocado, 'la mirada cae sobre la llave').toBe('llave402');
  expect(r.textoLlave, 'el texto sale de la declaración del objeto').toBe('Tomar la llave del 402');
  expect(r.tieneLlave, 'la llave entra al inventario').toBe(true);
  expect(r.llaveVisible, 'tomada, desaparece del escritorio').toBe(false);
  expect(r.mensajeLlave).toContain('402');
  expect(r.textoConLlave).toBe('Abrir con la llave');
  expect(r.abiertaConLlave, 'con la llave la puerta cede').toBe(true);
  expect(r.habitacion, 'se cruza al 402').toBe('sala402');
  expect(r.estado).toBe('jugando');
  expect(errores, 'errores de consola').toEqual([]);
});
