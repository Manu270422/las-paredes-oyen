// El cuarto sordo del Piso 2 (P2-guion, tanda 2), en el juego real y caminando:
// 1) el mismo ruido mío: hecho en el pasillo, ella lo oye desde el muro; hecho en la sala del 202, no;
// 2) un rasguño en el muro: desde el pasillo suena (y sale su subtítulo); desde la sala, apenas un golpe sordo y sin
//    subtítulo (lo que no se oye tampoco se escribe);
// 3) grabar en el 202 no la atrae: no hay rasguños que se acerquen mientras mido;
// 4) no es refugio: si me quedo adentro, al rato sale AFUERA (nunca de un muro acolchado) y entra caminando por la
//    puerta; con ella cerca, la lámpara de la sala y la linterna parpadean (lo único que la delata).
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { bajarAlPiso2, calmar, instalarAyudas } from './ayudasPiso2';

/** En la sala del 202, junto a la X. */
const EN_LA_SALA: readonly [number, number] = [12.5, 13.2];
/** El muro entre el pasillo y la sala del 202 (una celda de muro): ahí la pongo, dentro de la pared. */
const EN_EL_MURO = { x: 12.5, y: 11.5 };

test.describe.serial('El cuarto sordo', () => {
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
    await abrirEleccion(page);
    await elegirYEmpezar(page, 'Normal');
    await esperarJugando(page);
    await instalarAyudas(page);
    expect(await bajarAlPiso2(page)).toBe('piso2');
    await calmar(page);
    await page.evaluate(() => {
      const { ctx } = window.__juego!;
      ctx.ajustes.cambiar('subtitulosEfectos', true);
      const relevantes: string[] = [];
      ctx.bus.on('sonido-relevante', (s) => relevantes.push(s.descripcion));
      (window as unknown as { __relevantes: string[] }).__relevantes = relevantes;
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('ella no oye a través de los colchones, y yo tampoco a ella (ni sus subtítulos)', async () => {
    const r = await page.evaluate(
      async ({ muro, sala }) => {
        const J = window.__juego!;
        const { ctx } = J;
        const P = window.__piloto!;
        const C = 1.3;
        const E = ctx.entidad;
        const memoria = E.memoria as unknown as { ultimoRuido: unknown };
        /** La pongo en el muro y hago un ruido mío en (x, y): ¿lo oyó? */
        const oye = (x: number, y: number) => {
          E.posicion.x = muro.x * C;
          E.posicion.z = muro.y * C;
          memoria.ultimoRuido = null;
          ctx.bus.emit('ruido', { x: x * C, z: y * C, intensidad: 0.9, origen: 'jugador', causa: 'carrera' });
          return memoria.ultimoRuido !== null;
        };
        /** Suena un rasguño en el muro: lo que llega al oído (ganancia y corte del filtro) y si salió su subtítulo. */
        const rasguno = async (descripcion: string) => {
          const fuente = ctx.audio.reproducir('rasguno', { bus: 'entidad', posicion: { x: muro.x * C, y: 1.4, z: muro.y * C }, dentroPared: true, volumen: 1 });
          ctx.bus.emit('sonido-relevante', { descripcion, x: muro.x * C, z: muro.y * C });
          await P.esperarReal(450);
          const interna = fuente as unknown as { ganancia: GainNode; filtro: BiquadFilterNode };
          const subtitulos = document.querySelector('.subtitulos')?.textContent ?? '';
          const r = { ganancia: interna.ganancia.gain.value, corte: interna.filtro.frequency.value, subtitulo: subtitulos.includes(descripcion) };
          fuente?.detener(0.05);
          return r;
        };

        await P.caminar([[3.6, 10.5], [12.5, 10.5]], 0.18);
        const pasillo = { oye: oye(12.5, 10.5), ...(await rasguno('prueba desde el pasillo')) };
        await P.caminar([[13.6, 10.4], [14.5, 10.4]], 0.18);
        await window.__abrirPuerta!('p202');
        await P.caminar([[14.5, 11.5], [14.5, 12.6], sala], 0.18);
        await P.esperarJuego(1);
        const adentro = { oye: oye(sala[0], sala[1]), ...(await rasguno('prueba desde la sala')), cuarto: ctx.memoria.habitacionActual };
        return { pasillo, adentro };
      },
      { muro: EN_EL_MURO, sala: EN_LA_SALA },
    );
    expect(r.adentro.cuarto).toBe('sala202');
    expect(r.pasillo.oye, 'en el pasillo, el muro le lleva mi ruido').toBe(true);
    expect(r.adentro.oye, 'el mismo ruido en la sala acolchada no le llega').toBe(false);
    expect(r.pasillo.subtitulo, 'en el pasillo, el rasguño sale escrito').toBe(true);
    expect(r.adentro.subtitulo, 'adentro no se oye: tampoco se escribe').toBe(false);
    expect(r.adentro.ganancia, 'adentro llega muchísimo más bajo').toBeLessThan(r.pasillo.ganancia * 0.1);
    expect(r.adentro.corte, 'y solo lo más grave').toBeLessThanOrEqual(200);
  });

  test('grabar el cuarto sordo no la atrae: no hay rasguños que se acerquen', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const relevantes = (window as unknown as { __relevantes: string[] }).__relevantes;
      ctx.progreso.marcarSilencioso('leyo:libro_quejas');
      ctx.entidad.cambiarEstado('paredes', ctx);
      ctx.entidad.puedeManifestarse = true;
      await P.caminar([[13.5, 12.9]], 0.15);
      const antes = relevantes.length;
      P.sostener('KeyQ');
      const texto = await window.__usar!('medir202', -1.2);
      const inicio = ctx.programador.ahora;
      while (!ctx.progreso.tiene('medido:202') && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
      P.soltar('KeyQ');
      ctx.entidad.puedeManifestarse = false;
      const durante = relevantes.slice(antes);
      return { texto, medido: ctx.progreso.tiene('medido:202'), acercandose: durante.filter((d) => d.includes('acercándose')).length };
    });
    expect(r.texto).toBe('Grabar el cuarto sordo (quédate quieto)');
    expect(r.medido).toBe(true);
    expect(r.acercandose, 'en el 202, medir no la atrae').toBe(0);
  });

  test('no es refugio: si me quedo, sale afuera y entra caminando por la puerta; las luces la delatan', async ({}, info) => {
    /** ¿El lienzo sigue dibujando? (si el navegador pierde el contexto de WebGL, la imagen queda en blanco). */
    const contextoPerdido = () =>
      page.evaluate(() => (document.querySelector('canvas')?.getContext('webgl2') as WebGL2RenderingContext | null)?.isContextLost() ?? null);
    // Espero a que termine la cinta (la grabadora suena en la sala) y me quedo quieto mirando la puerta.
    await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      const P = window.__piloto!;
      const finCinta = performance.now() + 30_000;
      while (!ctx.progreso.tiene('cinta:202') && performance.now() < finCinta) await P.esperarReal(50);
      await P.caminar([[12.4, 14.4]], 0.15);
      if (!ctx.linterna.encendida) await P.pulsar('KeyF');
      P.mirarA(14.5 * 1.3, 1.4, 11.5 * 1.3);
      await P.esperarJuego(0.6);
    });
    await page.screenshot({ path: info.outputPath('1-la-sala-acolchada.png') });
    const perdidoAntes = await contextoPerdido();
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const C = 1.3;
      const E = ctx.entidad;
      // Ella en las paredes (desde cero), con permiso para salir. El director en su pico, pero sin el acecho por la
      // espalda que pide al empezarlo: aquí se prueba solo la regla del cuarto sordo.
      // Sin recuerdos de ruidos de las pruebas anteriores (si no, sale a investigar eso, con razón).
      E.memoria.ultimoRuido = null;
      E.memoria.sospecha = 0;
      E.cambiarEstado('paredes', ctx);
      E.puedeManifestarse = true;
      ctx.director.forzarFase('pico', ctx);
      E.solicitudAcecho = false;
      const inicio = ctx.programador.ahora;
      const limiteSalida = performance.now() + 90_000;
      while (!E.fisica && performance.now() < limiteSalida) {
        E.solicitudAcecho = false;
        await P.esperarReal(50);
      }
      const salio = {
        tras: ctx.programador.ahora - inicio,
        x: E.posicion.x / C,
        y: E.posicion.z / C,
        enAcolchado: ctx.nivel.acolchadoEn(E.posicion.x, E.posicion.z),
        estado: E.estado,
      };
      // La sigo hasta que entra a la sala, anotando por dónde pasa y cómo parpadean las luces.
      const lampara = ctx.nivel.lamparas.find((l) => l.id === 'lampara202')!;
      let lamparaMin = 1;
      let linternaMin = 1;
      let porLaPuerta = false;
      let enMuroConCuerpo = false;
      const limiteEntrada = performance.now() + 60_000;
      while (performance.now() < limiteEntrada && E.fisica) {
        const gx = Math.floor(E.posicion.x / C);
        const gy = Math.floor(E.posicion.z / C);
        if (gx === 14 && gy === 11) porLaPuerta = true;
        if (ctx.nivel.rejilla.esMuro(gx, gy)) enMuroConCuerpo = true;
        if (E.distanciaAlJugador(ctx) < 7) lamparaMin = Math.min(lamparaMin, lampara.factor);
        if (E.distanciaAlJugador(ctx) < 9) linternaMin = Math.min(linternaMin, ctx.linterna.factor);
        if (ctx.nivel.acolchadoEn(E.posicion.x, E.posicion.z) && E.distanciaAlJugador(ctx) < 6) break;
        await P.esperarReal(30);
      }
      const adentro = ctx.nivel.acolchadoEn(E.posicion.x, E.posicion.z);
      E.puedeManifestarse = false;
      return { salio, adentro, porLaPuerta, enMuroConCuerpo, lamparaMin, linternaMin, estado: J.estado };
    });
    await page.screenshot({ path: info.outputPath('2-ella-en-la-sala.png') });
    const perdidoDespues = await contextoPerdido();
    // Termina la prueba: ella vuelve a las paredes antes de que llegue el encuentro.
    await page.evaluate(() => window.__juego!.ctx.entidad.cambiarEstado('paredes', window.__juego!.ctx));
    expect(perdidoAntes, 'el lienzo dibuja (contexto de WebGL vivo) antes').toBe(false);
    expect(perdidoDespues, 'y con ella adentro').toBe(false);
    expect(r.salio.estado, 'sale a buscar, no a cazar').toBe('investigando');
    expect(r.salio.tras, 'no antes de que me haya quedado un rato').toBeGreaterThanOrEqual(25);
    expect(r.salio.enAcolchado, 'no sale de un muro acolchado').toBe(false);
    expect(r.adentro, 'entra caminando a la sala').toBe(true);
    expect(r.porLaPuerta, 'por la puerta del 202').toBe(true);
    expect(r.enMuroConCuerpo, 'con cuerpo nunca atraviesa un muro').toBe(false);
    expect(r.lamparaMin, 'la lámpara de la sala parpadea con ella cerca').toBeLessThan(0.8);
    expect(r.linternaMin, 'y la linterna').toBeLessThan(0.8);
    expect(r.estado).toBe('jugando');
  });
});
