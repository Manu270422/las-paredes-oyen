// El guion y el final del Piso 3 (propuesta P3-guion), jugados de verdad y en orden:
// 1) bajo desde el Piso 4; con la libreta completa revienta la luz de la escalera; camino al dormitorio del 302,
//    grabo la pared del cuarto de Andrés con la X y suena su cinta;
// 2) al volver al pasillo ella espera entre la escalera y yo; iluminada, quieto y callado, se retira; llego a la
//    escalera a oscuras: tres golpes desde abajo y la pantalla "Piso 3 completado" con el Piso 2 por venir.
// La libreta se camina en libretaPiso3.spec.ts: aquí se marca leída para llegar rápido a lo nuevo.
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

test.describe.serial('Final del Piso 3', () => {
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
    await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const registro: string[] = [];
      ctx.bus.on('subtitulo', (s) => registro.push(s.texto));
      ctx.bus.on('sonido-relevante', (s) => registro.push(`oigo: ${s.descripcion}`));
      (window as unknown as { __subtitulos: string[] }).__subtitulos = registro;
      // El Piso 4 ya terminado y la reja abierta (lo prueban guion.spec y llaveEscalera.spec): bajo caminando.
      ctx.progreso.agregarObjeto('llave_escalera');
      ctx.progreso.marcarSilencioso('medido:402');
      ctx.progreso.marcarSilencioso('abierta:bajada');
      ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
      await P.caminar([[2.2, 9.5]]);
      const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
      P.mirarA(tramo.x, tramo.y, tramo.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      const limite = performance.now() + 20_000;
      while (!(J.estado === 'jugando' && ctx.piso.id === 'piso3') && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.3);
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('la libreta apaga la escalera; grabar la pared del cuarto de Andrés trae su cinta', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      // En el camino se queda en las paredes: aquí se prueba el guion, no su caza.
      ctx.director.bloquear(999);
      ctx.entidad.puedeManifestarse = false;
      if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
      const puerta = (id: string) => ctx.nivel.puertas.find((p) => p.id === id)!;
      const abrir = async (id: string) => {
        const h = puerta(id).puntoInteraccion();
        P.mirarA(h.x, h.y, h.z);
        await P.esperarJuego(0.3);
        await P.pulsar('KeyE');
        const fin = performance.now() + 8000;
        while (!puerta(id).abierta && performance.now() < fin) await P.esperarReal(30);
        await P.esperarJuego(0.8);
      };
      const luz = () => ctx.nivel.lamparas.find((l) => l.id === 'emergencia')!.estado;

      await P.esperarJuego(9);
      const golpesAlLlegar = subs.includes('oigo: tres golpes, despacio, lejos');
      const luzAntes = luz();
      for (const id of ['carta_admin_301', 'hoja_301', 'hoja_303', 'libreta_302']) ctx.progreso.registrarDocumento(id);
      await P.esperarJuego(4.5);
      const luzDespues = luz();
      const objetivoTrasLibreta = ctx.progreso.objetivoActual()?.id ?? null;

      // Al dormitorio del 302, caminando y abriendo sus puertas.
      await P.caminar([[3.6, 10.5], [7.6, 10.68], [9.4, 10.68], [10.6, 10.35], [13.6, 10.35], [14.5, 10.4]], 0.18);
      await abrir('p302');
      await P.caminar([[14.5, 11.5], [14.5, 12.6], [14.5, 15.3], [10.5, 15.4]], 0.18);
      await abrir('pDorm302');
      await P.caminar([[10.5, 16.5], [10.6, 17.3], [11.5, 17.3]], 0.18);
      const enDormitorio = ctx.memoria.habitacionActual;

      const x = ctx.nivel.interactuables.find((i) => i.id === 'medir302')!.objeto.position;
      P.mirarA(x.x, 0, x.z);
      ctx.jugador.pitch = -1.2;
      await P.esperarJuego(0.3);
      const enfocadoX = J.interaccion.enfocado?.id ?? null;
      P.sostener('KeyQ');
      await P.pulsar('KeyE');
      const inicio = ctx.programador.ahora;
      while (!ctx.progreso.tiene('medido:302') && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
      P.soltar('KeyQ');
      const fin = performance.now() + 30_000;
      while (!ctx.progreso.tiene('cinta:302') && performance.now() < fin) await P.esperarReal(50);
      return {
        golpesAlLlegar,
        luzAntes,
        luzDespues,
        objetivoTrasLibreta,
        enDormitorio,
        enfocadoX,
        medido: ctx.progreso.tiene('medido:302'),
        cinta: ctx.progreso.tiene('cinta:302'),
        nino: subs.some((s) => s.includes('Hoy mi mamá me midió')),
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
        estado: J.estado,
      };
    });
    expect(r.golpesAlLlegar, 'a los 8 s de llegar, tres golpes desde el 302').toBe(true);
    expect(r.luzAntes).toBe('encendida');
    expect(r.luzDespues, 'la libreta revienta la emergencia de la escalera').toBe('rota');
    expect(r.objetivoTrasLibreta).toBe('grabar');
    expect(r.enDormitorio).toBe('dormitorio302');
    expect(r.enfocadoX, 'la mirada cae sobre la X del dormitorio').toBe('medir302');
    expect(r.medido).toBe(true);
    expect(r.cinta).toBe(true);
    expect(r.nino, 'la cinta trae la voz de niño').toBe(true);
    expect(r.objetivo).toBe('huir');
    expect(r.estado).toBe('jugando');
  });

  test('en el pasillo espera; iluminada y quieto se retira; en la escalera, el final y la pantalla del Piso 3', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const E = ctx.entidad;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      const puerta = (id: string) => ctx.nivel.puertas.find((p) => p.id === id)!;
      if (!puerta('pDorm302').abierta || !puerta('p302').abierta) throw new Error('las puertas del 302 deberían seguir abiertas');

      await P.caminar([[10.6, 17.3], [10.5, 16.5], [10.5, 15.4], [14.5, 15.3], [14.5, 12.6], [14.5, 11.5], [14.5, 10.4]], 0.18);
      const limite = performance.now() + 5000;
      while (E.estado !== 'acechando' && performance.now() < limite) await P.esperarReal(30);
      const alSalir = { estado: E.estado, x: E.posicion.x / 1.3, distancia: Math.round(E.distanciaAlJugador(ctx) * 10) / 10 };

      // Quieto, la miro con la linterna encendida y no hago ruido.
      if (!ctx.linterna.encendida) await P.pulsar('KeyF');
      const estados: string[] = [];
      // Espero a que se hunda en la pared: en retirada todavía tiene cuerpo, y se aleja hacia la escalera.
      const finRetirada = performance.now() + 30_000;
      while (performance.now() < finRetirada && J.estado === 'jugando') {
        if (E.fisica) P.mirarA(E.posicion.x, 1.6, E.posicion.z);
        if (estados[estados.length - 1] !== E.estado) estados.push(E.estado ?? 'ninguno');
        if (E.estado === 'paredes') break;
        await P.esperarReal(16);
      }
      // Ya se fue: el camino a la escalera es la prueba del final, no de otra caza.
      E.puedeManifestarse = false;
      await P.esperarJuego(1);

      await P.caminar([[13.6, 10.35], [10.6, 10.35], [9.4, 10.68], [7.6, 10.68], [4.6, 10.5]], 0.18);
      P.sostener('KeyW');
      const finEscalera = performance.now() + 8000;
      while (!ctx.progreso.tiene('final:piso3') && performance.now() < finEscalera) await P.esperarReal(16);
      P.soltar('KeyW');
      const finPantalla = performance.now() + 25_000;
      while (J.estado !== 'fin' && performance.now() < finPantalla) await P.esperarReal(50);
      return {
        alSalir,
        estados,
        final: ctx.progreso.tiene('final:piso3'),
        golpesFinales: subs.some((s) => s.includes('Abajo, detrás de la reja')),
        estado: J.estado,
        titulo: document.querySelector('.fin__titulo')?.textContent ?? null,
        siguiente: document.querySelector('.fin__siguiente')?.textContent ?? null,
      };
    });
    expect(r.alSalir.estado, 'al salir al pasillo, ella espera acechando').toBe('acechando');
    expect(r.alSalir.x, 'hacia la escalera (al oeste de la puerta del 302)').toBeLessThan(11);
    expect(r.alSalir.distancia, 'a una distancia que se alcanza a ver').toBeGreaterThanOrEqual(4.5);
    expect(r.estados, 'iluminada y quieto, se retira (sin caza)').not.toContain('cazando');
    expect(r.estados, 'se retira y se hunde en la pared').toEqual(expect.arrayContaining(['retirada', 'paredes']));
    expect(r.final, 'en la escalera empieza el final').toBe(true);
    expect(r.golpesFinales, 'tres golpes desde abajo').toBe(true);
    expect(r.estado, 'la partida termina').toBe('fin');
    expect(r.titulo).toBe('Piso 3 completado');
    expect(r.siguiente ?? '').toContain('Piso 2');
  });
});
