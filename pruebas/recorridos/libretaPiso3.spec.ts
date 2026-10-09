// La libreta de Andrés, caminando: bajo al Piso 3 y la junto como una persona. En el 301 leo la hoja que está
// junto a la puerta y la carta de la administración (el objetivo pasa a "Junta las hojas...") y tomo las pilas
// del dormitorio; en el 303, la hoja del escritorio y las pilas de la cocina; en el 302 miro el dibujo, el
// carrito y el palo (una línea flotando, el mundo sigue: nada se pausa), leo la carta de la mamá y, al final,
// el cuaderno del cuarto. Con la tercera parte, el guion marca 'imitacion:piso3' (la criatura imita completo)
// y suena la reflexión. Leer el cuaderno guardó en el cuarto del 302: recargo, "Continuar", y la partida sigue
// ahí, con la libreta completa (aunque se guardó un instante antes de que el guion la cerrara).
//
// La criatura queda en las paredes y el director quieto: aquí se prueba que todo se alcanza y se lee caminando.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, PREFIJO } from './acciones';
import { instalarPiloto } from './piloto';

/** Lo que el guion dice al juntar las tres partes (src/pisos/piso3/guion.ts). */
const REFLEXION = 'Las hojas son del mismo cuaderno. La última página no la escribió Andrés.';

interface AyudasLibreta {
  /** Miro la manija de una puerta, pulso E y espero a que abra. */
  abrir(puerta: string): Promise<void>;
  /** Miro un documento, compruebo que lo enfoco, lo abro con E, lo cierro con E. */
  leer(id: string): Promise<void>;
  /** Miro algo para examinar y pulso E: devuelvo la nota en pantalla y el estado del juego justo después. */
  examinar(id: string): Promise<{ nota: string; estado: string }>;
  /** Miro un recogible, compruebo que lo enfoco y lo tomo. */
  recoger(id: string): Promise<void>;
}

declare global {
  interface Window {
    __libreta?: AyudasLibreta;
  }
}

async function instalarAyudas(page: Page): Promise<void> {
  await page.evaluate(() => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const interactuable = (id: string) => {
      const i = ctx.nivel.interactuables.find((x) => x.id === id);
      if (!i) throw new Error(`No hay ningún interactuable "${id}" en el piso.`);
      return i;
    };
    /** Miro el punto de interacción (o el origen) y compruebo que el juego enfoca ESE objeto. */
    const enfocar = async (id: string) => {
      const i = interactuable(id);
      const p = i.puntoInteraccion ? i.puntoInteraccion(ctx.camara.position.clone()) : i.objeto.getWorldPosition(ctx.camara.position.clone());
      P.mirarA(p.x, p.y, p.z);
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado?.id ?? 'nada';
      if (enfocado !== id) throw new Error(`Mirando "${id}" enfoqué "${enfocado}".`);
    };
    const puerta = (id: string) => ctx.nivel.puertas.find((p) => p.id === id)!;
    window.__libreta = {
      async abrir(id) {
        const h = puerta(id).puntoInteraccion();
        P.mirarA(h.x, h.y, h.z);
        await P.esperarJuego(0.3);
        await P.pulsar('KeyE');
        const fin = performance.now() + 8000;
        while (!puerta(id).abierta && performance.now() < fin) await P.esperarReal(30);
        if (!puerta(id).abierta) throw new Error(`La puerta "${id}" no abrió.`);
        await P.esperarJuego(0.8);
      },
      async leer(id) {
        await enfocar(id);
        await P.pulsar('KeyE');
        await P.esperarEstado('documento');
        await P.esperarReal(300);
        await P.pulsar('KeyE');
        await P.esperarEstado('jugando');
      },
      async examinar(id) {
        await enfocar(id);
        await P.pulsar('KeyE');
        await P.esperarReal(120);
        const nota = document.querySelector('.tarjeta.tarjeta--nota.tarjeta--visible h2')?.textContent ?? '';
        return { nota, estado: J.estado };
      },
      async recoger(id) {
        await enfocar(id);
        await P.pulsar('KeyE');
        await P.esperarJuego(0.2);
      },
    };
  });
}

