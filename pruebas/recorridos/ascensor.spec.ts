// El ascensor (C2 §3), jugado como una persona en el juego real. En el Piso 4 está muerto hasta abrir la reja de
// la escalera (la primera bajada es por la escalera; la llave sola no basta); al abrirla se pone en marcha solo. Lo llamo, entro caminando, pulso "Bajar al Piso 3" en el panel y
// viajo: las puertas se cierran, la cabina vibra y a mitad del viaje el piso cambia SIN NEGRO (la cabina es la
// misma). Llego al Piso 3 en el mismo punto de la cabina, mirando hacia donde miraba, salgo caminando y vuelvo a
// subir. La otra prueba: con las puertas abiertas la cabina no es un refugio (ella entra y me alcanza).
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';

declare global {
  interface Window {
    /** Pulso un botón del ascensor (el de llamar o uno del panel) mirándolo y con E, como una persona. */
    __pulsarAscensor?: (cual: 'llamar' | 'panel') => Promise<{ enfocado: string | null; texto: string | null }>;
    /** Espero, en tiempo real, a que el ascensor llegue a una fase (aunque en medio el piso cambie). */
    __esperarFase?: (fase: string, ms: number) => Promise<{ piso: string; negroMs: number; opacidadMaxima: number }>;
  }
}

async function instalarAyudas(page: Page): Promise<void> {
  await page.evaluate(() => {
    const J = window.__juego!;
    window.__pulsarAscensor = async (cual) => {
      const { ctx } = J;
      const P = window.__piloto!;
      const ascensor = ctx.nivel.ascensor!;
      const boton = cual === 'llamar' ? ascensor.botones[0] : ascensor.botones[1];
      const p = boton.objeto.position;
      P.mirarA(p.x, p.y, p.z);
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado;
      const r = { enfocado: enfocado?.id ?? null, texto: enfocado ? enfocado.texto(ctx) : null };
      await P.pulsar('KeyE');
      await P.esperarJuego(0.2);
      return r;
    };
    window.__esperarFase = async (fase, ms) => {
      const fundido = document.querySelector('.fundido') as HTMLElement;
      const limite = performance.now() + ms;
      let negroMs = 0;
      let opacidadMaxima = 0;
      let antes = performance.now();
      for (;;) {
        const ahora = performance.now();
        if (J.estado === 'viaje') negroMs += ahora - antes;
        antes = ahora;
        opacidadMaxima = Math.max(opacidadMaxima, Number(getComputedStyle(fundido).opacity));
        if (J.estado === 'jugando' && J.ctx.nivel.ascensor?.fase === fase) break;
        if (ahora > limite) throw new Error(`El ascensor no llegó a "${fase}": está en "${J.ctx.nivel.ascensor?.fase}" (${J.ctx.piso.id}, ${J.estado}).`);
        await new Promise((r) => setTimeout(r, 16));
      }
      return { piso: J.ctx.piso.id, negroMs: Math.round(negroMs), opacidadMaxima };
    };
  });
}

/** Sin director ni criatura: lo que se prueba aquí es el ascensor (la criatura tiene su propia prueba abajo). */
async function calmar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { ctx } = window.__juego!;
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
  });
}

