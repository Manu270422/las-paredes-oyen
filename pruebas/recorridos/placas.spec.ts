// Los números del Piso 4, caminando: de la escalera (donde está el "4" pintado) por el pasillo hasta
// quedar frente al 401 y mirar su placa con la linterna. Las placas y el rótulo son DATOS del paquete.
//
// Lo que esta prueba NO puede decir es si "se lee": eso se juzga en las capturas y en un teléfono. Aquí
// compruebo lo medible: que existan donde dicen los datos, que nada las tape, que la linterna las alcance
// y cuántos píxeles ocupan las cifras en pantalla.
import { expect, test } from '@playwright/test';
import type { Raycaster, Vector2 } from 'three';
import { instalarPiloto } from './piloto';

test('el "4" de la escalera y la placa del 401 están donde dicen los datos y se alcanzan a ver', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await instalarPiloto(page);

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const salida: Record<string, unknown> = {
      placas: ctx.piso.placas?.map((p) => p.puerta) ?? [],
      enEscena: (ctx.piso.placas ?? []).filter((p) => ctx.escena.getObjectByName(`placa:${p.texto}`)).length,
    };

    // 1. En la escalera: el "4" está en el muro y nada se interpone entre mis ojos y él.
    const rotulo = ctx.escena.getObjectByName('rotulo:4')!;
    const r4 = rotulo.getWorldPosition(rotulo.position.clone());
    const ojos = ctx.camara.position;
    salida.rotuloSinObstaculos = ctx.nivel.consultaOclusion(ojos.x, ojos.z, r4.x, r4.z + 0.05) === 0;

    // 2. Por el pasillo hasta quedar frente al 401, y la linterna a la placa.
    await P.caminar([[3.6, 10.5], [7.5, 10.55]]);
    await P.pulsar('KeyF');
    const placa = ctx.escena.getObjectByName('placa:401')!;
    placa.updateWorldMatrix(true, false);
    const c = placa.getWorldPosition(placa.position.clone());
    P.mirarA(c.x, c.y, c.z);
    await P.esperarJuego(0.5);
    salida.linternaEncendida = ctx.linterna.encendida;
    salida.laIlumina = ctx.linterna.ilumina(c);
    // La mirada cae en la puerta del 401 a través de la placa (la placa es parte de la puerta)...
    salida.enfocado = J.interaccion.enfocado?.id ?? null;
    // ...y lo PRIMERO que toca un rayo desde el centro de la pantalla es la placa, no la hoja ni un muro.
    // (Uso el rayo del sistema de interacción: es un interno, si cambia se actualiza aquí.)
    const rayo = (J.interaccion as unknown as { rayo: Raycaster }).rayo;
    rayo.setFromCamera({ x: 0, y: 0 } as Vector2, ctx.camara); // el centro de la pantalla
    salida.primerImpacto = rayo.intersectObject(ctx.nivel.grupo, true)[0]?.object.name ?? null;

    // Cuántos píxeles ocupan las cifras (12 cm de alto, ~19 cm las tres de ancho).
    const cam = ctx.camara;
    cam.updateMatrixWorld();
    const lienzo = ctx.renderizador.webgl.domElement;
    const aPantalla = (lx: number, ly: number) => {
      const v = placa.localToWorld(placa.position.clone().set(lx, ly, 0.003)).project(cam);
      return { x: ((v.x + 1) / 2) * lienzo.width, y: ((1 - v.y) / 2) * lienzo.height };
    };
    const [a, b, i, d] = [aPantalla(0, 0.06), aPantalla(0, -0.06), aPantalla(-0.095, 0), aPantalla(0.095, 0)];
    salida.distancia = +cam.position.distanceTo(c).toFixed(2);
    salida.altoCifraPx = Math.round(Math.hypot(a.x - b.x, a.y - b.y));
    salida.anchoCifraPx = Math.round(Math.hypot(d.x - i.x, d.y - i.y) / 3);
    salida.estado = J.estado;
    return salida;
  });

  expect(r.placas, 'el paquete declara las tres placas').toEqual(['p401', 'p403', 'p402']);
  expect(r.enEscena, 'las tres placas están en la escena').toBe(3);
  expect(r.rotuloSinObstaculos, 'desde la escalera se ve el "4" del muro').toBe(true);
  expect(r.linternaEncendida).toBe(true);
  expect(r.laIlumina, 'la linterna alcanza la placa del 401').toBe(true);
  expect(r.enfocado, 'mirando la placa, la mirada cae en la puerta del 401').toBe('p401');
  expect(r.primerImpacto, 'lo primero que toca la mirada es la placa (está en la cara del pasillo)').toBe('placa:401');
  expect(r.distancia as number).toBeLessThan(1.2);
  // Frente a la puerta, en 1280 × 720: medido ~60 px de alto y ~33 de ancho por cifra. El mínimo deja margen.
  expect(r.altoCifraPx as number, 'alto de cada cifra en pantalla (px)').toBeGreaterThanOrEqual(40);
  expect(r.anchoCifraPx as number, 'ancho de cada cifra en pantalla (px)').toBeGreaterThanOrEqual(20);
  expect(r.estado).toBe('jugando');
  expect(errores, 'errores de consola').toEqual([]);
});