test('la libreta de Andrés se junta caminando por el 301, el 303 y el 302, y al cargar sigue completa', async ({ page }, info) => {
  test.setTimeout(360_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  const captura = (nombre: string) => page.screenshot({ path: info.outputPath(`${nombre}.png`) });

  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);

  // Bajo al Piso 3 por la escalera con la llave (el final del 402 lo camina guion.spec.ts).
  await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcarSilencioso('medido:402');
    ctx.progreso.marcarSilencioso('abierta:bajada');
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    ctx.nivel.aplicarLuzDe('medido:402');
    await P.caminar([[2.2, 9.5]]);
    const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
    P.mirarA(tramo.x, tramo.y, tramo.z);
    await P.esperarJuego(0.3);
    await P.pulsar('KeyE');
    const limite = performance.now() + 20_000;
    while (!(J.estado === 'jugando' && ctx.piso.id === 'piso3') && performance.now() < limite) await P.esperarReal(30);
    if (ctx.piso.id !== 'piso3') throw new Error(`No bajé al Piso 3: sigo en ${ctx.piso.id} (estado ${J.estado}).`);
    await P.esperarJuego(0.3);
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    const subtitulos: string[] = [];
    ctx.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
    (window as unknown as { __subtitulos: string[] }).__subtitulos = subtitulos;
    if (!ctx.linterna.encendida) await P.pulsar('KeyF');
  });
  await instalarAyudas(page);

  // 1. El 301: la hoja junto a la puerta, la carta en la mesa, las pilas en la mesita del dormitorio.
  const en301 = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    const L = window.__libreta!;
    await P.caminar([[3.6, 10.5], [7.5, 10.6]]);
    await L.abrir('p301');
    await P.caminar([[7.5, 9.5], [7.5, 7.6]]);
    await L.leer('docHoja301');
    const objetivoAntes = ctx.progreso.objetivoActual()?.id;
    await P.caminar([[7.5, 7.0]]);
    await L.leer('docCartaAdmin');
    const objetivoDespues = ctx.progreso.objetivoActual()?.id;
    // Rodeo la mesa por el este: en línea recta hacia la puerta del dormitorio me la llevaba por delante.
    await P.caminar([[8.4, 6.8], [8.4, 5.3], [6.5, 5.3]]);
    await L.abrir('pDorm301');
    await P.caminar([[6.5, 3.6], [8.3, 2.2]]);
    await L.recoger('pilas2');
    return { objetivoAntes, objetivoDespues, pilas: ctx.progreso.tiene('recogido:pilas2') };
  });
  expect(en301.objetivoAntes, 'al llegar, averiguar por qué cerraron el piso').toBe('averiguar');
  expect(en301.objetivoDespues, 'la carta de la administración lo cumple').toBe('juntar');
  expect(en301.pilas, 'las pilas del 301 se toman').toBe(true);

  // 2. El 303: por el pasillo (esquivando las bolsas), la hoja del escritorio del estudio y las pilas de la cocina.
  const en303 = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    const L = window.__libreta!;
    await P.caminar([[6.5, 3.6], [6.5, 5.3], [6.3, 6.9], [7.5, 7.8], [7.5, 9.5], [7.6, 10.68], [9.4, 10.68], [10.6, 10.35], [16, 10.35], [20.5, 10.45]]);
    await L.abrir('p303');
    await P.caminar([[20.5, 9.4], [20.5, 8.3], [24.5, 5.2]]);
    await L.abrir('pEstudio303');
    await P.caminar([[24.5, 3.5], [23.6, 2.6]]);
    await L.leer('docHoja303');
    await P.caminar([[24.5, 3.5], [24.5, 5.0], [19.0, 5.2]]);
    await L.abrir('pCocina303');
    await P.caminar([[18.5, 3.5], [18.6, 3.0]]);
    await L.recoger('pilas1');
    return { pilas: ctx.progreso.tiene('recogido:pilas1'), completa: ctx.progreso.tiene('imitacion:piso3') };
  });
  expect(en303.pilas, 'las pilas del 303 se toman').toBe(true);
  expect(en303.completa, 'con dos partes, la libreta no está completa').toBe(false);

  // 3. El 302: entro por la puerta y miro el dibujo pegado encima del sofá.
  const dibujo = await page.evaluate(async () => {
    const P = window.__piloto!;
    const L = window.__libreta!;
    await P.caminar([[18.5, 3.5], [18.5, 4.6], [19.5, 6.0], [20.5, 8.3], [20.5, 9.4], [20.5, 10.45], [14.5, 10.4]]);
    await L.abrir('p302');
    await P.caminar([[14.5, 11.5], [14.5, 12.4], [11.2, 13.3]]);
    return L.examinar('exDibujo');
  });
  await page.waitForTimeout(500);
  await captura('dibujo-302');
  expect(dibujo.nota).toBe('Un niño de palitos y, detrás, alguien muy alto sin cara. Abajo dice: «el que mide».');
  expect(dibujo.estado, 'examinar no pausa el mundo').toBe('jugando');

  // 4. El dormitorio del 302: el carrito en el piso, la carta en la mesita, el palo junto a las rayas de estatura.
  const carrito = await page.evaluate(async () => {
    const P = window.__piloto!;
    const L = window.__libreta!;
    await P.caminar([[11.2, 15.3], [10.5, 15.5]]);
    await L.abrir('pDorm302');
    await P.caminar([[10.5, 16.5], [10.6, 17.2]]);
    return L.examinar('exCarrito');
  });
  await page.waitForTimeout(500);
  await captura('carrito-302');
  expect(carrito.nota).toBe('Un carrito de plástico. Le arrancaron las ruedas para que no hiciera ruido.');
  expect(carrito.estado).toBe('jugando');

  const palo = await page.evaluate(async () => {
    const P = window.__piloto!;
    const L = window.__libreta!;
    await P.caminar([[12.0, 18.1]]);
    await L.leer('docCartaMadre');
    await P.caminar([[13.0, 18.2]]);
    return L.examinar('exMedidor');
  });
  await page.waitForTimeout(500);
  await captura('palo-y-estatura-302');
  expect(palo.nota).toBe('Un palo de escoba marcado con lápiz. Las últimas rayas no tienen número.');
  expect(palo.estado).toBe('jugando');

  // 5. El cuarto del 302: el cuaderno en el piso junto a la silla. Es la tercera parte: se cierra la libreta.
  const final = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    const L = window.__libreta!;
    await P.caminar([[12.0, 17.6], [10.5, 17.2], [10.5, 16.5], [10.5, 15.5], [17.5, 15.4], [18.5, 15.4]]);
    await L.abrir('pCuarto302');
    await P.caminar([[18.5, 16.5], [18.8, 17.5]]);
    await L.leer('docCuaderno');
    const completa = ctx.progreso.tiene('imitacion:piso3');
    await P.esperarJuego(2.5);
    const examinados = ['exDibujo', 'exCarrito', 'exMedidor'].filter((id) => ctx.progreso.tiene(`examinado:${id}`));
    return {
      completa,
      imitacion: ctx.progreso.imitacionCompleta,
      objetivo: ctx.progreso.objetivoActual()?.id ?? null,
      examinados,
      subtitulos: (window as unknown as { __subtitulos: string[] }).__subtitulos,
      enPantalla: document.querySelector('.subtitulos')?.textContent ?? '',
      habitacion: ctx.memoria.habitacionActual,
      estado: J.estado,
    };
  });
  await captura('cuarto-302');
  expect(final.completa, 'la tercera parte cierra la libreta').toBe(true);
  expect(final.imitacion, 'y con ella la criatura imita completo').toBe(true);
  expect(final.objetivo, 'con la libreta completa, toca grabar la pared del cuarto de Andrés (P3-guion)').toBe('grabar');
  expect(final.examinados).toEqual(['exDibujo', 'exCarrito', 'exMedidor']);
  expect(final.subtitulos.filter((s) => s === REFLEXION), 'la reflexión sale una vez').toHaveLength(1);
  expect(final.enPantalla).toContain(REFLEXION);
  expect(final.habitacion).toBe('cuarto302');
  expect(final.estado).toBe('jugando');

  // 6. Leer el cuaderno guardó en el cuarto del 302. Recargo y "Continuar": la partida sigue ahí, completa.
  const guardada = await page.evaluate((p) => JSON.parse(localStorage.getItem(p + 'partida') ?? 'null'), PREFIJO);
  expect(guardada?.piso).toBe('piso3');
  expect(guardada?.puntoControl, 'el punto de control del cuaderno').toBe('cuarto302');
  console.log('La partida guardada al leer el cuaderno ya traía la libreta cerrada:', guardada?.progreso?.banderas?.includes('imitacion:piso3'));
  await page.reload();
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__juego?.estado === 'menu');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');
  await instalarPiloto(page);
  const alCargar = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    await window.__piloto!.esperarJuego(0.5);
    return {
      piso: ctx.piso.id,
      habitacion: ctx.memoria.habitacionActual,
      completa: ctx.progreso.tiene('imitacion:piso3'),
      imitacion: ctx.progreso.imitacionCompleta,
      pilas: ['pilas1', 'pilas2'].filter((id) => ctx.nivel.interactuables.find((i) => i.id === id)?.activo),
    };
  });
  expect(alCargar).toEqual({ piso: 'piso3', habitacion: 'cuarto302', completa: true, imitacion: true, pilas: [] });
  expect(errores).toEqual([]);
});
