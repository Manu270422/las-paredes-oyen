// El ritmo del Piso 4 (propuesta P4-ritmo, después de la ronda 1), jugado de verdad y en orden:
// 1) al volver al pasillo después de la cinta del 401, ella se desprende del muro a 5–9 m, fuera de la vista, y
//    viene a escuchar; quieto y conteniendo el aire, el encuentro se supera y se va (nunca sale cazando);
// 2) medir el 403 la atrae aunque esté lejos: los rasguños se acercan y llega antes de que termine la medición;
// 3) medir el 402 es el clímax: sale del muro y se queda escuchando mientras corre la cinta, que la capta.
// Las pruebas comparten la página: cada una sigue donde terminó la anterior.
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

declare global {
  interface Window {
    /** Lo que pasó con la criatura y la cinta, anotado desde el bus para toda la sesión. */
    __ritmo?: Array<{ n: string; v: string; d: number; t: number }>;
  }
}

test.describe.serial('Ritmo del Piso 4', () => {
  test.setTimeout(300_000);
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
    await page.evaluate(() => {
      const { ctx } = window.__juego!;
      const E = ctx.entidad;
      const registro: NonNullable<Window['__ritmo']> = [];
      const anotar = (n: string, v: string) =>
        registro.push({ n, v, d: Math.round(E.distanciaAlJugador(ctx) * 100) / 100, t: Math.round(ctx.programador.ahora * 100) / 100 });
      ctx.bus.on('entidad-estado', (e) => anotar('estado', e.estado));
      ctx.bus.on('encuentro', (e) => anotar('encuentro', e.estado));
      ctx.bus.on('bandera', (b) => anotar('bandera', b.nombre));
      ctx.bus.on('grabacion-captada', (g) => anotar('cinta', `${g.apartamento}:${g.presencia}`));
      ctx.bus.on('sonido-relevante', (s) => anotar('oigo', s.descripcion));
      window.__ritmo = registro;
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('al volver al pasillo tras la cinta del 401, sale a escucharme y quieto se supera', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const E = ctx.entidad;
      const C = 1.3;
      const registro = window.__ritmo!;
      const abrir = async (id: string) => {
        const puerta = ctx.nivel.puertas.find((p) => p.id === id)!;
        const h = puerta.puntoInteraccion();
        P.mirarA(h.x, h.y, h.z);
        await P.esperarJuego(0.3);
        await P.pulsar('KeyE');
        const limite = performance.now() + 6000;
        while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
        await P.esperarJuego(0.8);
      };

      await P.caminar([[2.2, 9.5]]);
      P.mirarA(1.5 * C, 0.56, 8.6 * C);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      await P.esperarEstado('documento');
      await P.esperarReal(400);
      await P.pulsar('KeyE');
      await P.esperarEstado('jugando');
      // Que el director no lance eventos encima: aquí se prueba el guion.
      ctx.director.bloquear(999);

      await P.caminar([[3.6, 10.5], [7.5, 10.5]]);
      await abrir('p401');
      await P.caminar([[7.5, 9.5], [7.5, 7.6], [9.5, 7.25]], 0.18);
      const x = ctx.nivel.interactuables.find((i) => i.id === 'medir401')!.objeto.position;
      P.mirarA(x.x, 0, x.z);
      ctx.jugador.pitch = -1.2;
      await P.esperarJuego(0.3);
      P.sostener('KeyQ');
      await P.pulsar('KeyE');
      const inicio = ctx.programador.ahora;
      while (!ctx.progreso.tiene('medido:401') && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
      P.soltar('KeyQ');
      // La cinta: hasta que termine, no puede salir.
      const finCinta = performance.now() + 30_000;
      while (!E.puedeManifestarse && performance.now() < finCinta) await P.esperarReal(50);
      await P.esperarJuego(1);
      const antesDelPasillo = { estado: E.estado, bandera: ctx.progreso.tiene('encuentro_pasillo') };

      // Vuelvo al pasillo y me quedo quieto. Si se detiene a escucharme, contengo el aire.
      const desde = registro.length;
      await P.caminar([[7.5, 9.5], [7.5, 10.5]]);
      let alEncuentro: number | null = null;
      const fin = performance.now() + 40_000;
      while (performance.now() < fin && J.estado === 'jugando') {
        if (E.enEncuentro && alEncuentro === null) {
          alEncuentro = Math.round(ctx.jugador.respiracion.aire * 100) / 100;
          P.sostener('KeyQ');
        }
        if (registro.slice(desde).some((e) => e.n === 'encuentro' && e.v !== 'inicio')) break;
        await P.esperarReal(16);
      }
      P.soltar('KeyQ');
      await P.esperarJuego(2);
      return {
        antesDelPasillo,
        despues: registro.slice(desde).filter((e) => e.n !== 'oigo' || e.v.includes('pared')),
        alEncuentro,
        bandera: ctx.progreso.tiene('encuentro_pasillo'),
        habitacion: ctx.memoria.habitacionActual,
        vivo: J.estado === 'jugando',
      };
    });
    expect(r.antesDelPasillo, 'dentro del 401 no sale').toEqual({ estado: 'paredes', bandera: false });
    const salida = r.despues.find((e) => e.n === 'estado');
    expect(salida?.v, 'sale a investigar, nunca cazando').toBe('investigando');
    expect(salida?.d, 'sale a 5 m o más').toBeGreaterThanOrEqual(4.9);
    expect(salida?.d, 'y a 9 m o menos: se oye y llega pronto').toBeLessThanOrEqual(9.5);
    expect(r.despues.some((e) => e.n === 'oigo' && e.v === 'algo se desprende de la pared'), 'se oye salir').toBe(true);
    expect(r.bandera, 'el primer encuentro queda anotado (no se repite)').toBe(true);
    expect(r.alEncuentro, 'llega a escucharme con aire para aguantar').toBeGreaterThanOrEqual(0.8);
    expect(r.despues.some((e) => e.n === 'encuentro' && e.v === 'superado'), 'quieto y sin respirar, se supera').toBe(true);
    expect(r.despues.some((e) => e.v === 'cazando'), 'no hubo caza').toBe(false);
    expect(r.habitacion).toBe('pasillo');
    expect(r.vivo).toBe(true);
  });

  test('medir el 403 la atrae desde lejos: llega por el muro antes de que termine la medición', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const E = ctx.entidad;
      const C = 1.3;
      const abrir = async (id: string) => {
        const puerta = ctx.nivel.puertas.find((p) => p.id === id)!;
        const h = puerta.puntoInteraccion();
        P.mirarA(h.x, h.y, h.z);
        await P.esperarJuego(0.3);
        await P.pulsar('KeyE');
        const limite = performance.now() + 6000;
        while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
        await P.esperarJuego(0.8);
      };
      // Que termine de hundirse en el muro antes de seguir.
      const limiteMuro = performance.now() + 20_000;
      while (E.estado !== 'paredes' && performance.now() < limiteMuro) await P.esperarReal(50);

      await P.caminar([[12, 10.5], [16.5, 10.3], [18.2, 10.3], [20.5, 10.5]]);
      await abrir('p403');
      await P.caminar([[20.5, 8.5], [21.5, 7.25]], 0.18);
      // Está lejos, al otro lado del piso (en la escalera), y sin ruido reciente que la guíe.
      if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
      E.memoria.reiniciar();
      E.posicion.set(2.2 * C, 0, 10.5 * C);
      const distanciaInicial = Math.round(E.distanciaAlJugador(ctx) * 100) / 100;

      const x = ctx.nivel.interactuables.find((i) => i.id === 'medir403')!.objeto.position;
      P.mirarA(x.x, 0, x.z);
      ctx.jugador.pitch = -1.2;
      await P.esperarJuego(0.3);
      P.sostener('KeyQ');
      await P.pulsar('KeyE');
      const inicio = ctx.programador.ahora;
      let llegada: number | null = null;
      let rasgunos = 0;
      const quitar = ctx.bus.on('sonido-relevante', (s) => {
        if (s.descripcion.includes('acercándose')) rasgunos++;
      });
      while (!ctx.progreso.tiene('medido:403') && ctx.programador.ahora < inicio + 10 && J.estado === 'jugando') {
        if (llegada === null && E.estado === 'paredes' && E.distanciaAlJugador(ctx) <= 2.7) llegada = ctx.programador.ahora - inicio;
        await P.esperarReal(16);
      }
      P.soltar('KeyQ');
      quitar();
      return {
        distanciaInicial,
        llegada: llegada === null ? null : Math.round(llegada * 100) / 100,
        rasgunos,
        medido: ctx.progreso.tiene('medido:403'),
        vivo: J.estado === 'jugando',
      };
    });
    expect(r.distanciaInicial, 'empieza lejos (antes no llegaba en 6 s)').toBeGreaterThan(20);
    expect(r.llegada, 'llega al otro lado del muro antes de que termine la medición').not.toBeNull();
    expect(r.llegada!, 'en ~4 s').toBeLessThan(5.5);
    expect(r.rasgunos, 'los rasguños se acercan').toBeGreaterThanOrEqual(1);
    expect(r.medido, 'en el muro no mata: la medición se completa').toBe(true);
    expect(r.vivo).toBe(true);
  });

  test('medir el 402 es el clímax: sale a escuchar mientras corre la cinta y la cinta la capta', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const E = ctx.entidad;
      const registro = window.__ritmo!;
      // El camino a la llave lo prueba llave.spec.ts; aquí, con la luz restablecida y el apagón ya ocurrido.
      const limiteCinta = performance.now() + 30_000;
      while (!registro.some((e) => e.n === 'bandera' && e.v === 'medido:403') && performance.now() < limiteCinta) await P.esperarReal(50);
      await P.esperarJuego(12);
      ctx.director.bloquear(999);
      ctx.progreso.marcar('leyo:nota_escritorio');
      ctx.progreso.agregarObjeto('llave_402');
      ctx.progreso.marcar('tablero_activado');
      ctx.progreso.marcar('apagon_pasillo');
      // En el trayecto se queda en el muro (abrir la puerta suena): aquí se prueba la medición, no la caza.
      if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
      E.puedeManifestarse = false;

      const puerta = ctx.nivel.puertas.find((p) => p.id === 'p402')!;
      await P.caminar([[20.5, 7.25], [20.5, 8.5], [20.5, 10.5], [16.5, 10.3], [14.5, 10.5]]);
      const h = puerta.puntoInteraccion();
      P.mirarA(h.x, h.y, h.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      const limite = performance.now() + 10_000;
      while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(1);
      await P.caminar([[14.5, 12.5], [14.5, 13.8]], 0.18);

      E.memoria.reiniciar();
      if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
      const objetivo = ctx.progreso.objetivoActual()?.id ?? null;
      const desde = registro.length;
      const x = ctx.nivel.interactuables.find((i) => i.id === 'medir402')!.objeto.position;
      P.mirarA(x.x, 0, x.z);
      ctx.jugador.pitch = -1.2;
      await P.esperarJuego(0.3);
      P.sostener('KeyQ');
      await P.pulsar('KeyE');
      const fin = performance.now() + 20_000;
      while (!ctx.progreso.tiene('medido:402') && performance.now() < fin && J.estado === 'jugando') await P.esperarReal(16);
      P.soltar('KeyQ');
      const eventos = registro.slice(desde);
      return {
        eventos: eventos.filter((e) => e.n !== 'oigo'),
        objetivo,
        salio: eventos.find((e) => e.n === 'oigo' && e.v === 'algo sale de la pared, detrás') ?? null,
        medido: ctx.progreso.tiene('medido:402'),
        estado: J.estado,
      };
    });
    const t = (n: string, v: string) => r.eventos.find((e) => e.n === n && e.v === v)?.t ?? null;
    expect(r.objetivo, 'con la llave y la nota leída, toca medir el 402').toBe('medir402');
    expect(r.salio, 'se oye salir del muro, detrás').not.toBeNull();
    expect(r.eventos.find((e) => e.n === 'estado')?.v, 'sale a investigar, nunca cazando').toBe('investigando');
    expect(t('encuentro', 'inicio'), 'llega a escuchar').not.toBeNull();
    expect(t('encuentro', 'inicio')!, 'antes de que termine la cinta').toBeLessThan(t('bandera', 'medido:402')!);
    expect(r.eventos.some((e) => e.v === 'cazando'), 'quieto y sin respirar no hay caza').toBe(false);
    expect(r.eventos.some((e) => e.n === 'cinta' && e.v === '402:true'), 'la cinta del 402 la capta').toBe(true);
    expect(r.medido).toBe(true);
    expect(r.estado, 'no morí').not.toBe('muerte');
  });
});
