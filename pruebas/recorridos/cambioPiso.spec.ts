// El motor de cambio de piso en el juego real: leo la orden en el Piso 4, bajo al piso de prueba (el plano del
// Piso 4 con otro id: pisoDePrueba.ts), cumplo su objetivo y subo de vuelta CAMINANDO hasta su tramo y
// pulsando E. Cada piso tiene que recordar lo suyo, la partida se guarda al llegar, la criatura se mueve por
// el plano del piso nuevo y el nivel viejo no se queda en la memoria de la GPU (lo mido en dos viajes de ida y
// vuelta: si algo se filtra, la cuenta crece en cada uno).
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, leerLaOrden, PREFIJO } from './acciones';

test('bajo a otro piso y vuelvo: cada piso recuerda lo suyo, se guarda al llegar y el nivel viejo no queda en memoria', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await leerLaOrden(page);

  const r = await page.evaluate(async (prefijo) => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const C = 1.3;
    const ruta = '/pruebas/recorridos/pisoDePrueba.ts';
    const { PISO_DE_PRUEBA } = (await import(/* @vite-ignore */ ruta)) as typeof import('./pisoDePrueba');
    const viaje = (J as unknown as { viajeEscalera: { viajar(p: unknown, l: string, c: unknown): void } }).viajeEscalera;
    const viajarA = (piso: unknown, llegada: string) => viaje.viajar(piso, llegada, ctx);
    const partida = () => JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null') as Record<string, unknown> & { otrosPisos: Record<string, { banderas: string[] }> };
    const cambios: string[] = [];
    ctx.bus.on('piso-cambiado', ({ desde, hacia }) => cambios.push(`${desde}→${hacia}`));

    /** Espero a terminar de llegar a un piso (el viaje pasa por 'viaje' y vuelve a 'jugando'). */
    const llegarA = async (id: string) => {
      const limite = performance.now() + 15_000;
      while (!(J.estado === 'jugando' && ctx.piso.id === id) && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.3);
    };

    /**
     * Lo que ocupa la escena en la GPU. Dibujo una vez SIN descartar lo que queda fuera de la cámara: así se
     * sube todo lo visible de la escena, no solo lo que miro, y la cuenta no depende de hacia dónde mire.
     */
    const memoriaGPU = () => {
      const webgl = ctx.renderizador.webgl;
      const descartables: Array<{ frustumCulled: boolean }> = [];
      ctx.escena.traverse((o) => {
        if (o.frustumCulled) {
          o.frustumCulled = false;
          descartables.push(o);
        }
      });
      webgl.setRenderTarget(null);
      webgl.render(ctx.escena, ctx.camara);
      for (const o of descartables) o.frustumCulled = true;
      return { geometrias: webgl.info.memory.geometries, texturas: webgl.info.memory.textures };
    };
    const nivelesEnEscena = () => ctx.escena.children.filter((o) => o.name === 'nivel').length;
    const rejillaDeLaCriatura = () => (ctx.entidad as unknown as { rejilla: unknown }).rejilla;

    const memoriaInicial = memoriaGPU();

    // 1) Bajo al piso de prueba.
    viajarA(PISO_DE_PRUEBA, 'escalera');
    const enViaje = J.estado;
    await llegarA('pruebaAbajo');
    const abajo = {
      enViaje,
      objetivo: ctx.progreso.objetivoActual()?.id ?? null,
      leyoOrden: ctx.progreso.tiene('leyo:orden_trabajo'),
      documentos: [...ctx.progreso.documentosLeidos],
      criaturaEnEstePlano: rejillaDeLaCriatura() === ctx.nivel.rejilla,
      niveles: nivelesEnEscena(),
      directorActivo: ctx.director.activo,
      partidaPiso: partida().piso,
      partidaPunto: partida().puntoControl,
      arribaGuardado: partida().otrosPisos.piso4?.banderas.includes('leyo:orden_trabajo') ?? false,
      distanciaLlegada: Math.hypot(ctx.jugador.posicion.x - 2.2 * C, ctx.jugador.posicion.z - 10.5 * C),
    };

    // 2) Cumplo el objetivo de abajo y subo caminando hasta el tramo; lo pulso con E.
    ctx.progreso.marcar('hizo:prueba');
    await P.caminar([[3.4, 10.35]]);
    P.mirarA(3.5 * C, 0.9, 10.8 * C);
    await P.esperarJuego(0.3);
    const enfocado = J.interaccion.enfocado;
    const tramo = { id: enfocado?.id ?? null, texto: enfocado?.texto(ctx) ?? null };
    await P.pulsar('KeyE');
    await llegarA('piso4');
    const arriba = {
      leyoOrden: ctx.progreso.tiene('leyo:orden_trabajo'),
      hizoPrueba: ctx.progreso.tiene('hizo:prueba'),
      documentos: [...ctx.progreso.documentosLeidos],
      objetivo: ctx.progreso.objetivoActual()?.id ?? null,
      abajoRecordado: ctx.progreso.exportarOtros().pruebaAbajo?.banderas.includes('hizo:prueba') ?? false,
      criaturaEnEstePlano: rejillaDeLaCriatura() === ctx.nivel.rejilla,
      niveles: nivelesEnEscena(),
      directorActivo: ctx.director.activo,
      partidaPiso: partida().piso,
      abajoGuardado: partida().otrosPisos.pruebaAbajo?.banderas.includes('hizo:prueba') ?? false,
    };
    const memoriaTrasUnViaje = memoriaGPU();

    // 3) Otro viaje de ida y vuelta: si el nivel viejo se filtra, la memoria vuelve a crecer.
    viajarA(PISO_DE_PRUEBA, 'escalera');
    await llegarA('pruebaAbajo');
    const abajoOtraVez = { hizoPrueba: ctx.progreso.tiene('hizo:prueba'), objetivo: ctx.progreso.objetivoActual()?.id ?? null };
    const rutaCatalogo = '/src/pisos/catalogo.ts';
    const { pisoPorId } = (await import(/* @vite-ignore */ rutaCatalogo)) as typeof import('../../src/pisos/catalogo');
    viajarA(pisoPorId('piso4'), 'escalera');
    await llegarA('piso4');
    const memoriaTrasDosViajes = memoriaGPU();

    return { abajo, tramo, arriba, abajoOtraVez, cambios, memoriaInicial, memoriaTrasUnViaje, memoriaTrasDosViajes, estado: J.estado };
  }, PREFIJO);

  // Abajo: el piso nuevo empieza vacío, lo de arriba quedó guardado, y todo se movió al plano nuevo.
  expect(r.abajo.enViaje, 'el viaje tiene su estado (a oscuras, sin control)').toBe('viaje');
  expect(r.abajo.objetivo).toBe('prueba');
  expect(r.abajo.leyoOrden, 'las banderas del Piso 4 no bajan conmigo').toBe(false);
  expect(r.abajo.documentos).toEqual([]);
  expect(r.abajo.criaturaEnEstePlano, 'la criatura navega el plano del piso nuevo').toBe(true);
  expect(r.abajo.niveles, 'un solo nivel en la escena').toBe(1);
  expect(r.abajo.directorActivo, 'el director sigue las reglas del piso nuevo').toBe(false);
  expect(r.abajo.partidaPiso, 'llegar guarda la partida en el piso nuevo').toBe('pruebaAbajo');
  expect(r.abajo.partidaPunto).toBe('escalera');
  expect(r.abajo.arribaGuardado, 'la partida recuerda lo del Piso 4').toBe(true);
  expect(r.abajo.distanciaLlegada, 'aparezco en el punto de llegada').toBeLessThan(0.3);

  // El tramo se encuentra mirando la escalera, como cualquier cosa del mundo.
  expect(r.tramo).toEqual({ id: 'subida', texto: 'Subir al Piso 4' });

  // Arriba otra vez: el Piso 4 sigue como lo dejé, y lo de abajo quedó recordado.
  expect(r.arriba).toEqual({
    leyoOrden: true,
    hizoPrueba: false,
    documentos: ['orden_trabajo'],
    objetivo: expect.any(String),
    abajoRecordado: true,
    criaturaEnEstePlano: true,
    niveles: 1,
    directorActivo: true,
    partidaPiso: 'piso4',
    abajoGuardado: true,
  });
  expect(r.arriba.objetivo).not.toBe('prueba');
  expect(r.abajoOtraVez, 'al volver a bajar, abajo sigue como lo dejé (objetivo cumplido)').toEqual({ hizoPrueba: true, objetivo: null });
  expect(r.cambios).toEqual(['piso4→pruebaAbajo', 'pruebaAbajo→piso4', 'piso4→pruebaAbajo', 'pruebaAbajo→piso4']);

  // La memoria de la GPU: después de cada vuelta, lo mismo que antes de bajar.
  expect(r.memoriaTrasUnViaje, `antes de bajar: ${JSON.stringify(r.memoriaInicial)}`).toEqual(r.memoriaInicial);
  expect(r.memoriaTrasDosViajes).toEqual(r.memoriaInicial);
  expect(r.estado).toBe('jugando');
  expect(errores).toEqual([]);
});
