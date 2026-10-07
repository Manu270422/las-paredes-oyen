// La escalera no es una salida mientras ella caza (hasta que la escalera se camine). Con la llave en la mano me
// asomo al tramo, ella sale a cazarme desde el fondo del pasillo, pulso E y la cadena se traba: sigo en el Piso 4.
// Cuando deja de cazar, la misma E me baja al Piso 3: el bloqueo no se queda pegado.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';

test('durante la caza la escalera no responde (suena la cadena); al terminar la caza, sí', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const C = 1.3;
    const subtitulos: string[] = [];
    const sonidos: string[] = [];
    ctx.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
    // La llave, sin disparar el final del 402: así lo único que puede impedir el viaje es la caza.
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcarSilencioso('medido:402');
    // La reja ya abierta: abrirla con la llave lo prueba llaveEscalera.spec.ts.
    ctx.progreso.marcarSilencioso('abierta:bajada');
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    await P.caminar([[2.2, 9.5]]);
    const zona = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
    const asomarme = async () => {
      P.mirarA(zona.x, zona.y, zona.z);
      await P.esperarJuego(0.3);
      return J.interaccion.enfocado?.id ?? null;
    };

    // Ella sale al pasillo, a unos 10 m, y caza (con su aviso: tarda segundos en llegar).
    ctx.entidad.puedeManifestarse = true;
    ctx.entidad.manifestar(10 * C, 10.5 * C, ctx);
    ctx.entidad.cazar('paso', ctx);
    const enfocadoEnCaza = await asomarme();
    const criaturaAlPulsar = ctx.entidad.estado;
    const reproducir = ctx.audio.reproducir.bind(ctx.audio);
    ctx.audio.reproducir = ((id: Parameters<typeof reproducir>[0], o?: Parameters<typeof reproducir>[1]) => {
      sonidos.push(id);
      return reproducir(id, o);
    }) as typeof ctx.audio.reproducir;
    await P.pulsar('KeyE');
    await P.esperarJuego(0.4);
    const enCaza = { piso: ctx.piso.id, estado: J.estado, traba: subtitulos.includes('[La cadena se traba]'), cadena: sonidos.includes('cerradura') };
    ctx.audio.reproducir = reproducir;

    // Deja de cazar (vuelve a las paredes): la misma E me baja.
    ctx.entidad.cambiarEstado('paredes', ctx);
    ctx.director.bloquear(999);
    const enfocadoDespues = await asomarme();
    await P.pulsar('KeyE');
    const limite = performance.now() + 20_000;
    while (!(J.estado === 'jugando' && ctx.piso.id === 'piso3') && performance.now() < limite) await P.esperarReal(30);
    return { enfocadoEnCaza, criaturaAlPulsar, enCaza, enfocadoDespues, pisoFinal: ctx.piso.id, estadoFinal: J.estado };
  });

  expect(r.enfocadoEnCaza, 'me asomé al tramo de bajada').toBe('bajada');
  expect(r.criaturaAlPulsar, 'al pulsar E ella estaba cazando (si no, la prueba no prueba nada)').toBe('cazando');
  expect(r.enCaza.piso, 'en plena caza no viajé').toBe('piso4');
  expect(r.enCaza.estado).toBe('jugando');
  expect(r.enCaza.traba, 'el subtítulo dice que la cadena se trabó').toBe(true);
  expect(r.enCaza.cadena, 'sonó la cadena').toBe(true);
  expect(r.enfocadoDespues).toBe('bajada');
  expect(r.pisoFinal, 'sin caza, la misma escalera me baja al Piso 3').toBe('piso3');
  expect(r.estadoFinal).toBe('jugando');
  expect(errores).toEqual([]);
});
