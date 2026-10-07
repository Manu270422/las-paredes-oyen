// Recorrido del Piso 3: bajar desde el Piso 4, explorar un tramo y volver a subir.
// Valida el motor de cambio de piso (Tarea 3) con un piso real:
// - la llave abre la reja del Piso 4 → viaje con fundido → el jugador llega al Piso 3
// - 'llego:piso3' se marca en silencio → director y criatura ya activos al llegar
// - solo hay un Nivel activo (el del Piso 3): el anterior fue destruido por cambiarNivel
// - la escalera de vuelta permite subir al Piso 4
// - coherencia del mapa: ningún punto de control, mueble ni lámpara en celdas 'E'
import { expect, test, type Page } from '@playwright/test';
import { instalarPiloto } from './piloto';

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
    // La prueba da la llave directamente: no hace falta jugar toda la secuencia final.
    // marcarSilencioso evita que el bus emita 'medido:402' y dispare ejecutarSecuenciaFinal.
    await page.evaluate(() => {
      window.__juego!.ctx.progreso.agregarObjeto('llave_escalera');
      window.__juego!.ctx.progreso.marcarSilencioso('medido:402');
      window.__juego!.ctx.nivel.aplicarLuzDe('medido:402');
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

      // Caminar hasta la escalera.
      await P.caminar([[2.2, 9.5]]);
      // El tramo de bajada (id:'bajada') está en la celda (1.5, 10.5).
      const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada');
      if (!tramo) return { error: 'tramo bajada no encontrado en el Piso 4' };
      const pos = tramo.objeto.position;
      P.mirarA(pos.x, 0, pos.z);
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');

      // Espero a que el viaje termine y el juego vuelva a 'jugando'.
      const limite = performance.now() + 20_000;
      while (J.estado !== 'jugando' && performance.now() < limite) await new Promise((r) => setTimeout(r, 50));

      return {
        enfocado,
        estado: J.estado,
        piso: ctx.piso?.id,
        llegoPiso3: ctx.progreso.tiene('llego:piso3'),
        directorActivo: ctx.director.activo,
        criaturaDespierta: ctx.progreso.criaturaDespierta,
        // El nivel activo pertenece al Piso 3 (hay exactamente uno: el viejo fue destruido).
        nivelEsPiso3: ctx.nivel === J.ctx.nivel && ctx.piso?.id === 'piso3',
      };
    });
    expect(r.enfocado, 'el tramo de bajada está enfocado').toBe('bajada');
    expect(r.estado, 'el juego sigue corriendo tras el viaje').toBe('jugando');
    expect(r.piso, 'el jugador está en el Piso 3').toBe('piso3');
    expect(r.llegoPiso3, 'llego:piso3 se marcó en silencio al llegar').toBe(true);
    expect(r.directorActivo, 'el director ya está activo (directorDesde:llego:piso3)').toBe(true);
    expect(r.criaturaDespierta, 'la criatura está despierta (despiertaCon:llego:piso3)').toBe(true);
    expect(r.nivelEsPiso3, 'el nivel activo es el del Piso 3').toBe(true);
  });

  test('coherencia del mapa del Piso 3: nada en celdas E', async () => {
    const r = await page.evaluate(() => {
      const { ctx } = window.__juego!;
      const nivel = ctx.nivel;
      const rejilla = nivel.rejilla;
      const C = 1.3;
      const problemas: string[] = [];

      for (const [nombre, pt] of Object.entries(ctx.piso.mapa.puntosControl)) {
        const p = pt as { x: number; y: number };
        if (rejilla.esHueco(Math.floor(p.x), Math.floor(p.y))) problemas.push(`puntoControl '${nombre}' en celda E`);
      }
      for (const m of nivel.muebles) {
        const p = m.objeto.position;
        if (rejilla.esHueco(Math.floor(p.x / C), Math.floor(p.z / C))) problemas.push(`mueble '${m.id ?? '?'}' en celda E`);
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

      // Flood-fill desde el centro de la escalera (celda 2,10 es transitable dentro del cuarto escalera).
      const visited = new Set<string>();
      const queue: [number, number][] = [[2, 10]];
      visited.add('2,10');
      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nx = x + dx, ny = y + dy;
          const k = `${nx},${ny}`;
          if (!visited.has(k) && rejilla.esTransitable(nx, ny)) {
            visited.add(k);
            queue.push([nx, ny]);
          }
        }
      }

      // Una habitación es alcanzable si alguna de sus celdas está en el conjunto visitado.
      const alcanzadas = habitaciones
        .filter((h) => {
          for (let y = h.y0; y <= h.y1; y++)
            for (let x = h.x0; x <= h.x1; x++)
              if (visited.has(`${x},${y}`)) return true;
          return false;
        })
        .map((h) => h.id);

      const esperadas = habitaciones.filter((h) => h.id !== 'servicio').map((h) => h.id);
      return esperadas.filter((id) => !alcanzadas.includes(id));
    });
    expect(faltantes, 'todas las habitaciones (menos servicio) son alcanzables desde la escalera').toEqual([]);
  });

  test('subir de vuelta al Piso 4', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const P = window.__piloto!;
      const { ctx } = J;

      // El tramo de subida (id:'subida') está en la misma columna de escalera.
      const tramo = ctx.nivel.interactuables.find((i) => i.id === 'subida');
      if (!tramo) return { error: 'tramo subida no encontrado en el Piso 3' };
      const pos = tramo.objeto.position;
      P.mirarA(pos.x, 0, pos.z);
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado?.id ?? null;
      await P.pulsar('KeyE');

      const limite = performance.now() + 20_000;
      while (J.estado !== 'jugando' && performance.now() < limite) await new Promise((r) => setTimeout(r, 50));

      return {
        enfocado,
        estado: J.estado,
        piso: ctx.piso?.id,
      };
    });
    expect(r.enfocado, 'el tramo de subida está enfocado').toBe('subida');
    expect(r.estado, 'el juego sigue corriendo tras subir').toBe('jugando');
    expect(r.piso, 'el jugador está de vuelta en el Piso 4').toBe('piso4');
  });

  test('volver al Piso 4 no repite la secuencia final ni enciende el circuito general', async () => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      // Espero 15 s de juego: si la secuencia final se disparara de nuevo, cambiaría el estado.
      const inicio = ctx.programador.ahora;
      while (ctx.programador.ahora < inicio + 15) await new Promise((r) => setTimeout(r, 100));
      const lamGeneral = ctx.nivel.lamparas.filter((l) => l.circuito === 'general').every((l) => l.estado === 'apagada');
      const lamEmergencia = ctx.nivel.lamparas.find((l) => l.id === 'emergencia')?.estado;
      return {
        estado: J.estado,
        piso: ctx.piso?.id,
        medido402: ctx.progreso.tiene('medido:402'),
        tieneKey: ctx.progreso.tiene('objeto:llave_escalera'),
        lamGeneralApagada: lamGeneral,
        lamEmergencia,
      };
    });
    expect(r.estado, 'el juego sigue en modo jugando (la secuencia no se repitió)').toBe('jugando');
    expect(r.piso, 'el jugador sigue en el Piso 4').toBe('piso4');
    expect(r.medido402, 'medido:402 sigue marcado').toBe(true);
    expect(r.tieneKey, 'la llave de la escalera sigue en el inventario').toBe(true);
    expect(r.lamGeneralApagada, 'el circuito general sigue apagado (el edificio no se re-encendió)').toBe(true);
    expect(r.lamEmergencia, 'la emergencia sigue encendida').toBe('encendida');
  });
});
