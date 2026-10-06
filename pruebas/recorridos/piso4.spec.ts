// Recorrido real del Piso 4, en el juego de verdad y en orden:
// 1) escalera → leer la orden de trabajo (E) → puerta del 401 (E) → sala → medir (E + Q).
// 2) desde ahí, el caso de la telemetría del 2026-09-29: aguantar el aire hasta
//    jadear con la criatura en el muro. Debe salir a INVESTIGAR y el encuentro
//    debe poder superarse (antes salía cazando a 3.5 m y mataba en 1.3 s).
// 3) toda caza avisa antes de lanzarse.
// Las pruebas comparten la página: cada una sigue donde terminó la anterior,
// así el jugador llega caminando a cada situación.
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

test.describe.serial('Piso 4 caminando', () => {
  let page: Page;
  const errores: string[] = [];

  test.beforeAll(async ({ browser }, info) => {
    const contexto = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1280, height: 720 } });
    page = await contexto.newPage();
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
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('escalera → orden de trabajo → puerta del 401 con E → medir', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const C = 1.3;

      // La orden de trabajo, sobre la caja de la escalera.
      await P.caminar([[2.2, 9.5]]);
      P.mirarA(1.5 * C, 0.56, 8.6 * C);
      await P.esperarJuego(0.3);
      const enfocadoOrden = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');
      await P.esperarEstado('documento');
      await P.esperarReal(400);
      await P.pulsar('KeyE');
      await P.esperarEstado('jugando');
      const leyo = ctx.progreso.tiene('leyo:orden_trabajo');

      // Por el pasillo hasta la puerta del 401, cerrada: se abre con E.
      await P.caminar([[3.6, 10.5], [7.5, 10.5]]);
      const puerta = ctx.nivel.puertas.find((p) => p.id === 'p401')!;
      const hoja = puerta.puntoInteraccion();
      P.mirarA(hoja.x, hoja.y, hoja.z);
      await P.esperarJuego(0.3);
      const enfocadoPuerta = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');
      const limite = performance.now() + 5000;
      while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
      const abierta = puerta.abierta;
      await P.esperarJuego(0.8);

      // Adentro, rodeando el sofá, hasta la X de medición.
      await P.caminar([[7.5, 9.5], [7.5, 7.6], [9.5, 7.25]], 0.18);
      const habitacion = ctx.memoria.habitacionActual;
      P.mirarA(9.5 * C, 0, 7.2 * C);
      J.ctx.jugador.pitch = -1.2;
      await P.esperarJuego(0.3);
      const enfocadoX = J.interaccion.enfocado?.id ?? null;

      // Medir: E y contener el aire hasta que termine.
      P.sostener('KeyQ');
      await P.pulsar('KeyE');
      await P.esperarJuego(0.2);
      const empezo = ctx.grabadora.midiendo !== null;
      const inicio = ctx.programador.ahora;
      while (!ctx.progreso.tiene('medido:401') && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
      P.soltar('KeyQ');
      const medido = ctx.progreso.tiene('medido:401');

      // La cinta del 401 termina y la criatura queda "despierta".
      const finCinta = performance.now() + 25_000;
      while (!ctx.entidad.puedeManifestarse && performance.now() < finCinta) await P.esperarReal(50);
      return {
        enfocadoOrden,
        leyo,
        enfocadoPuerta,
        abierta,
        habitacion,
        enfocadoX,
        empezo,
        medido,
        despierta: ctx.entidad.puedeManifestarse,
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
        estado: J.estado,
      };
    });
    expect(r).toEqual({
      enfocadoOrden: 'docOrden',
      leyo: true,
      enfocadoPuerta: 'p401',
      abierta: true,
      habitacion: 'sala401',
      enfocadoX: 'medir401',
      empezo: true,
      medido: true,
      despierta: true,
      objetivo: 'medir403',
      estado: 'jugando',
    });
  });

  test('aguantar el aire hasta jadear con la criatura en el muro: sale a investigar y el encuentro se puede superar', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const E = ctx.entidad;
      const D = ctx.director;
      const registro: Array<{ n: string; v: string; d: number }> = [];
      const anotar = (n: string, v: string) => registro.push({ n, v, d: Math.round(E.distanciaAlJugador(ctx) * 100) / 100 });
      const quitar = [
        ctx.bus.on('entidad-estado', (e) => anotar('estado', e.estado)),
        ctx.bus.on('encuentro', (e) => anotar('encuentro', e.estado)),
        ctx.bus.on('ruido', (x) => {
          if (x.causa === 'jadeo') anotar('ruido', 'jadeo');
        }),
      ];
      // La situación de las dos muertes: ventana de aparición abierta, criatura en el muro a ~3 m.
      D.bloquear(999);
      E.solicitudAcecho = false;
      if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
      E.memoria.reiniciar();
      D.forzarFase('acumulacion', ctx);
      D['tiempoFase'] = 40;
      const p = ctx.jugador.posicion;
      const respiracion = ctx.jugador.respiracion;

      // Aguanto Q hasta que se me acaba el aire (jadeo forzado) y la suelto, como haría una persona.
      P.sostener('KeyQ');
      const limite = performance.now() + 25_000;
      while (!registro.some((x) => x.v === 'jadeo') && performance.now() < limite) {
        if (E.estado === 'paredes') E.posicion.set(p.x + 2.2, 0, p.z - 2);
        await P.esperarReal(16);
      }
      P.soltar('KeyQ');

      // Si se detiene a escucharme, contengo el aire.
      let alEncuentro: { aire: number } | null = null;
      const fin = performance.now() + 30_000;
      while (performance.now() < fin && J.estado === 'jugando') {
        if (E.enEncuentro && !alEncuentro) {
          alEncuentro = { aire: Math.round(respiracion.aire * 100) / 100 };
          P.sostener('KeyQ');
        }
        if (registro.some((x) => x.n === 'encuentro' && x.v !== 'inicio')) break;
        await P.esperarReal(16);
      }
      P.soltar('KeyQ');
      await P.esperarJuego(1);
      for (const q of quitar) q();
      return { registro, alEncuentro, vivo: J.estado === 'jugando' };
    });

    const salida = r.registro.find((x) => x.n === 'estado');
    expect(salida?.v, 'al jadear, la criatura sale a investigar (nunca cazando)').toBe('investigando');
    expect(salida?.d, 'sale del muro a 5 m o más').toBeGreaterThanOrEqual(4.9);
    expect(r.registro.some((x) => x.v === 'cazando'), 'no hubo caza').toBe(false);
    expect(r.alEncuentro?.aire, 'llega al encuentro con aire suficiente').toBeGreaterThanOrEqual(0.85);
    expect(r.registro.some((x) => x.n === 'encuentro' && x.v === 'superado')).toBe(true);
    expect(r.vivo).toBe(true);
  });

  test('toda caza avisa antes de lanzarse (0.8 s quieta) y no atrapa en menos de 1.6 s desde 4 m', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const E = ctx.entidad;
      const rejilla = ctx.nivel.rejilla;
      const p = ctx.jugador.posicion;
      let punto: { x: number; z: number } | null = null;
      for (const [dx, dz] of [[0, -4], [-4, 0], [4, 0], [0, 4], [-2.83, -2.83], [2.83, -2.83], [-2.83, 2.83], [2.83, 2.83]]) {
        const x = p.x + dx;
        const z = p.z + dz;
        if (rejilla.esTransitable(rejilla.aCelda(x), rejilla.aCelda(z)) && rejilla.hayLineaDeVision(p.x, p.z, x, z, () => false)) {
          punto = { x, z };
          break;
        }
      }
      if (!punto) return null;
      E.manifestar(punto.x, punto.z, ctx);
      E.cazar('jadeo', ctx);
      const t0 = ctx.programador.ahora;
      let corre: number | null = null;
      const limite = performance.now() + 10_000;
      while (J.estado === 'jugando' && performance.now() < limite) {
        if (corre === null && E.velocidadActual > 0) corre = ctx.programador.ahora - t0;
        await P.esperarReal(8);
      }
      return { corre, atrapa: ctx.programador.ahora - t0, estado: J.estado };
    });
    expect(r, 'hay un punto libre a 4 m con línea de visión').not.toBeNull();
    expect(r!.estado).toBe('muerte');
    expect(r!.corre ?? 0).toBeGreaterThanOrEqual(0.75);
    expect(r!.atrapa).toBeGreaterThanOrEqual(1.6);
  });
});
