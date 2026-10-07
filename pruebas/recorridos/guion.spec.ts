// El guion del Piso 4 (src/pisos/piso4/guion.ts) jugado de verdad, en orden:
// 1) leer la orden pone a trabajar al director (regla `directorDesde`); medir el 401 reproduce su cinta y
//    despierta a la criatura; se camina al 403, se abre con E, se mide y su cinta revela la imitación completa;
// 2) con la luz de vuelta, al entrar al pasillo las lámparas revientan una a una y ella aparece al fondo;
// 3) medir el 402 dispara la secuencia final y el jugador despierta en la escalera sin nada en la mano: sin
//    pantalla de fin, el edificio a oscuras, el perfil recordando el piso, y la llave de la reja cayendo en el
//    402 (la busca llaveEscalera.spec.ts).
// La criatura se mantiene en las paredes durante los trayectos: aquí se prueba el guion, no su caza
// (eso lo cubren piso4.spec y director.spec).
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

test.describe.serial('Guion del Piso 4 jugado', () => {
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
    // Registro de subtítulos para toda la sesión.
    await page.evaluate(() => {
      const registro: string[] = [];
      window.__juego!.ctx.bus.on('subtitulo', (s) => registro.push(s.texto));
      (window as unknown as { __subtitulos: string[] }).__subtitulos = registro;
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('orden de trabajo → director activo → 401 y su cinta → caminar al 403 → medirlo y su cinta', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const C = 1.3;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      const salida: Record<string, unknown> = {};
      const medir = async (bandera: string, idX: string) => {
        // Mirar la X de verdad (como haría una persona) y luego hacia abajo, sobre ella.
        const x = ctx.nivel.interactuables.find((i) => i.id === idX)!.objeto.position;
        P.mirarA(x.x, 0, x.z);
        ctx.jugador.pitch = -1.2;
        await P.esperarJuego(0.3);
        salida[`enfocado_${idX}`] = J.interaccion.enfocado?.id ?? null;
        P.sostener('KeyQ');
        await P.pulsar('KeyE');
        const inicio = ctx.programador.ahora;
        while (!ctx.progreso.tiene(bandera) && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
        P.soltar('KeyQ');
      };
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

      salida.directorAntes = ctx.director.activo;
      await P.caminar([[2.2, 9.5]]);
      P.mirarA(1.5 * C, 0.56, 8.6 * C);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      await P.esperarEstado('documento');
      await P.esperarReal(400);
      await P.pulsar('KeyE');
      await P.esperarEstado('jugando');
      salida.directorTrasLeer = ctx.director.activo;

      // El 401: medir y escuchar su cinta.
      await P.caminar([[3.6, 10.5], [7.5, 10.5]]);
      await abrir('p401');
      await P.caminar([[7.5, 9.5], [7.5, 7.6], [9.5, 7.25]], 0.18);
      await medir('medido:401', 'medir401');
      salida.medido401 = ctx.progreso.tiene('medido:401');
      const finCinta = performance.now() + 25_000;
      while (!ctx.progreso.criaturaDespierta || !ctx.entidad.puedeManifestarse) {
        if (performance.now() > finCinta) break;
        await P.esperarReal(50);
      }
      salida.cinta401 = subs.some((s) => s.includes('Reproduces la medición del 401'));
      salida.despierta = ctx.entidad.puedeManifestarse;
      // Mientras camino, que se quede en las paredes: esta prueba es del guion.
      await P.esperarJuego(2);
      ctx.entidad.puedeManifestarse = false;
      ctx.director.bloquear(999);

      // Del 401 al 403, caminando.
      await P.caminar([[7.5, 7.6], [7.5, 9.5], [7.5, 10.5], [12, 10.5], [16.5, 10.3], [18.2, 10.3], [20.5, 10.5]]);
      await abrir('p403');
      await P.caminar([[20.5, 8.5], [21.5, 7.25]], 0.18);
      await medir('medido:403', 'medir403');
      salida.medido403 = ctx.progreso.tiene('medido:403');
      const finCinta403 = performance.now() + 25_000;
      while (!subs.some((s) => s.includes('Reproduces la medición del 403')) && performance.now() < finCinta403) await P.esperarReal(50);
      await P.esperarJuego(9);
      salida.cinta403 = subs.some((s) => s.includes('Reproduces la medición del 403'));
      salida.imitacionCompleta = ctx.progreso.imitacionCompleta;
      salida.objetivo = ctx.progreso.objetivoActual()?.id ?? null;
      salida.habitacion = ctx.memoria.habitacionActual;
      salida.estado = J.estado;
      return salida;
    });
    expect(r.directorAntes, 'antes de leer la orden, el director no trabaja').toBe(false);
    expect(r.directorTrasLeer, 'leer la orden pone a trabajar al director (regla directorDesde)').toBe(true);
    expect(r.enfocado_medir401, 'la mirada cae sobre la X del 401').toBe('medir401');
    expect(r.medido401, 'la medición del 401 se completa').toBe(true);
    expect(r.cinta401, 'medir el 401 reproduce su cinta').toBe(true);
    expect(r.despierta, 'la cinta del 401 despierta a la criatura').toBe(true);
    expect(r.enfocado_medir403, 'la mirada cae sobre la X del 403').toBe('medir403');
    expect(r.medido403, 'la medición del 403 se completa').toBe(true);
    expect(r.cinta403, 'medir el 403 reproduce su cinta').toBe(true);
    expect(r.imitacionCompleta, 'tras el 403, la imitación está completa').toBe(true);
    expect(r.objetivo, 'el siguiente objetivo es el tablero').toBe('tablero');
    expect(r.habitacion).toBe('sala403');
    expect(r.estado).toBe('jugando');
  });

  test('con la luz de vuelta, al entrar al pasillo las lámparas revientan y ella aparece al fondo', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const momentos: string[] = [];
      ctx.bus.on('momento-guion', (m) => momentos.push(m.id));
      // El tablero (su bandera): la luz vuelve; el guion espera 9 s y a que yo entre al pasillo.
      ctx.progreso.marcar('tablero_activado');
      await P.esperarJuego(0.5);
      const pasilloEncendido = ctx.nivel.lamparas.filter((l) => l.id.startsWith('pasillo')).every((l) => l.estado === 'encendida');
      await P.esperarJuego(9.5);
      ctx.director.bloquear(0);
      await P.caminar([[20.5, 8.5], [20.5, 10.5]]);
      const limite = performance.now() + 15_000;
      while (!ctx.progreso.tiene('apagon_pasillo') && performance.now() < limite) await P.esperarReal(50);
      const rotas = ctx.nivel.lamparas.filter((l) => l.id.startsWith('pasillo')).map((l) => l.estado);
      const salida = {
        pasilloEncendido,
        momentos,
        apagon: ctx.progreso.tiene('apagon_pasillo'),
        rotas,
        estadoCriatura: ctx.entidad.estado,
        fase: ctx.director.fase,
        estado: J.estado,
      };
      // Que vuelva a las paredes antes de la siguiente prueba.
      ctx.entidad.cambiarEstado('paredes', ctx);
      ctx.director.bloquear(999);
      return salida;
    });
    expect(r.pasilloEncendido, 'el tablero devuelve la luz al pasillo').toBe(true);
    expect(r.apagon, 'al entrar al pasillo, el apagón ocurre').toBe(true);
    expect(r.momentos, 'el guion avisa el momento (la telemetría mide la reacción)').toEqual(['apagon']);
    expect(r.rotas, 'las cinco lámparas del pasillo revientan').toEqual(['rota', 'rota', 'rota', 'rota', 'rota']);
    expect(r.estadoCriatura, 'ella aparece al fondo, acechando').toBe('acechando');
    expect(r.fase, 'el director pasa al pico').toBe('pico');
    expect(r.estado).toBe('jugando');
  });

  test('medir el 402 dispara la secuencia final: el jugador despierta en la escalera sin la llave, y la oye caer', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      let desperto = false;
      const relevantes: string[] = [];
      ctx.bus.on('piso-cambiado', ({ desde, hacia }) => (desperto ||= desde === 'piso4' && hacia === 'piso4'));
      ctx.bus.on('sonido-relevante', (s) => relevantes.push(s.descripcion));
      // Para medir el 402 hay que haber entrado con su llave (aquí no se camina: lo camina llave.spec.ts).
      ctx.progreso.agregarObjeto('llave_402');
      ctx.progreso.marcar('medido:402');
      // El despertar es un viaje al mismo piso (a la escalera): espero a que termine.
      const limite = performance.now() + 40_000;
      while (!(desperto && J.estado === 'jugando') && performance.now() < limite) await P.esperarReal(50);
      // Sin luz: las del circuito general quedan apagadas o rotas (la del 402 y las del pasillo ya reventaron).
      const lamGeneral = ctx.nivel.lamparas.filter((l) => l.circuito === 'general').every((l) => l.estado === 'apagada' || l.estado === 'rota');
      const lamEmergencia = ctx.nivel.lamparas.find((l) => l.id === 'emergencia')?.estado;
      const llave = ctx.nivel.interactuables.find((i) => i.id === 'llaveEscalera');
      const alDespertar = { relevantes: [...relevantes] };
      // A los 3 s de despertar, la llave cae en el 402.
      await P.esperarJuego(4);
      return {
        estado: J.estado,
        tieneLlave: ctx.progreso.tieneObjeto('llave_escalera'),
        llaveEnElMapa: llave?.activo ?? false,
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
        subtituloDespertar: subs.some((s) => s.includes('Despiertas en el descanso')),
        pasos: subs.some((s) => s.includes('Los pasos ya no vienen de la grabadora')),
        piso: ctx.piso?.id,
        lamGeneralApagada: lamGeneral,
        lamEmergencia,
        oidoAlDespertar: alDespertar.relevantes,
        oidoDespues: relevantes,
      };
    });
    expect(r.pasos, 'la secuencia final reproduce su guion').toBe(true);
    expect(r.estado, 'el juego sigue corriendo (no hay pantalla de fin)').toBe('jugando');
    expect(r.tieneLlave, 'despertar no regala la llave').toBe(false);
    expect(r.llaveEnElMapa, 'la llave apareció en el 402 con el final').toBe(true);
    expect(r.objetivo, 'el objetivo dice qué hacer ahora').toBe('bajar');
    expect(r.subtituloDespertar).toBe(true);
    expect(r.oidoAlDespertar, 'la llave no cae durante la secuencia final').not.toContain('algo metálico cae');
    expect(r.oidoDespues, 'después de despertar, la oigo caer').toContain('algo metálico cae');
    expect(r.piso, 'el jugador sigue en el Piso 4 (escalera)').toBe('piso4');
    expect(r.lamGeneralApagada, 'el circuito general sigue apagado tras el despertar').toBe(true);
    expect(r.lamEmergencia, 'la emergencia sigue encendida').toBe('encendida');
    // El perfil se lee desde localStorage: registrarFinal lo guarda antes de volver al juego.
    const perfil = await page.evaluate(() => JSON.parse(localStorage.getItem('las-paredes-oyen:perfil') ?? 'null'));
    expect(perfil?.pisosCompletados?.piso4, 'el perfil registra el Piso 4 como completado').toBe('normal');
  });
});
