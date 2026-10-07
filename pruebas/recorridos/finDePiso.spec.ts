// El fin de un piso en el juego real. Juego el final del 402 (su guion de verdad), despierto en la escalera y
// bajo: sobre el negro del viaje sale la tarjeta "Piso 4 superado" con lo que dejó el piso, y E la adelanta.
// Subo y vuelvo a bajar: ya no sale (quedó vista, también en la partida guardada). Al terminar la partida en el
// Piso 3, la pantalla final trae una línea por piso.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, PREFIJO } from './acciones';

test('la tarjeta del piso completado sale una vez al bajar, sobre el negro, y la pantalla final trae una línea por piso', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);

  const r = await page.evaluate(async (prefijo) => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const fin = (J as unknown as { finDePiso: { exportar(): Array<{ piso: string; tarjetaVista: boolean }> } }).finDePiso;
    const tarjeta = () => document.querySelector('.fundido .tarjeta--visible');
    const negro = () => Number(getComputedStyle(document.querySelector('.fundido')!).opacity);

    // El final del 402: su guion despierta al jugador en la escalera (un viaje al mismo piso).
    let desperto = false;
    ctx.bus.on('piso-cambiado', ({ desde, hacia }) => (desperto ||= desde === 'piso4' && hacia === 'piso4'));
    ctx.progreso.marcar('medido:402');
    const l1 = performance.now() + 40_000;
    while (!(desperto && J.estado === 'jugando') && performance.now() < l1) await P.esperarReal(50);
    await P.esperarJuego(0.5);
    const completadosAlDespertar = fin.exportar();
    const tarjetaAlDespertar = tarjeta() !== null;
    // La llave de la reja está bajo la silla del 402: aquí la tomo directo (caminarla es de llaveEscalera.spec.ts).
    ctx.nivel.interactuables.find((i) => i.id === 'llaveEscalera')!.interactuar(ctx);

    /** Bajo o subo por el tramo `id`; mientras viajo, anoto la tarjeta que vea (y si la pantalla estaba a negro). */
    const viajar = async (id: string, hacia: string, adelantar: boolean) => {
      await P.caminar([[2.2, 9.5]]);
      const zona = ctx.nivel.interactuables.find((i) => i.id === id)!.objeto.position;
      P.mirarA(zona.x, zona.y, zona.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      // La reja con candado: la primera vez, E la abre; ya abierta, E baja.
      await P.esperarJuego(0.2);
      const reja = ctx.nivel.rejas[0];
      if (id === 'bajada' && reja?.abriendo) {
        const fin = performance.now() + 8000;
        while (!reja.abierta && performance.now() < fin) await P.esperarReal(30);
        await P.esperarJuego(0.3);
        await P.pulsar('KeyE');
      }
      const inicio = performance.now();
      let vista: { titulo: string; subtitulo: string; negro: number; desde: number } | null = null;
      let adelantada = false;
      const limite = inicio + 20_000;
      while (!(J.estado === 'jugando' && ctx.piso.id === hacia) && performance.now() < limite) {
        const t = tarjeta();
        if (t && !vista) vista = { titulo: t.querySelector('h2')?.textContent ?? '', subtitulo: t.querySelector('p')?.textContent ?? '', negro: negro(), desde: performance.now() };
        if (vista && adelantar && !adelantada && performance.now() - vista.desde > 1200) {
          adelantada = true;
          await P.pulsar('KeyE');
        }
        await P.esperarReal(30);
      }
      return { vista, llegada: ctx.piso.id, desdeLaTarjeta: vista ? performance.now() - vista.desde : null };
    };

    const primera = await viajar('bajada', 'piso3', true);
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    const guardadaTrasBajar = JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null');
    await P.esperarJuego(0.5);
    const subida = await viajar('subida', 'piso4', false);
    await P.esperarJuego(0.5);
    const segunda = await viajar('bajada', 'piso3', false);
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    await P.esperarJuego(0.5);

    // El último piso pide terminar la partida (hoy ningún piso lo hace: lo pido como lo haría su guion).
    (J as unknown as { accionesGuion: { terminarPartida(): void } }).accionesGuion.terminarPartida();
    await P.esperarReal(300);
    return {
      completadosAlDespertar,
      tarjetaAlDespertar,
      primera,
      guardadaTrasBajar: guardadaTrasBajar?.pisosCompletados ?? null,
      subida: subida.vista,
      segunda: segunda.vista,
      estado: J.estado,
      titulo: document.querySelector('.fin__titulo')?.textContent ?? '',
      pisos: [...document.querySelectorAll('.fin__pisos li')].map((li) => li.textContent ?? ''),
      pisosVisibles: !(document.querySelector('.fin__pisos') as HTMLElement | null)?.hidden,
    };
  }, PREFIJO);

  expect(r.completadosAlDespertar.map((p) => p.piso), 'despertar completa el Piso 4').toEqual(['piso4']);
  expect(r.tarjetaAlDespertar, 'despertar no muestra la tarjeta (no salí del piso)').toBe(false);
  expect(r.primera.llegada).toBe('piso3');
  expect(r.primera.vista?.titulo, 'al bajar por primera vez sale la tarjeta').toBe('Piso 4 superado');
  expect(r.primera.vista?.subtitulo, 'con lo que dejó el piso').toMatch(/^\d+:\d\d · (no te oyó|te oyó \d+ (vez|veces)) · (nada cambió|\d+ cosas? cambi(ó|aron))$/);
  expect(r.primera.vista?.negro, 'sobre el negro del viaje').toBeGreaterThan(0.95);
  expect(r.primera.desdeLaTarjeta, 'E la adelanta (sin E dura 5 s)').toBeLessThan(3000);
  expect(r.guardadaTrasBajar, 'la partida guardada al llegar la da por vista').toMatchObject([{ piso: 'piso4', tarjetaVista: true }]);
  expect(r.subida, 'subir no muestra tarjeta').toBeNull();
  expect(r.segunda, 'volver a bajar tampoco: ya la vi').toBeNull();
  expect(r.estado).toBe('fin');
  expect(r.titulo).toBe('Piso 3 completado');
  expect(r.pisosVisibles, 'con dos pisos, la lista se ve').toBe(true);
  expect(r.pisos).toHaveLength(2);
  expect(r.pisos[0]).toMatch(/^Piso 4\d+:\d\d · /);
  expect(r.pisos[1]).toMatch(/^Piso 3\d+:\d\d · /);
  expect(errores).toEqual([]);
});
