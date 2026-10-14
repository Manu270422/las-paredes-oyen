// El Piso 2 (P2-guion, tanda 1), jugado caminando y en orden:
// 1) con el Piso 4 y el 3 ya terminados (lo prueban sus propios recorridos), bajo por los escalones del 4 al 3 y del 3
//    al 2, cruzando cada descanso. La escalera que sigue bajando está tapiada: empujo contra el ladrillo y no paso.
// 2) en el 201 leo el libro de quejas; en el 202 grabo el cuarto sordo con la X; la cinta trae la voz de Hernando y
//    algo de metal: aparece la llave de servicio en el rincón. Con ella, llamo el ascensor, entro y pulso el 1: la
//    cabina se detiene a mitad de camino con ella encima (aguanto el aire), sigue, a oscuras se abren las puertas y
//    la partida termina ("Próximamente: Piso 1").
// Ella y el director quedan quietos: aquí se prueba el camino del piso, no su caza.
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { calmar, instalarAyudas } from './ayudasPiso2';

test.describe.serial('El Piso 2 caminando', () => {
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
    await elegirYEmpezar(page, 'Historia');
    await esperarJugando(page);
    await instalarAyudas(page);
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

  test('bajo caminando del 4 al 3 y del 3 al 2; abajo, la escalera que sigue está tapiada', async ({}, info) => {
    // El Piso 4 terminado y su reja abierta: bajo al 3 por los escalones.
    await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      ctx.progreso.agregarObjeto('llave_escalera');
      ctx.progreso.marcarSilencioso('medido:402');
      ctx.progreso.marcarSilencioso('abierta:bajada');
      ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
      const P = window.__piloto!;
      if (!ctx.linterna.encendida) await P.pulsar('KeyF');
      await P.caminar([[1.5, 10.45], [1.5, 11.2], [1.5, 12.0], [1.5, 12.65]], 0.15);
    });
    await calmar(page);
    expect(await page.evaluate(() => window.__cruzarDescanso!(3.5, 12.65))).toBe('piso3');
    await calmar(page);
    // En el 3, su final ya pasó (lo prueba finalPiso3.spec): la reja de abajo está abierta. Bajo al 2.
    await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      for (const b of ['cinta:302', 'final:piso3', 'reja:piso2', 'abierta:bajada']) ctx.progreso.marcarSilencioso(b);
      ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
      await window.__piloto!.caminar([[3.5, 11.6], [3.5, 10.45], [1.5, 10.45], [1.5, 11.2], [1.5, 12.0], [1.5, 12.65]], 0.15);
    });
    await calmar(page);
    expect(await page.evaluate(() => window.__cruzarDescanso!(3.5, 12.65)), 'al cruzar el descanso llegué al Piso 2').toBe('piso2');
    await calmar(page);
    const llegada = await page.evaluate(async (prefijo) => {
      const { ctx } = window.__juego!;
      await window.__piloto!.caminar([[3.5, 11.6], [3.5, 10.45], [2.6, 10.3]], 0.15);
      return {
        llego: ctx.progreso.tiene('llego:piso2'),
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
        altura: ctx.jugador.posicion.y,
        guardada: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null')?.piso ?? null,
      };
    }, 'las-paredes-oyen:');
    expect(llegada.llego).toBe(true);
    expect(llegada.objetivo, 'lo primero en el 2: averiguar').toBe('averiguar');
    expect(llegada.altura, 'en el piso del Piso 2').toBeCloseTo(0, 2);
    expect(llegada.guardada, 'llegar caminando guarda').toBe('piso2');

    // Empujo contra el tramo que baja: el ladrillo no deja pasar.
    const tapia = await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      const P = window.__piloto!;
      await P.caminar([[1.5, 10.45]], 0.12);
      ctx.jugador.yaw = Math.PI;
      ctx.jugador.pitch = 0;
      P.sostener('KeyW');
      await P.esperarJuego(2);
      P.soltar('KeyW');
      const p = ctx.jugador.posicion;
      ctx.jugador.pitch = -0.1;
      await P.esperarJuego(0.4);
      return { y: p.z / 1.3, altura: p.y, piso: ctx.piso.id };
    });
    await page.screenshot({ path: info.outputPath('1-la-tapia.png') });
    expect(tapia.y, 'me quedo antes del ladrillo (la boca del tramo empieza en y = 11)').toBeLessThan(11);
    expect(tapia.altura, 'no bajé ni un escalón').toBeCloseTo(0, 2);
    expect(tapia.piso).toBe('piso2');
  });

  test('libro de quejas, el cuarto sordo, la llave en el rincón y el ascensor al 1: fin de la partida', async ({}, info) => {
    await calmar(page);
    const oficina = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      await P.caminar([[3.6, 10.5], [7.5, 10.55]], 0.18);
      await window.__abrirPuerta!('p201');
      await P.caminar([[7.5, 9.5], [7.5, 8.0], [7.6, 6.3]], 0.18);
      const enOficina = ctx.memoria.habitacionActual;
      const texto = await window.__usar!('docLibroQuejas');
      await P.esperarEstado('documento');
      await P.esperarReal(300);
      await P.pulsar('KeyE');
      await P.esperarEstado('jugando');
      return { enOficina, texto, leido: ctx.progreso.tiene('leyo:libro_quejas'), objetivo: ctx.progreso.objetivoActual()?.id ?? null };
    });
    await page.screenshot({ path: info.outputPath('2-la-oficina.png') });
    expect(oficina.enOficina).toBe('oficina201');
    expect(oficina.texto).toBe('Leer el libro de quejas');
    expect(oficina.leido).toBe(true);
    expect(oficina.objetivo).toBe('grabar');

    await calmar(page);
    const sordo = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      await P.caminar([[7.5, 8.0], [7.5, 9.5], [7.5, 10.5], [13.6, 10.4], [14.5, 10.4]], 0.18);
      await window.__abrirPuerta!('p202');
      await P.caminar([[14.5, 11.5], [14.5, 12.6], [13.5, 12.9]], 0.18);
      const llaveAntes = ctx.nivel.interactuables.find((i) => i.id === 'llaveServicio')!.objeto.visible;
      P.sostener('KeyQ');
      const texto = await window.__usar!('medir202', -1.2);
      const inicio = ctx.programador.ahora;
      while (!ctx.progreso.tiene('medido:202') && ctx.programador.ahora < inicio + 10) await P.esperarReal(30);
      P.soltar('KeyQ');
      const fin = performance.now() + 30_000;
      while (!ctx.progreso.tiene('cinta:202') && performance.now() < fin) await P.esperarReal(50);
      return {
        texto,
        enSala: ctx.memoria.habitacionActual,
        medido: ctx.progreso.tiene('medido:202'),
        cinta: ctx.progreso.tiene('cinta:202'),
        voz: subs.some((s) => s.includes('Son las tuberías')),
        metal: subs.some((s) => s.includes('Algo de metal')),
        llaveAntes,
        llaveDespues: ctx.nivel.interactuables.find((i) => i.id === 'llaveServicio')!.objeto.visible,
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
      };
    });
    expect(sordo.enSala).toBe('sala202');
    expect(sordo.texto).toBe('Grabar el cuarto sordo (quédate quieto)');
    expect(sordo.medido).toBe(true);
    expect(sordo.cinta).toBe(true);
    expect(sordo.voz, 'la cinta trae la voz de Hernando').toBe(true);
    expect(sordo.metal, 'y algo de metal que cae').toBe(true);
    expect(sordo.llaveAntes, 'la llave no estaba antes de la cinta').toBe(false);
    expect(sordo.llaveDespues, 'aparece al terminar la cinta').toBe(true);
    expect(sordo.objetivo).toBe('llave');

    await calmar(page);
    const llave = await page.evaluate(async () => {
      const { ctx } = window.__juego!;
      const P = window.__piloto!;
      await P.caminar([[16.4, 13.1], [19.8, 13.2], [20.2, 14.9]], 0.18);
      const texto = await window.__usar!('llaveServicio');
      await P.esperarJuego(0.5);
      return { texto, tiene: ctx.progreso.tieneObjeto('llave_servicio'), objetivo: ctx.progreso.objetivoActual()?.id ?? null };
    });
    await page.screenshot({ path: info.outputPath('3-con-la-llave.png') });
    expect(llave.texto).toBe('Tomar la llave');
    expect(llave.tiene).toBe(true);
    expect(llave.objetivo).toBe('bajar');

    await calmar(page);
    const final = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const ascensor = ctx.nivel.ascensor!;
      await P.caminar([[19.8, 13.2], [16.4, 13.1], [14.5, 12.6], [14.5, 11.5], [14.5, 10.4], [7.0, 10.5], [5.3, 10.45]], 0.18);
      await window.__usar!(ascensor.botones[0].id);
      const limite = performance.now() + 20_000;
      while (ascensor.fase !== 'abierto' && performance.now() < limite) await P.esperarReal(50);
      const faseAlLlamar = ascensor.fase;
      await P.caminar([[5.5, 10.6], [5.5, 11.45]], 0.12);
      const boton1 = ascensor.botones.find((b) => b.hacia === 'piso1')!;
      // A mitad de la bajada la cabina se detiene y ella escucha desde el techo (cabinaDetenida.spec lo prueba a
      // fondo): cuando se queda quieta, aguanto el aire hasta que se va, como una persona.
      const encuentros: string[] = [];
      const dejar = ctx.bus.on('encuentro', (e) => {
        encuentros.push(e.estado);
        if (e.estado === 'inicio') P.sostener('KeyQ');
        else P.soltar('KeyQ');
      });
      const texto = await window.__usar!(boton1.id);
      const finPartida = performance.now() + 60_000;
      while (J.estado !== 'fin' && performance.now() < finPartida) await P.esperarReal(50);
      dejar();
      P.soltar('KeyQ');
      return {
        faseAlLlamar,
        texto,
        encuentros,
        estado: J.estado,
        titulo: document.querySelector('.fin__titulo')?.textContent ?? null,
        siguiente: document.querySelector('.fin__siguiente')?.textContent ?? null,
      };
    });
    await page.screenshot({ path: info.outputPath('4-fin.png') });
    expect(final.faseAlLlamar, 'llamado, el ascensor llega y abre').toBe('abierto');
    expect(final.texto).toBe('Bajar al Piso 1');
    expect(final.encuentros, 'a mitad de la bajada, ella escuchó desde el techo y aguanté').toEqual(['inicio', 'superado']);
    expect(final.estado, 'la partida termina').toBe('fin');
    expect(final.titulo).toBe('Piso 2 completado');
    expect(final.siguiente ?? '').toContain('Piso 1');
  });
});
