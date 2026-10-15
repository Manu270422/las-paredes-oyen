// El Piso 1 (P1-guion, tanda 1), jugado caminando y en orden, hasta el final del juego:
// 1) llego en la cabina desde el 2 (aguanto el aire cuando se detiene). Al abrirse las puertas el tubo revienta y el
//    ascensor se queda sin corriente: ningún botón sube.
// 2) en la portería leo el libro de minuta de don Aurelio; en su cuarto tomo las llaves (guarda ANTES de la puerta).
// 3) en el vestíbulo abro las tres cerraduras de la puerta principal: la cadena, el cerrojo y la llave. Salgo:
//    "Sobreviviste", la ventana del 401 y los créditos.
// Ella y el director quedan quietos: aquí se prueba el camino del piso (las cerraduras con ella cerca, en su tanda).
import { expect, test, type Page } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, PREFIJO } from './acciones';
import { calmar, instalarAyudas, llegarAlPiso1 } from './ayudasPiso2';

test.describe.serial('El Piso 1 caminando, hasta salir del edificio', () => {
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
    await page.evaluate(() => {
      const registro: string[] = [];
      window.__juego!.ctx.bus.on('subtitulo', (s) => registro.push(s.texto));
      window.__juego!.ctx.bus.on('tarjeta', (t) => registro.push(`tarjeta: ${t.titulo} / ${t.subtitulo}`));
      (window as unknown as { __subtitulos: string[] }).__subtitulos = registro;
    });
  });

  test.afterEach(() => {
    expect(errores, 'errores de consola').toEqual([]);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('llego en la cabina: el tubo revienta y el ascensor ya no sube', async ({}, info) => {
    const llegada = await llegarAlPiso1(page);
    expect(llegada.piso).toBe('piso1');
    expect(llegada.encuentros, 'la cabina se detuvo y aguanté').toEqual(['inicio', 'superado']);
    await calmar(page);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      const ascensor = ctx.nivel.ascensor!;
      const limite = performance.now() + 15_000;
      while (ascensor.fase !== 'abierto' && performance.now() < limite) await P.esperarReal(50);
      await P.esperarJuego(0.5);
      const sinCorriente = ctx.progreso.tiene('ascensor:sin_corriente');
      const luz = ctx.nivel.lamparas.find((l) => l.id === 'luzAscensor')!.estado;
      // Pruebo subir: ningún botón se enciende.
      const subir = ascensor.botones.find((b) => b.hacia === 'piso2')!;
      const texto = await window.__usar!(subir.id);
      await P.esperarJuego(0.5);
      return {
        sinCorriente,
        luz,
        texto,
        dijo: subs.at(-1) ?? '',
        fase: ascensor.fase,
        llego: ctx.progreso.tiene('llego:piso1'),
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
        tarjeta: subs.some((s) => s.startsWith('tarjeta: Piso 2 superado')),
      };
    });
    await page.screenshot({ path: info.outputPath('1-la-porteria-a-oscuras.png') });
    expect(r.tarjeta, 'al bajar, la tarjeta del Piso 2 sobre el negro').toBe(true);
    expect(r.llego).toBe(true);
    expect(r.sinCorriente, 'al abrirse las puertas, el ascensor se queda sin corriente').toBe(true);
    expect(r.luz, 'su tubo revienta').toBe('rota');
    expect(r.texto).toBe('Subir al Piso 2');
    expect(r.dijo).toContain('sin corriente');
    expect(r.fase, 'las puertas siguen abiertas: no se va a ninguna parte').toBe('abierto');
    expect(r.objetivo).toBe('averiguar');
  });

  test('el libro de minuta en la portería y las llaves de don Aurelio en su cuarto (guarda antes de la puerta)', async ({}, info) => {
    await calmar(page);
    const r = await page.evaluate(async (prefijo) => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      await P.caminar([[5.5, 10.5], [6.6, 10.5], [10, 10.5], [22.4, 10.5]], 0.18);
      await window.__abrirPuerta!('pPorteria');
      await P.caminar([[24.5, 10.5], [28.0, 10.45]], 0.18);
      const enPorteria = ctx.memoria.habitacionActual;
      const texto = await window.__usar!('docMinuta');
      await P.esperarEstado('documento');
      await P.esperarReal(300);
      await P.pulsar('KeyE');
      await P.esperarEstado('jugando');
      const leido = ctx.progreso.tiene('leyo:minuta_aurelio');
      // Al cuarto de don Aurelio, detrás de la portería.
      await P.caminar([[26.5, 9.2], [26.5, 8.5]], 0.15);
      await window.__abrirPuerta!('pCuarto101');
      await P.caminar([[26.5, 7.5], [26.5, 6.2], [28.2, 3.5]], 0.15);
      const enCuarto = ctx.memoria.habitacionActual;
      const textoLlaves = await window.__usar!('llavesAurelio', -0.6);
      await P.esperarJuego(0.6);
      return {
        enPorteria,
        texto,
        leido,
        enCuarto,
        textoLlaves,
        llaves: ctx.progreso.tieneObjeto('llaves_aurelio'),
        objetivo: ctx.progreso.objetivoActual()?.id ?? null,
        guardada: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null')?.puntoControl ?? null,
      };
    }, PREFIJO);
    await page.screenshot({ path: info.outputPath('2-el-cuarto-de-don-aurelio.png') });
    expect(r.enPorteria).toBe('porteria');
    expect(r.texto).toBe('Leer el libro de minuta');
    expect(r.leido).toBe(true);
    expect(r.enCuarto).toBe('cuarto101');
    expect(r.textoLlaves).toBe('Tomar las llaves');
    expect(r.llaves).toBe(true);
    expect(r.objetivo).toBe('salir');
    expect(r.guardada, 'tomar las llaves guarda antes de la puerta, en el vestíbulo').toBe('vestibulo');
  });

  test('las tres cerraduras de la puerta principal y salir: "Sobreviviste" y los créditos', async ({}, info) => {
    await calmar(page);
    const r = await page.evaluate(async () => {
      const J = window.__juego!;
      const { ctx } = J;
      const P = window.__piloto!;
      const subs = (window as unknown as { __subtitulos: string[] }).__subtitulos;
      await P.caminar([[28.2, 3.5], [26.5, 6.2], [26.5, 7.5], [26.5, 8.6], [25, 10.5], [22.4, 10.5], [16, 12.9]], 0.18);
      const textos: Array<string | null> = [];
      const salida = ctx.nivel.salidas[0];
      for (let i = 0; i < 3; i++) {
        ctx.director.bloquear(999);
        ctx.entidad.puedeManifestarse = false;
        if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
        textos.push(await window.__usar!('puertaPrincipal'));
        const fin = performance.now() + 8000;
        while (salida.cerradurasAbiertas < i + 1 && performance.now() < fin) await P.esperarReal(30);
      }
      const finPartida = performance.now() + 25_000;
      while (J.estado !== 'fin' && performance.now() < finPartida) await P.esperarReal(50);
      return {
        textos,
        abiertas: salida.cerradurasAbiertas,
        afuera: subs.includes('[La puerta se abre. Afuera llueve]'),
        tarjeta: subs.find((s) => s.startsWith('tarjeta: Sobreviviste')) ?? null,
        estado: J.estado,
        titulo: document.querySelector('.fin__titulo')?.textContent ?? null,
        creditos: document.querySelector('.fin__creditos')?.textContent ?? null,
        siguienteVisible: !(document.querySelector('.fin__siguiente') as HTMLElement | null)?.hidden,
      };
    });
    await page.screenshot({ path: info.outputPath('3-sobreviviste.png') });
    expect(r.textos).toEqual(['Quitar la cadena', 'Correr el cerrojo', 'Abrir con la llave']);
    expect(r.abiertas).toBe(3);
    expect(r.afuera, 'la puerta se abre: afuera llueve').toBe(true);
    expect(r.tarjeta ?? '', 'sobre el negro, Sobreviviste y la ventana del 401').toContain('la del 401');
    expect(r.estado).toBe('fin');
    expect(r.titulo).toBe('Sobreviviste');
    expect(r.creditos ?? '').toContain('Desarrollado por El Mundo de Manu');
    expect(r.creditos ?? '').toContain('Creado y dirigido por Carlos Manuel Turizo Hernández');
    expect(r.creditos ?? '', 'la ayuda de IA va en Créditos (tecnología), no en la autoría').not.toContain('Claude');
    expect(r.siguienteVisible, 'no hay "próximamente": es el final del juego').toBe(false);
  });
});
