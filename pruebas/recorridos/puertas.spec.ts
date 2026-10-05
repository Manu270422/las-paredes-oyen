// Las 10 puertas del Piso 4, caminando de verdad (W + mirada + E, nunca teletransportando):
// 1) una puerta la abre LA CRIATURA (la prueba cruza esa puerta después, en los dos sentidos);
// 2) las 10 se cruzan en ambos sentidos: se abren con E, se atraviesan y se vuelve a cruzar;
// 3) casos del túnel: el director cierra o entreabre una puerta con el jugador DENTRO del túnel
//    (no puede quedar atrapado), la hoja abierta no estorba el vano, y se puede abrir desde el
//    lado contrario y cerrar con E estando abierta.
// El itinerario es una lista de datos: cada puerta con su ruta de llegada (en CELDAS) y los dos
// puntos a cada lado. Si un mueble o una hoja tapa un paso, la prueba falla diciendo en cuál.
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

test.describe.serial('Puertas caminando', () => {
  test.setTimeout(480_000);
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
    await page.waitForFunction(() => window.__juego?.estado === 'jugando');
    await instalarPiloto(page);
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('la criatura abre la puerta del 403 sin que el jugador la toque', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const C = 1.3;
      const puerta = ctx.nivel.puertas.find((p) => p.id === 'p403')!;
      const cerradaAntes = !puerta.abierta;
      const E = ctx.entidad;
      // El jugador está quieto en la escalera, lejos. Ella está en la sala del 403 y oye un ruido en el pasillo.
      E.manifestar(20.5 * C, 7.5 * C, ctx);
      E.memoria.registrarRuido(20.5 * C, 10.5 * C, 0.5, ctx.programador.ahora, null);
      E.cambiarEstado('investigando', ctx);
      const limite = performance.now() + 20_000;
      while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
      const abiertaPorElla = puerta.abierta;
      await P.esperarJuego(2);
      const posicion = { x: Math.round((E.posicion.x / C) * 10) / 10, z: Math.round((E.posicion.z / C) * 10) / 10 };
      E.cambiarEstado('paredes', ctx);
      return { cerradaAntes, abiertaPorElla, estado: J.estado, posicion };
    });
    expect(r.cerradaAntes, 'la puerta del 403 empieza cerrada').toBe(true);
    expect(r.abiertaPorElla, 'ella abrió la puerta').toBe(true);
    expect(r.estado).toBe('jugando');
  });

  test('cruza las 10 puertas en ambos sentidos', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      type Punto = readonly [number, number];
      interface Tramo {
        id: string;
        /** Cómo llego al lado A desde donde terminó el tramo anterior (en celdas). */
        ruta: Punto[];
        a: Punto;
        b: Punto;
      }
      const PASILLO_ESTE: Punto[] = [[16.5, 10.3], [18.2, 10.3], [20.5, 10.5]];
      const PASILLO_OESTE: Punto[] = [[18.2, 10.3], [16.5, 10.3]];
      const TRAMOS: Tramo[] = [
        { id: 'p401', ruta: [[3.6, 10.5], [7.5, 10.5]], a: [7.5, 10.5], b: [7.5, 8.5] },
        // La del 403 ya la abrió la criatura: se cruza sin tocarla.
        { id: 'p403', ruta: [[12, 10.5], ...PASILLO_ESTE], a: [20.5, 10.5], b: [20.5, 8.5] },
        { id: 'p402', ruta: [...PASILLO_OESTE, [14.5, 10.5]], a: [14.5, 10.5], b: [14.5, 12.5] },
        { id: 'pDormitorio402', ruta: [[14.5, 12.5], [14.5, 15.5], [10.5, 15.5]], a: [10.5, 15.5], b: [10.5, 17.5] },
        { id: 'pCuarto402', ruta: [[10.5, 15.5], [14.5, 15.5], [18.5, 15.5]], a: [18.5, 15.5], b: [18.5, 17.5] },
        { id: 'pServicio', ruta: [[14.5, 15.5], [14.5, 12.5], [14.5, 10.5], ...PASILLO_ESTE, [26.2, 10.75], [27.5, 10.5]], a: [27.5, 10.5], b: [29.5, 10.5] },
        { id: 'pDormitorio401', ruta: [[26.2, 10.75], ...[...PASILLO_ESTE].reverse(), [12, 10.5], [7.5, 10.5], [7.5, 8.5], [7.5, 7.6], [6.3, 7.6], [6.3, 5.5], [6.5, 5.5]], a: [6.5, 5.5], b: [6.5, 3.5] },
        { id: 'pBano401', ruta: [[6.5, 5.4], [7.5, 5.4], [11.5, 5.5]], a: [11.5, 5.5], b: [11.5, 3.5] },
        { id: 'pCocina403', ruta: [[6.3, 5.5], [6.3, 7.6], [7.5, 7.6], [7.5, 8.5], [7.5, 10.5], [12, 10.5], ...PASILLO_ESTE, [20.5, 8.5], [20.5, 6], [18.5, 5.6]], a: [18.5, 5.5], b: [18.5, 3.5] },
        { id: 'pEstudio403', ruta: [[24.5, 5.6]], a: [24.5, 5.5], b: [24.5, 3.5] },
      ];

      const resultados: Array<Record<string, unknown>> = [];
      for (const tramo of TRAMOS) {
        const puerta = ctx.nivel.puertas.find((p) => p.id === tramo.id)!;
        const registro: Record<string, unknown> = { id: tramo.id };
        const paso = async (que: string, fn: () => Promise<void>) => {
          try {
            await fn();
          } catch (e) {
            throw new Error(`[${tramo.id}] ${que}: ${(e as Error).message}`);
          }
        };
        await paso('llegar al lado A', () => P.caminar(tramo.ruta));
        registro.cerradaAlLlegar = !puerta.abierta;
        if (tramo.id === 'p402') ctx.progreso.agregarObjeto('llave_402');
        if (!puerta.abierta) {
          await paso('abrirla con E', async () => {
            const h = puerta.puntoInteraccion();
            P.mirarA(h.x, h.y, h.z);
            await P.esperarJuego(0.3);
            registro.enfocada = J.interaccion.enfocado?.id ?? null;
            await P.pulsar('KeyE');
            const limite = performance.now() + 8000;
            while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
            if (!puerta.abierta) throw new Error(`no se abrió (enfocaba "${String(registro.enfocada)}")`);
            await P.esperarJuego(0.8);
          });
        }
        registro.colisionAbierta = puerta.cajaColision();
        await paso('cruzar de A a B', () => P.caminar([tramo.b]));
        await paso('volver de B a A', () => P.caminar([tramo.a]));
        registro.listo = true;
        resultados.push(registro);
      }
      return { resultados, estado: J.estado };
    });

    expect(r.estado).toBe('jugando');
    expect(r.resultados.map((x) => x.id)).toEqual(['p401', 'p403', 'p402', 'pDormitorio402', 'pCuarto402', 'pServicio', 'pDormitorio401', 'pBano401', 'pCocina403', 'pEstudio403']);
    for (const x of r.resultados) {
      expect(x.listo, `${String(x.id)} cruzada en los dos sentidos`).toBe(true);
      expect(x.colisionAbierta, `${String(x.id)}: abierta no deja colisión que estorbe el vano`).toBeNull();
      // Si la abrió el jugador, la interacción identificó a esa puerta por su hoja.
      if (x.enfocada !== undefined) expect(x.enfocada, `${String(x.id)}: la interacción apuntó a su hoja`).toBe(x.id);
    }
    // Las que empiezan abiertas no se tocan; las que la criatura o el jugador abrieron, sí estaban cerradas.
    expect(r.resultados.find((x) => x.id === 'p403')?.cerradaAlLlegar, 'la del 403 llegó abierta por la criatura').toBe(false);
    expect(r.resultados.find((x) => x.id === 'p401')?.cerradaAlLlegar).toBe(true);
  });

  test('el director cambia o cierra una puerta con el jugador dentro del túnel: nunca queda atrapado', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      const C = 1.3;
      const puerta = ctx.nivel.puertas.find((p) => p.id === 'p401')!;
      const p = ctx.jugador.posicion;
      const enCeldas = () => ({ x: Math.round((p.x / C) * 100) / 100, z: Math.round((p.z / C) * 100) / 100 });
      const salida: Record<string, unknown> = {};
      const intentar = async (que: string, fn: () => Promise<void>) => {
        try {
          await fn();
          return true;
        } catch (e) {
          salida[`fallo_${que}`] = (e as Error).message;
          return false;
        }
      };
      // Funciona solo o a continuación del recorrido anterior (que termina en el estudio del 403).
      puerta.fijarInstantaneo(true);
      const desdeElEstudio = [[24.5, 5.6], [20.5, 6], [20.5, 8.5], [20.5, 10.5], [18.2, 10.3], [16.5, 10.3], [12, 10.5], [7.5, 10.5]] as const;
      const desdeLaEscalera = [[3.6, 10.5], [7.5, 10.5]] as const;
      await P.caminar(ctx.memoria.habitacionActual === 'escalera' ? desdeLaEscalera : desdeElEstudio);
      salida.abiertaAlInicio = puerta.abierta;

      // 1) Dentro del túnel, pegado al borde de la bisagra: justo donde va a quedar la hoja al cerrarse.
      await P.caminar([[7.5, 9.8]], 0.15);
      salida.dentroDelTunel = ctx.memoria.habitacionActual;
      // El director cierra la puerta de golpe (lo que hace PuertaCambiada con una abierta).
      puerta.fijarInstantaneo(false);
      await P.esperarJuego(1);
      const tras = enCeldas();
      salida.trasCerrar = tras;
      // Puede salir al cuarto (el lado sin hoja).
      salida.salioAlCuarto = await intentar('salir_al_cuarto', () => P.caminar([[7.5, 8.5]]));
      // Y desde el cuarto, abrir la puerta cerrada con E, MIRÁNDOLA DESDE EL LADO CONTRARIO al de la bisagra.
      await intentar('abrir_desde_el_cuarto', async () => {
        const h = puerta.puntoInteraccion();
        P.mirarA(h.x, h.y, h.z);
        await P.esperarJuego(0.3);
        salida.enfocadaDesdeElCuarto = J.interaccion.enfocado?.id ?? null;
        await P.pulsar('KeyE');
        const limite = performance.now() + 6000;
        while (!puerta.abierta && performance.now() < limite) await P.esperarReal(30);
        if (!puerta.abierta) throw new Error('no se abrió desde el cuarto');
        await P.esperarJuego(0.8);
      });
      salida.salioAlPasillo = await intentar('salir_al_pasillo', () => P.caminar([[7.5, 10.5]]));

      // 2) Dentro del túnel, con la puerta a medio abrir por el director (lo que hace con una cerrada).
      puerta.fijarInstantaneo(true);
      await P.esperarJuego(0.3);
      await P.caminar([[7.5, 9.6]], 0.2);
      // Primero la cierra (con él dentro) y enseguida la entreabre: la hoja barre el lugar donde está parado.
      puerta.fijarInstantaneo(false);
      await P.esperarJuego(0.3);
      puerta.fijarInstantaneo(true, 0.45);
      await P.esperarJuego(0.5);
      salida.entreabiertaSinColision = puerta.cajaColision() === null;
      salida.cruzoEntreabierta = await intentar('cruzar_entreabierta', () => P.caminar([[7.5, 8.5], [7.5, 10.5]]));

      // 3) La hoja abierta no estorba: se cruza pegado a su jamba y por el medio sin chocar.
      puerta.fijarInstantaneo(true);
      await P.esperarJuego(0.3);
      salida.pegadoALaHoja = await intentar('pegado_a_la_hoja', () => P.caminar([[7.14, 10.5], [7.14, 8.5], [7.14, 10.5]], 0.2));
      // 4) Abierta, se puede CERRAR con E mirando la hoja contra la jamba.
      await P.caminar([[7.5, 10.5]]);
      const h = puerta.puntoInteraccion();
      P.mirarA(h.x, h.y, h.z);
      await P.esperarJuego(0.3);
      salida.enfocadaAbierta = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');
      const limite = performance.now() + 6000;
      while (puerta.abierta && performance.now() < limite) await P.esperarReal(30);
      salida.cerradaConE = !puerta.abierta;
      salida.estado = J.estado;
      return salida;
    });

    expect(r, 'ningún paso falló').not.toHaveProperty('fallo_salir_al_cuarto');
    expect(r.abiertaAlInicio).toBe(true);
    expect(r.salioAlCuarto, 'tras cerrarse la puerta con él dentro del túnel, pudo salir al cuarto').toBe(true);
    expect(r.enfocadaDesdeElCuarto, 'desde el lado contrario, la interacción apunta a la hoja').toBe('p401');
    expect(r.salioAlPasillo, 'abrió desde el cuarto y salió al pasillo').toBe(true);
    expect(r.entreabiertaSinColision).toBe(true);
    expect(r.cruzoEntreabierta, 'con la hoja a medio abrir pudo cruzar').toBe(true);
    expect(r.pegadoALaHoja, 'la hoja abierta no estorba el vano').toBe(true);
    expect(r.enfocadaAbierta, 'abierta, se puede apuntar a la hoja').toBe('p401');
    expect(r.cerradaConE, 'una puerta abierta se cierra con E').toBe(true);
    expect(r.estado).toBe('jugando');
    expect(Object.keys(r).filter((k) => k.startsWith('fallo_')), 'pasos que fallaron').toEqual([]);
  });
});