test('el ascensor: muerto hasta abrir la reja (la llave sola no basta), viene solo y bajo al Piso 3 sin negro; salgo caminando y vuelvo a subir', async ({ page }, info) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  const captura = (nombre: string) => page.screenshot({ path: info.outputPath(`${nombre}.png`) });
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await instalarAyudas(page);
  await calmar(page);

  // Muerto: el botón no hace nada (y lo dice).
  const muerto = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    if (!ctx.linterna.encendida) await P.pulsar('KeyF');
    await P.caminar([[4.4, 10.5], [5.3, 10.45]]);
    const pulsado = await window.__pulsarAscensor!('llamar');
    return { ...pulsado, fase: ctx.nivel.ascensor!.fase };
  });
  expect(muerto.texto).toBe('Llamar al ascensor');
  expect(muerto.fase, 'con la reja de la escalera cerrada, el ascensor no responde').toBe('muerto');
  await captura('1-muerto');

  // La llave sola no lo despierta: la primera bajada es por la escalera.
  const conLlave = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    ctx.progreso.agregarObjeto('llave_escalera');
    await window.__pulsarAscensor!('llamar');
    return ctx.nivel.ascensor!.fase;
  });
  expect(conLlave, 'con la llave pero la reja cerrada, sigue muerto').toBe('muerto');

  // Abro el candado de la reja caminando, como una persona: al abrirse, el ascensor se pone en marcha solo, zumba un
  // rato y llega con la campanilla.
  const reja = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    await P.caminar([[2.4, 10.45]]);
    const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
    P.mirarA(tramo.x, tramo.y, tramo.z);
    await P.esperarJuego(0.3);
    const texto = J.interaccion.enfocado ? J.interaccion.enfocado.texto(ctx) : null;
    await P.pulsar('KeyE');
    return texto;
  });
  expect(reja).toBe('Abrir el candado');
  const llegada = await page.evaluate(() => window.__esperarFase!('abierto', 40_000));
  expect(llegada.piso).toBe('piso4');
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    await window.__piloto!.caminar([[5.3, 10.45]]);
    const c = ctx.nivel.ascensor!.marco;
    window.__piloto!.mirarA(c.cx, 1.5, c.cz);
    await window.__piloto!.esperarJuego(0.4);
  });
  await captura('2-abierto-desde-el-pasillo');

  // Entro caminando y bajo con el panel.
  const adentro = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    await window.__piloto!.caminar([[5.5, 10.6], [5.5, 11.45]], 0.12);
    const pulsado = await window.__pulsarAscensor!('panel');
    const a = ctx.nivel.ascensor!;
    return { ...pulsado, dentro: a.adentro(ctx), fase: a.fase };
  });
  expect(adentro.dentro, 'entré a la cabina caminando (las puertas no estorban)').toBe(true);
  expect(adentro.texto).toBe('Bajar al Piso 3');
  expect(adentro.fase).toBe('cerrando');
  await captura('3-adentro-el-panel');

  const antesDelCambio = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    await window.__esperarFase!('viajando', 5_000);
    // Miro las puertas cerradas mientras viajo (se puede mirar alrededor).
    const c = ctx.nivel.ascensor!.marco;
    window.__piloto!.mirarA(c.cx, 1.6, c.cz - 2);
    await window.__piloto!.esperarJuego(0.6);
    const j = ctx.jugador;
    return { x: j.posicion.x, z: j.posicion.z, yaw: j.yaw, trauma: j.efectos.trauma };
  });
  expect(antesDelCambio.trauma, 'la cabina vibra').toBeGreaterThan(0.25);
  await captura('4-viajando');

  const viaje = await page.evaluate(() => window.__esperarFase!('abierto', 20_000));
  expect(viaje.piso, 'llegué al Piso 3 en ascensor').toBe('piso3');
  expect(viaje.opacidadMaxima, 'sin negro: la pantalla nunca se fundió').toBeLessThan(0.05);
  // El cambio es armar el piso (en este navegador sin GPU, todo por software, ~0.5–1.5 s; con GPU, mucho menos).
  expect(viaje.negroMs, 'el cambio de piso es un tirón, no un viaje a oscuras').toBeLessThan(2000);
  const enPiso3 = await page.evaluate(async (prefijo) => {
    const { ctx } = window.__juego!;
    const j = ctx.jugador;
    return {
      dentro: ctx.nivel.ascensor!.adentro(ctx),
      x: j.posicion.x,
      z: j.posicion.z,
      y: j.posicion.y,
      yaw: j.yaw,
      llego: ctx.progreso.tiene('llego:piso3'),
      guardada: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null'),
    };
  }, 'las-paredes-oyen:');
  expect(enPiso3.dentro, 'sigo dentro de la cabina (la del Piso 3)').toBe(true);
  expect(enPiso3.x).toBeCloseTo(antesDelCambio.x, 1);
  expect(enPiso3.z).toBeCloseTo(antesDelCambio.z, 1);
  expect(enPiso3.y).toBeCloseTo(0, 2);
  expect(enPiso3.yaw, 'mirando hacia donde miraba').toBeCloseTo(antesDelCambio.yaw, 1);
  expect(enPiso3.llego).toBe(true);
  expect(enPiso3.guardada?.piso, 'llegar en ascensor también guarda').toBe('piso3');
  await captura('5-llegue-al-piso-3');

  // Salgo caminando al pasillo del Piso 3 y vuelvo a entrar para subir.
  const vuelta = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    await P.caminar([[5.5, 10.5], [4.4, 10.5]]);
    const enPasillo = ctx.memoria.habitacionActual;
    await P.caminar([[5.5, 10.5], [5.5, 11.45]], 0.12);
    const pulsado = await window.__pulsarAscensor!('panel');
    return { enPasillo, ...pulsado };
  });
  expect(vuelta.enPasillo).toBe('pasillo');
  expect(vuelta.texto).toBe('Subir al Piso 4');
  const subida = await page.evaluate(() => window.__esperarFase!('abierto', 25_000));
  expect(subida.piso).toBe('piso4');
  expect(subida.opacidadMaxima).toBeLessThan(0.05);
  const final = await page.evaluate(async () => {
    const J = window.__juego!;
    await window.__piloto!.caminar([[5.5, 10.5], [4.4, 10.5]]);
    return { estado: J.estado, piso: J.ctx.piso.id };
  });
  expect(final).toEqual({ estado: 'jugando', piso: 'piso4' });
  expect(errores).toEqual([]);
});

test('con las puertas abiertas la cabina no es refugio: si ella caza, entra y me alcanza', async ({ page }) => {
  test.setTimeout(180_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);
  await instalarAyudas(page);
  await calmar(page);
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcar('abierta:bajada');
    await window.__esperarFase!('abierto', 20_000);
    await window.__piloto!.caminar([[4.4, 10.5], [5.5, 10.6], [5.5, 11.6]], 0.12);
  });
  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    // Ella sale de la pared del pasillo, unas celdas al este, y caza.
    ctx.entidad.puedeManifestarse = true;
    ctx.entidad.manifestar(9.5 * 1.3, 10.5 * 1.3, ctx);
    ctx.entidad.cazar('paso', ctx);
    const limite = performance.now() + 20_000;
    while (J.estado === 'jugando' && performance.now() < limite) await P.esperarReal(30);
    return { estado: J.estado, fase: ctx.nivel.ascensor?.fase ?? null };
  });
  expect(r.estado, 'me alcanzó dentro de la cabina abierta').toBe('muerte');
  expect(errores).toEqual([]);
});
