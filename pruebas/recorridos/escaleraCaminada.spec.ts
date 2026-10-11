// La escalera que se camina (C2 §1), como una persona: con la reja del Piso 4 ya abierta, bajo el tramo de la
// izquierda escalón por escalón, cruzo el descanso de lado a lado (ahí cambio de piso sin pantalla negra larga),
// sigo por el otro tramo y llego a la boca del Piso 3. Después subo igual, de vuelta al Piso 4.
// Compruebo lo que importa: la altura de los pies sigue a los escalones, el cambio de piso pasa en el descanso
// (no al pulsar E) y es corto, la partida guarda al llegar, y no hay E de "Bajar" que viaje sola.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';

declare global {
  interface Window {
    /** Cruzo el descanso caminando hasta (x, y) en celdas aunque en medio cambie de piso. */
    __cruzar?: (x: number, y: number) => Promise<{ piso: string; negroMs: number }>;
  }
}

/** Mientras camino, el juego pasa un instante a "viaje" (el cambio de piso): el piloto no lo tolera, este sí. */
async function instalarCruce(page: Page): Promise<void> {
  await page.evaluate(() => {
    const J = window.__juego!;
    const C = 1.3;
    const tecla = (codigo: string, tipo: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(tipo, { code: codigo }));
    window.__cruzar = async (cx, cy) => {
      const { ctx } = J;
      const x = cx * C;
      const z = cy * C;
      const limite = performance.now() + 30_000;
      let inicioNegro = 0;
      let negroMs = 0;
      tecla('KeyW', 'keydown');
      try {
        for (;;) {
          const p = ctx.jugador.posicion;
          if (J.estado === 'viaje') {
            inicioNegro ||= performance.now();
          } else {
            if (inicioNegro) negroMs += performance.now() - inicioNegro;
            inicioNegro = 0;
            if (Math.hypot(p.x - x, p.z - z) < 0.2) break;
            ctx.jugador.yaw = Math.atan2(-(x - p.x), -(z - p.z));
            ctx.jugador.pitch = 0;
          }
          if (performance.now() > limite) throw new Error(`No llegué a (${cx}, ${cy}); quedé en (${(p.x / C).toFixed(2)}, ${(p.z / C).toFixed(2)}) en ${ctx.piso.id}.`);
          await new Promise((r) => setTimeout(r, 16));
        }
      } finally {
        tecla('KeyW', 'keyup');
      }
      return { piso: ctx.piso.id, negroMs: Math.round(negroMs) };
    };
  });
}

