// El citófono de la portería (P1-guion, tanda 2), en el juego real, caminando y en orden:
// 1) leo el libro de minuta y, junto al panel, sale la pista. Timbro a los contadores: el botón hace un clic pequeño
//    donde estoy, el timbre suena allá tres veces y ella (dentro de los muros, al otro lado del vestíbulo) va hacia lo
//    que suena. La línea queda ocupada: otro botón no hace nada.
// 2) tomo las llaves y, poco después, el citófono suena solo: llaman desde el ascensor. Contesto: estática, la voz de
//    Hernando y ella escuchando por la línea. Me quedo quieto y aguanto el aire cuando escucha: la línea se corta.
// El director queda quieto: aquí se prueba el citófono, no las cazas.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { calmar, instalarAyudas, llegarAlPiso1 } from './ayudasPiso2';

declare global {
  interface Window {
    /** Lo que pasó con el citófono: subtítulos, pistas, ruidos, eventos del citófono y encuentros, con su tiempo. */
    __registro?: Array<{ que: string; t: number; x?: number; z?: number; intensidad?: number }>;
  }
}

test.describe.serial('El citófono de la portería', () => {
  test.setTimeout(360_000);
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
    expect((await llegarAlPiso1(page)).piso).toBe('piso1');
    await calmar(page);
    await page.evaluate(() => {
      const { ctx } = window.__juego!;
      const registro: NonNullable<Window['__registro']> = [];
      const anotar = (que: string, extra: { x?: number; z?: number; intensidad?: number } = {}) => registro.push({ que, t: ctx.programador.ahora, ...extra });
      ctx.bus.on('subtitulo', (s) => anotar(s.texto));
      ctx.bus.on('pista', (p) => anotar(`pista:${p.id}`));
      ctx.bus.on('sonido-relevante', (s) => anotar(`suena:${s.descripcion}`));
      ctx.bus.on('citofono', (c) => anotar(`citofono:${c.accion}:${c.timbre}`));
      ctx.bus.on('encuentro', (e) => anotar(`encuentro:${e.estado}`));
      ctx.bus.on('ruido', (r) => {
        if (r.causa === 'citofono') anotar(`ruido:${r.origen}`, { x: r.x, z: r.z, intensidad: r.intensidad });
      });
      window.__registro = registro;
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('la pista junto al panel; timbrar a los contadores la lleva hacia allá, y la línea queda ocupada', async ({}, info) => {
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const registro = window.__registro!;
      const C = 1.3;
      // A la portería, a leer el libro.
      await P.caminar([[5.5, 10.5], [6.6, 10.5], [10, 10.5], [22.4, 10.5]], 0.18);
      await window.__abrirPuerta!('pPorteria');
      await P.caminar([[24.5, 10.5], [28.0, 10.45]], 0.18);
      await window.__usar!('docMinuta');
      await P.esperarEstado('documento');
      await P.esperarReal(300);
      await P.pulsar('KeyE');
      await P.esperarEstado('jugando');
      // Frente al panel.
      await P.caminar([[28.1, 11.3]], 0.15);
      await P.esperarJuego(0.4);
      const pista = registro.some((x) => x.que === 'pista:citofono');
      // Ella, dentro de los muros, al otro lado del vestíbulo; sin nada en la memoria.
      const E = ctx.entidad;
      if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
      E.posicion.x = 10 * C;
      E.posicion.z = 12.5 * C;
      E.memoria.ultimoRuido = null;
      E.memoria.sospecha = 0;
      const timbre = { x: 16.8 * C, z: 1.1 * C };
      const distanciaAntes = Math.hypot(E.posicion.x - timbre.x, E.posicion.z - timbre.z);
      const desde = registro.length;
      const texto = await window.__usar!('panelCitofono:timbreContadores');
      const yo = { x: ctx.jugador.posicion.x, z: ctx.jugador.posicion.z };
      await P.esperarJuego(6);
      const nuevos = registro.slice(desde);
      const distanciaDespues = Math.hypot(E.posicion.x - timbre.x, E.posicion.z - timbre.z);
      // (Lo leo de nuevo: TypeScript cree que sigue en null desde que lo limpié, pero ella lo cambió al oír.)
      const memoria = E.memoria.ultimoRuido as { x: number; z: number } | null;
      // Otro botón con la línea ocupada: nada.
      const ocupadoDesde = registro.length;
      const textoOcupado = await window.__usar!('panelCitofono:timbreAscensor');
      await P.esperarJuego(2);
      const trasOcupado = registro.slice(ocupadoDesde).map((x) => x.que);
      // La luz del panel, con la linterna.
      const panel = ctx.nivel.citofonos[0];
      P.mirarA(panel.objeto.position.x, panel.objeto.position.y, panel.objeto.position.z);
      await P.esperarJuego(0.3);
      return {
        pista,
        texto,
        clic: nuevos.filter((x) => x.que === 'ruido:jugador').map((x) => ({ intensidad: x.intensidad, lejos: Math.hypot(x.x! - yo.x, x.z! - yo.z) })),
        timbres: nuevos.filter((x) => x.que === 'ruido:entorno').map((x) => ({ x: x.x, z: x.z, intensidad: x.intensidad })),
        subtitulo: nuevos.some((x) => x.que === 'suena:el timbre de los contadores'),
        distanciaAntes,
        distanciaDespues,
        memoria: memoria ? Math.hypot(memoria.x - timbre.x, memoria.z - timbre.z) : null,
        textoOcupado,
        trasOcupado,
        timbre,
      };
    });
    await page.screenshot({ path: info.outputPath('1-el-citofono.png') });
    expect(r.pista, 'junto al panel, después de leer el libro, la pista').toBe(true);
    expect(r.texto).toBe('Timbrar a los contadores');
    expect(r.clic, 'un clic pequeño, donde estoy').toEqual([{ intensidad: 0.15, lejos: expect.any(Number) }]);
    expect(r.clic[0].lejos).toBeLessThan(0.3);
    expect(r.timbres, 'el timbre suena allá, tres veces y fuerte').toHaveLength(3);
    for (const t of r.timbres) expect(t).toEqual({ x: r.timbre.x, z: r.timbre.z, intensidad: 0.8 });
    expect(r.subtitulo, 'el subtítulo del timbre, con su dirección').toBe(true);
    expect(r.memoria, 'ella lo oyó desde los muros').not.toBeNull();
    expect(r.memoria!).toBeLessThan(0.5);
    expect(r.distanciaAntes - r.distanciaDespues, 'y va hacia allá').toBeGreaterThan(4);
    expect(r.textoOcupado).toBe('Línea ocupada');
    expect(r.trasOcupado).toContain('La línea sigue ocupada.');
    expect(r.trasOcupado.some((q) => q.startsWith('ruido:')), 'ocupado no suena').toBe(false);
  });

  test('tomo las llaves y ella llama desde el ascensor: contesto, la voz de Hernando; quieto y sin aire, la línea se corta', async ({}, info) => {
    await calmar(page);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const registro = window.__registro!;
      const hay = (que: string) => registro.some((x) => x.que === que);
      const esperar = async (que: string, ms: number) => {
        const fin = performance.now() + ms;
        while (!hay(que) && performance.now() < fin) await P.esperarReal(30);
        return hay(que);
      };
      // Al cuarto de don Aurelio, por las llaves.
      await P.caminar([[26.5, 10.6], [26.5, 9.2], [26.5, 8.5]], 0.15);
      await window.__abrirPuerta!('pCuarto101');
      await P.caminar([[26.5, 7.5], [26.5, 6.2], [28.2, 3.5]], 0.15);
      await window.__usar!('llavesAurelio', -0.6);
      await P.esperarJuego(0.6);
      const llaves = ctx.progreso.tieneObjeto('llaves_aurelio');
      // De vuelta al panel. Suena solo.
      await P.caminar([[26.5, 6.2], [26.5, 7.5], [26.5, 8.6], [26.0, 10.6], [28.1, 11.3]], 0.15);
      const llamo = await esperar('citofono:llamada:timbreAscensor', 15_000);
      const subtituloLlamada = hay('[El citófono suena solo. La luz del ascensor parpadea]');
      // Cuando se quede escuchando, aguanto el aire; quieto todo el rato.
      ctx.bus.on('encuentro', (e) => {
        if (e.estado === 'inicio') P.sostener('KeyQ');
        else P.soltar('KeyQ');
      });
      const texto = await window.__usar!('panelCitofono:timbreAscensor');
      const escucho = await esperar('encuentro:inicio', 15_000);
      const termino = await esperar('encuentro:superado', 15_000);
      P.soltar('KeyQ');
      await P.esperarJuego(0.5);
      return {
        llaves,
        llamo,
        subtituloLlamada,
        texto,
        voz: registro.some((x) => x.que.includes('la voz de Hernando')),
        escucho,
        termino,
        fallo: hay('encuentro:fallido'),
        corta: hay('[La línea se corta]'),
        colgada: hay('citofono:colgada:timbreAscensor'),
        banderas: ['citofono:llamo', 'citofono:contesto'].map((b) => ctx.progreso.tiene(b)),
        director: ctx.director.activo,
        manifestarse: ctx.entidad.puedeManifestarse,
        estado: J.estado,
      };
    });
    await page.screenshot({ path: info.outputPath('2-la-linea-se-corta.png') });
    expect(r.llaves).toBe(true);
    expect(r.llamo, 'poco después de tomar las llaves, el citófono suena solo').toBe(true);
    expect(r.subtituloLlamada).toBe(true);
    expect(r.texto).toBe('Contestar');
    expect(r.voz, 'por la línea, la voz de Hernando').toBe(true);
    expect(r.escucho, 'después, ella se queda escuchando').toBe(true);
    expect(r.termino, 'quieto y sin aire: no me oyó').toBe(true);
    expect(r.fallo).toBe(false);
    expect(r.corta).toBe(true);
    expect(r.colgada).toBe(true);
    expect(r.banderas).toEqual([true, true]);
    expect(r.director, 'el director vuelve').toBe(true);
    expect(r.manifestarse, 'y ella vuelve a poder salir').toBe(true);
    expect(r.estado).toBe('jugando');
  });
});
