// Recorrido del Piso 3: bajar desde el Piso 4, caminar por él y volver a subir.
// Valida el motor de cambio de piso (Tarea 3) con un piso real:
// - la llave abre la reja del Piso 4 → viaje con fundido → el jugador llega al Piso 3
// - 'llego:piso3' se marca en silencio → director y criatura ya activos al llegar
// - solo hay un Nivel activo (el del Piso 3): el anterior fue destruido por cambiarNivel
// - coherencia del mapa: ningún punto de control, mueble ni lámpara en celdas 'E'; por la rejilla, todo cuarto
//   (menos el servicio tapiado) se alcanza desde la escalera, y CAMINANDO se entra al 301 y al 302 por sus
//   puertas (el 303 lo camina rastrosPiso3.spec.ts): la rejilla no ve los muebles que tapan una puerta
// - la escalera de vuelta permite subir al Piso 4, y volver no repite el final del 402
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

/** La línea de la secuencia final del 402: si aparece, el final se repitió. */
const LINEA_DEL_FINAL = 'Los pasos ya no vienen de la grabadora';

test.describe.serial('Piso 3: bajar, explorar y volver a subir', () => {
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
      // Todos los subtítulos de la sesión: el último test revisa que el final del 402 nunca se repitió.
      const registro: string[] = [];
      ctx.bus.on('subtitulo', (s) => registro.push(s.texto));
      (window as unknown as { __subtitulos: string[] }).__subtitulos = registro;
      // La prueba da la llave directamente: no hace falta jugar toda la secuencia final.
      // marcarSilencioso evita que el bus emita 'medido:402' y dispare ejecutarSecuenciaFinal.
      ctx.progreso.agregarObjeto('llave_escalera');
      ctx.progreso.marcarSilencioso('medido:402');
      // La reja ya abierta: abrirla con la llave lo prueba llaveEscalera.spec.ts.
      ctx.progreso.marcarSilencioso('abierta:bajada');
      ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
      ctx.nivel.aplicarLuzDe('medido:402');
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('bajar al Piso 3: viaje con fundido → llego:piso3 marcado → director y criatura activos', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;

      await P.caminar([[2.2, 9.5]]);
      // El tramo de bajada (id:'bajada') está en la boca del hueco, en (1.5, 10.5).
      const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada');
      if (!tramo) throw new Error('tramo bajada no encontrado en el Piso 4');
      const pos = tramo.objeto.position;
      P.mirarA(pos.x, pos.y, pos.z);
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');

      // El viaje pasa por 'viaje' y vuelve a 'jugando' ya en el piso de destino.
      const limite = performance.now() + 20_000;
      while (!(J.estado === 'jugando' && ctx.piso.id === 'piso3') && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.3);

      return {
        enfocado,
        estado: J.estado,
        piso: ctx.piso.id,
        llegoPiso3: ctx.progreso.tiene('llego:piso3'),
        directorActivo: ctx.director.activo,
        criaturaDespierta: ctx.progreso.criaturaDespierta,
        nivelesEnEscena: ctx.escena.children.filter((o) => o.name === 'nivel').length,
      };
    });
    expect(r.enfocado, 'el tramo de bajada está enfocado').toBe('bajada');
    expect(r.estado, 'el juego sigue corriendo tras el viaje').toBe('jugando');
    expect(r.piso, 'el jugador está en el Piso 3').toBe('piso3');
    expect(r.llegoPiso3, 'llego:piso3 se marcó en silencio al llegar').toBe(true);
    expect(r.directorActivo, 'el director ya está activo (directorDesde:llego:piso3)').toBe(true);
    expect(r.criaturaDespierta, 'la criatura está despierta (despiertaCon:llego:piso3)').toBe(true);
    expect(r.nivelesEnEscena, 'un solo nivel en la escena (el viejo se destruyó)').toBe(1);
  });

  test('coherencia del mapa del Piso 3: nada en celdas E', async () => {
    const r = await page.evaluate(() => {
      const { ctx } = window.__juego!;
      const nivel = ctx.nivel;
      const rejilla = nivel.rejilla;
      const C = 1.3;
      const problemas: string[] = [];

      for (const [nombre, p] of Object.entries(ctx.piso.mapa.puntosControl)) {
        if (rejilla.esHueco(Math.floor(p.x), Math.floor(p.y))) problemas.push(`puntoControl '${nombre}' en celda E`);
      }
      for (const m of nivel.muebles) {
        const p = m.objeto.position;
        if (rejilla.esHueco(Math.floor(p.x / C), Math.floor(p.z / C))) problemas.push(`mueble '${m.id ?? m.tipo}' en celda E`);
      }
      for (const l of nivel.lamparas) {
        const p = l.objeto.position;
        if (rejilla.esHueco(Math.floor(p.x / C), Math.floor(p.z / C))) problemas.push(`lámpara '${l.id}' en celda E`);
      }
      return problemas;
    });
    expect(r, 'ningún mueble, lámpara ni punto de control en celdas E').toEqual([]);
  });

  test('BFS: todas las habitaciones del Piso 3 salvo servicio son alcanzables desde la escalera', async () => {
    const faltantes = await page.evaluate(() => {
      const { ctx } = window.__juego!;
      const rejilla = ctx.nivel.rejilla;
      const habitaciones = ctx.piso.mapa.habitaciones;

      // Flood-fill por la rejilla desde la celda (2, 10), dentro del cuarto de la escalera.
      const visitadas = new Set<string>(['2,10']);
      const cola: Array<[number, number]> = [[2, 10]];
      while (cola.length > 0) {
        const [x, y] = cola.shift()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
          const [nx, ny] = [x + dx, y + dy];
          const k = `${nx},${ny}`;
          if (!visitadas.has(k) && rejilla.esTransitable(nx, ny)) {
            visitadas.add(k);
            cola.push([nx, ny]);
          }
        }
      }

      // Una habitación es alcanzable si alguna de sus celdas quedó visitada.
      const alcanzable = (h: (typeof habitaciones)[number]) => {
        for (let y = h.y0; y <= h.y1; y++) for (let x = h.x0; x <= h.x1; x++) if (visitadas.has(`${x},${y}`)) return true;
        return false;
      };
      return habitaciones.filter((h) => h.id !== 'servicio' && !alcanzable(h)).map((h) => h.id);
    });
    expect(faltantes, 'todas las habitaciones (menos servicio) son alcanzables desde la escalera').toEqual([]);
  });

  test('caminando de verdad se entra al 301 y al 302 por sus puertas (ningún mueble las tapa)', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;
      // Aquí se prueba el paso, no la caza: la criatura a las paredes y el director quieto.
      ctx.director.bloquear(999);
      ctx.entidad.puedeManifestarse = false;
      ctx.entidad.cambiarEstado('paredes', ctx);
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

      await P.caminar([[3.6, 10.5], [7.5, 10.5]]);
      await abrir('p301');
      await P.caminar([[7.5, 9.5], [7.5, 8.3]], 0.18);
      const en301 = ctx.memoria.habitacionActual;

      await P.caminar([[7.5, 9.5], [7.5, 10.68], [9.4, 10.68], [10.6, 10.35], [13.6, 10.35], [14.5, 10.4]], 0.18);
      await abrir('p302');
      await P.caminar([[14.5, 11.5], [14.5, 12.6]], 0.18);
      const en302 = ctx.memoria.habitacionActual;

      // De vuelta al descanso, para subir.
      await P.caminar([[14.5, 11.5], [14.5, 10.4], [10.6, 10.35], [9.4, 10.68], [7.6, 10.68], [3.6, 10.5], [2.2, 10.5]], 0.18);
      return { en301, en302, estado: J.estado };
    });
    expect(r.en301, 'entré a la sala del 301').toBe('sala301');
    expect(r.en302, 'entré a la sala del 302').toBe('sala302');
    expect(r.estado).toBe('jugando');
  });

  test('subir de vuelta al Piso 4', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;

      // El tramo de subida (id:'subida') está en la misma boca del hueco.
      const tramo = ctx.nivel.interactuables.find((i) => i.id === 'subida');
      if (!tramo) throw new Error('tramo subida no encontrado en el Piso 3');
      const pos = tramo.objeto.position;
      P.mirarA(pos.x, pos.y, pos.z);
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');

      const limite = performance.now() + 20_000;
      while (!(J.estado === 'jugando' && ctx.piso.id === 'piso4') && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.3);

      return { enfocado, estado: J.estado, piso: ctx.piso.id };
    });
    expect(r.enfocado, 'el tramo de subida está enfocado').toBe('subida');
    expect(r.estado, 'el juego sigue corriendo tras subir').toBe('jugando');
    expect(r.piso, 'el jugador está de vuelta en el Piso 4').toBe('piso4');
  });

  test('volver al Piso 4 no repite la secuencia final ni enciende el circuito general', async () => {
    const r = await page.evaluate(async (linea) => {
      const J = window.__juego!;
      const { ctx } = J;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      // Espero 15 s de juego: si la secuencia final se disparara de nuevo, su guion hablaría.
      const inicio = ctx.programador.ahora;
      while (ctx.programador.ahora < inicio + 15) await new Promise((r) => setTimeout(r, 100));
      const general = ctx.nivel.lamparas.filter((l) => l.circuito === 'general');
      // Compruebo que el registro escucha de verdad: si no, "nunca se oyó" no probaría nada.
      ctx.bus.emit('subtitulo', { texto: 'prueba del registro', duracion: 0.1 });
      return {
        estado: J.estado,
        piso: ctx.piso.id,
        medido402: ctx.progreso.tiene('medido:402'),
        tieneLlave: ctx.progreso.tiene('objeto:llave_escalera'),
        generalSinLuz: general.every((l) => l.estado === 'apagada' || l.estado === 'rota'),
        emergencia: ctx.nivel.lamparas.find((l) => l.id === 'emergencia')?.estado,
        lineasDelFinal: subs.filter((s) => s.includes(linea)),
        registroEscucha: subs.includes('prueba del registro'),
      };
    }, LINEA_DEL_FINAL);
    expect(r.estado, 'el juego sigue en modo jugando (la secuencia no se repitió)').toBe('jugando');
    expect(r.piso, 'el jugador sigue en el Piso 4').toBe('piso4');
    expect(r.medido402, 'medido:402 sigue marcado').toBe(true);
    expect(r.tieneLlave, 'la llave de la escalera sigue en el inventario').toBe(true);
    expect(r.lineasDelFinal, `en toda la sesión nunca se oyó "${LINEA_DEL_FINAL}"`).toEqual([]);
    expect(r.registroEscucha, 'el registro de subtítulos sí escucha (la prueba puede fallar)').toBe(true);
    expect(r.generalSinLuz, 'el circuito general sigue sin luz (el edificio no se re-encendió)').toBe(true);
    expect(r.emergencia, 'la emergencia sigue encendida').toBe('encendida');
  });
});