test('bajo caminando del Piso 4 al 3 por la escalera y vuelvo a subir', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  const captura = (nombre: string) => page.screenshot({ path: info.outputPath(`${nombre}.png`) });
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await instalarCruce(page);

  // El final del 402 ya pasó y la reja está abierta (abrirla con la llave lo prueba llaveEscalera.spec.ts).
  const alPrincipio = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcarSilencioso('medido:402');
    ctx.progreso.marcarSilencioso('abierta:bajada');
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    ctx.nivel.aplicarLuzDe('medido:402');
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    const P = window.__piloto!;
    if (!ctx.linterna.encendida) await P.pulsar('KeyF');
    // Me asomo al tramo abierto: caminando, no hay "Bajar al Piso 3" que me lleve con E.
    await P.caminar([[1.5, 10.45]]);
    const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
    P.mirarA(tramo.x, tramo.y, tramo.z);
    await P.esperarJuego(0.3);
    return { fundido: ctx.ajustes.valores.escalerasConFundido, enfocado: J.interaccion.enfocado?.id ?? null };
  });
  expect(alPrincipio.fundido, 'por defecto, las escaleras se caminan').toBe(false);
  expect(alPrincipio.enfocado, 'con la reja abierta no hay tramo que pulsar: se baja caminando').toBeNull();
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    ctx.jugador.yaw = Math.PI;
    ctx.jugador.pitch = -0.55;
    await window.__piloto!.esperarJuego(0.5);
  });
  await captura('1-asomado-al-tramo');

  // Bajo el tramo de la izquierda hasta el descanso: los pies bajan escalón por escalón.
  const bajando = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    const alturas: number[] = [];
    await P.caminar([[1.5, 11.2]], 0.15);
    alturas.push(ctx.jugador.posicion.y);
    await P.caminar([[1.5, 12.0]], 0.15);
    alturas.push(ctx.jugador.posicion.y);
    await P.caminar([[1.5, 12.65]], 0.15);
    alturas.push(ctx.jugador.posicion.y);
    // Miro hacia el otro tramo, el que sigue bajando: es por donde voy a seguir.
    ctx.jugador.yaw = -Math.PI / 2;
    ctx.jugador.pitch = -0.35;
    await P.esperarJuego(0.4);
    return { alturas, piso: ctx.piso.id };
  });
  expect(bajando.piso).toBe('piso4');
  expect(bajando.alturas[0], 'en los primeros escalones').toBeLessThan(-0.1);
  expect(bajando.alturas[1]).toBeLessThan(bajando.alturas[0]);
  expect(bajando.alturas[2], 'el descanso, a medio piso').toBeCloseTo(-1.35, 1);
  await captura('2-en-el-descanso');

  // Cruzo el descanso de lado a lado: ahí cambio de piso (corto) y sigo por el otro tramo.
  const cruce = await page.evaluate(() => window.__cruzar!(3.5, 12.65));
  const trasCruzar = await page.evaluate(() => ({ y: window.__juego!.ctx.jugador.posicion.y }));
  expect(cruce.piso, 'al cruzar el descanso llegué al Piso 3').toBe('piso3');
  // El viaje con fundido deja al menos 2.05 s de negro por diseño. Caminando es un parpadeo más lo que tarda en
  // armarse y dibujarse el piso: en este navegador sin GPU (todo por software) ~1.3 s; en una GPU de verdad, mucho menos.
  expect(cruce.negroMs, 'el cambio de piso caminando es un parpadeo, no el fundido del viaje').toBeLessThan(2000);
  expect(trasCruzar.y, 'ahora estoy en el descanso de arriba del Piso 3: el mismo lugar').toBeCloseTo(1.35, 1);
  await captura('3-cruzado-al-piso-3');

  const enPiso3 = await page.evaluate(async (prefijo) => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    await P.caminar([[3.5, 11.6]], 0.15);
    const aMitad = ctx.jugador.posicion.y;
    await P.caminar([[3.5, 10.45], [3.2, 10.0]], 0.15);
    return {
      aMitad,
      alFinal: ctx.jugador.posicion.y,
      llego: ctx.progreso.tiene('llego:piso3'),
      guardada: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null'),
    };
  }, 'las-paredes-oyen:');
  expect(enPiso3.aMitad, 'bajando el tramo del Piso 3').toBeGreaterThan(0.1);
  expect(enPiso3.aMitad).toBeLessThan(1.3);
  expect(enPiso3.alFinal, 'en el piso del Piso 3').toBeCloseTo(0, 2);
  expect(enPiso3.llego).toBe(true);
  expect(enPiso3.guardada?.piso, 'llegar a otro piso caminando también guarda').toBe('piso3');
  await captura('4-en-la-boca-del-piso-3');

  // Y de vuelta: subo por el tramo de la derecha, cruzo el descanso y bajo al Piso 4 por el de la izquierda.
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    await window.__piloto!.caminar([[3.5, 10.45], [3.5, 11.2], [3.5, 12.65]], 0.15);
  });
  const subida = await page.evaluate(() => window.__cruzar!(1.5, 12.65));
  expect(subida.piso).toBe('piso4');
  expect(subida.negroMs).toBeLessThan(2000);
  const enPiso4 = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const enDescanso = ctx.jugador.posicion.y;
    await window.__piloto!.caminar([[1.5, 11.2], [1.5, 10.45], [2.2, 10.0]], 0.15);
    return { enDescanso, alFinal: ctx.jugador.posicion.y, estado: window.__juego!.estado };
  });
  expect(enPiso4.enDescanso, 'subí al descanso de abajo del Piso 4').toBeCloseTo(-1.35, 1);
  expect(enPiso4.alFinal).toBeCloseTo(0, 2);
  expect(enPiso4.estado).toBe('jugando');
  expect(errores).toEqual([]);
});

test('el pozo no es refugio: si ella caza, baja por mi tramo hasta el descanso y me alcanza (nunca cambia de piso)', async ({ page }) => {
  test.setTimeout(180_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcarSilencioso('medido:402');
    ctx.progreso.marcarSilencioso('abierta:bajada');
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    ctx.director.bloquear(999);
    // Bajo hasta el descanso y me quedo quieto, en la esquina más lejana de la boca (sin cruzar al otro tramo).
    await P.caminar([[1.5, 10.45], [1.5, 11.2], [1.5, 12.7]], 0.15);
    // Ella sale de la pared del pasillo, junto a la boca, y caza.
    ctx.entidad.puedeManifestarse = true;
    ctx.entidad.manifestar(2.6 * 1.3, 10.4 * 1.3, ctx);
    ctx.entidad.cazar('paso', ctx);
    let masHonda = 0;
    const limite = performance.now() + 15_000;
    while (J.estado === 'jugando' && performance.now() < limite) {
      masHonda = Math.min(masHonda, ctx.entidad.posicion.y);
      await P.esperarReal(30);
    }
    return { estado: J.estado, piso: ctx.piso.id, masHonda };
  });
  expect(r.estado, 'me alcanzó en el descanso').toBe('muerte');
  expect(r.piso, 'nadie cambió de piso').toBe('piso4');
  expect(r.masHonda, 'bajó por el tramo (sus pies siguieron los escalones)').toBeLessThan(-1);
  expect(errores).toEqual([]);
});
