// Los rastros del Piso 3, caminando: bajo por la escalera con la llave (la prueba me la da: el final del 402
// ya lo camina guion.spec.ts), me doy vuelta en el descanso ("HUYE"), avanzo por el pasillo y miro arriba (la
// humedad, justo debajo del charco del Piso 4), sigo hasta el fondo ("ESCAPA", sobre el servicio tapiado) y
// vuelvo al 303 (la frase, la mano y el charco en el muro del hueco). Cada uno lo mido con el medidor
// (medidorRastros.ts): visto, se ve con la linterna, y se ve menos sin ella.
//
// En el Piso 3 la criatura está despierta desde que llego: la dejo en las paredes y al director quieto, porque
// aquí se prueban los rastros (y que el pasillo y el 303 se pueden caminar de verdad).
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { comprobarMedidas, instalarMedidor, type MedidaRastro } from './medidorRastros';

test('los rastros del Piso 3 están donde dicen los datos, se ven con la linterna y el juego los da por vistos', async ({ page }) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await instalarMedidor(page);

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const M = window.__medidor!;
    const { ctx } = J;

    // La llave de la escalera, sin disparar el final del 402 (en silencio, con su luz).
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcarSilencioso('medido:402');
    // La reja ya abierta: abrirla con la llave lo prueba llaveEscalera.spec.ts.
    ctx.progreso.marcarSilencioso('abierta:bajada');
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    ctx.nivel.aplicarLuzDe('medido:402');
    await P.caminar([[2.2, 9.5]]);
    const tramo = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
    P.mirarA(tramo.x, tramo.y, tramo.z);
    await P.esperarJuego(0.3);
    const enfocado = J.interaccion.enfocado?.id ?? 'nada';
    if (enfocado !== 'bajada') throw new Error(`Al asomarme al tramo enfoqué "${enfocado}", no la bajada.`);
    await P.pulsar('KeyE');
    const limite = performance.now() + 20_000;
    while (!(J.estado === 'jugando' && ctx.piso.id === 'piso3') && performance.now() < limite) await P.esperarReal(30);
    if (ctx.piso.id !== 'piso3') throw new Error(`No bajé al Piso 3: sigo en ${ctx.piso.id} (estado ${J.estado}).`);
    await P.esperarJuego(0.3);
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);

    const defs = ctx.piso.rastros ?? [];
    const enEscena = defs.filter((d) => ctx.escena.getObjectByName(`rastro:${d.id}`)).map((d) => d.id);
    const sinVerAlLlegar = [...ctx.nivel.vigiaRastros.sinVer];
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
    const medidas: MedidaRastro[] = [];
    const medir = async (id: string) => medidas.push(await M.medir(id));

    // 1. "HUYE", en el muro oeste del descanso: al llegar queda a la espalda.
    await P.caminar([[2.6, 9.6]]);
    await medir('frase_descanso3');

    // 2. La humedad del techo: por el pasillo (pegado al muro de enfrente de cada bolsa) y miro arriba.
    await P.caminar([[3.6, 10.5], [7.6, 10.68], [9.4, 10.68], [10.6, 10.35], [12.9, 10.35]]);
    await medir('humedad_pasillo');

    // 3. "ESCAPA", al fondo: paso la puerta del 303 y la última bolsa, y me paro antes de la caja.
    await P.caminar([[16, 10.35], [21.5, 10.5], [22.6, 10.72], [25, 10.72], [26.4, 10.55]]);
    await medir('frase_tapiado');

    // 4. El 303: vuelvo a su puerta, entro y miro el muro del hueco (la frase, la mano y el charco).
    await P.caminar([[25, 10.72], [22.6, 10.72], [21.2, 10.5], [20.5, 10.45]]);
    await abrir('p303');
    await P.caminar([[20.5, 9.4], [20.5, 8.3], [18.3, 7.4]], 0.18);
    const habitacion = ctx.memoria.habitacionActual;
    await medir('frase_hueco303');
    await medir('mano_303');
    await medir('charco_303');

    return {
      piso: ctx.piso.id,
      ids: defs.map((d) => d.id),
      enEscena,
      sinVerAlLlegar,
      sinVerAlFinal: [...ctx.nivel.vigiaRastros.sinVer],
      habitacion,
      medidas,
      estado: J.estado,
    };
  });

  console.log(JSON.stringify(r.medidas));
  expect(r.piso, 'bajé al Piso 3').toBe('piso3');
  expect(r.ids, 'el Piso 3 declara sus seis rastros').toEqual(['humedad_pasillo', 'frase_descanso3', 'frase_tapiado', 'frase_hueco303', 'mano_303', 'charco_303']);
  expect(r.enEscena, 'todos están en la escena').toEqual(r.ids);
  expect(r.sinVerAlLlegar, 'al llegar no se ha visto ninguno').toEqual(r.ids);
  expect(r.habitacion, 'el 303 se puede caminar desde el pasillo').toBe('sala303');
  expect(r.medidas.map((m) => m.id).sort(), 'los medí todos').toEqual([...r.ids].sort());
  comprobarMedidas(r.medidas);
  expect(r.sinVerAlFinal, 'al final del recorrido los vi todos').toEqual([]);
  expect(r.estado).toBe('jugando');
  expect(errores).toEqual([]);
});
