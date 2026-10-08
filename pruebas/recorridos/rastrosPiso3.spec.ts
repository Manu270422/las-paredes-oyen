// Los rastros del Piso 3, caminando: bajo por la escalera con la llave (la prueba me la da: el final del 402
// ya lo camina guion.spec.ts), me doy vuelta en el descanso ("HUYE"), avanzo por el pasillo y miro arriba (la
// humedad, justo debajo del charco del Piso 4), sigo hasta el fondo ("ESCAPA", sobre el servicio tapiado),
// vuelvo al 303 (la frase, la mano y el charco en el muro del hueco) y termino en el 302: el charco del umbral
// (con el arrastre hacia adentro) y las rayas de estatura del dormitorio. Cada uno lo mido con el medidor
// (medidorRastros.ts): visto, se ve con la linterna, y se ve menos sin ella.
//
// En el Piso 3 la criatura está despierta desde que llego: la dejo en las paredes y al director quieto, porque
// aquí se prueban los rastros (y que el pasillo y el 303 se pueden caminar de verdad).
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { comprobarMedidas, instalarMedidor, type MedidaRastro } from './medidorRastros';

declare global {
  interface Window {
    /** Lo que el recorrido junta entre una parte y otra (en medio saco capturas). */
    __rastros3?: { medidas: MedidaRastro[]; abrir(id: string): Promise<void> };
  }
}

test('los rastros del Piso 3 están donde dicen los datos, se ven con la linterna y el juego los da por vistos', async ({ page }, info) => {
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
    window.__rastros3 = { medidas, abrir };

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

    // 5. El 302: salgo al pasillo, abro su puerta y, desde el umbral, miro el charco que arrastraron hacia adentro.
    await P.caminar([[20.5, 8.3], [20.5, 9.4], [20.5, 10.45], [14.5, 10.4]]);
    await abrir('p302');
    await P.caminar([[14.5, 11.5], [14.5, 12.1]]);
    await medir('charco_302');

    return {
      piso: ctx.piso.id,
      ids: defs.map((d) => d.id),
      enEscena,
      sinVerAlLlegar,
      habitacion,
    };
  });
  await page.screenshot({ path: info.outputPath('charco-302.png') });

  // 6. El dormitorio del 302: las rayas de estatura en el muro de la puerta (el mismo muro que las del 402).
  const fin = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const M = window.__medidor!;
    const { ctx } = J;
    const { medidas, abrir } = window.__rastros3!;
    await P.caminar([[13.5, 15.2], [10.5, 15.5]]);
    await abrir('pDorm302');
    // Me acerco como quien quiere leer lo que dice al lado de cada raya: a 1.2 m del muro.
    await P.caminar([[10.5, 16.5], [10.6, 17.3], [11.45, 17.92]]);
    medidas.push(await M.medir('estatura_andres_302'));
    return {
      habitacion: ctx.memoria.habitacionActual,
      sinVerAlFinal: [...ctx.nivel.vigiaRastros.sinVer],
      medidas,
      estado: J.estado,
    };
  });
  await page.screenshot({ path: info.outputPath('estatura-302.png') });
  // Y de cerca, como quien se agacha a leer lo que dice al lado de cada raya (la captura es para juzgarla a ojo).
  await page.evaluate(async () => {
    const P = window.__piloto!;
    const { ctx } = window.__juego!;
    await P.caminar([[11.4, 17.5]]);
    const malla = ctx.escena.getObjectByName('rastro:estatura_andres_302')!;
    const c = malla.getWorldPosition(malla.position.clone());
    P.mirarA(c.x - 0.06, 1.08, c.z);
    await P.esperarJuego(0.5);
  });
  await page.screenshot({ path: info.outputPath('estatura-302-de-cerca.png') });

  console.log(JSON.stringify(fin.medidas));
  expect(r.piso, 'bajé al Piso 3').toBe('piso3');
  expect(r.ids, 'el Piso 3 declara sus ocho rastros').toEqual([
    'humedad_pasillo',
    'frase_descanso3',
    'frase_tapiado',
    'frase_hueco303',
    'mano_303',
    'charco_303',
    'estatura_andres_302',
    'charco_302',
  ]);
  expect(r.enEscena, 'todos están en la escena').toEqual(r.ids);
  expect(r.sinVerAlLlegar, 'al llegar no se ha visto ninguno').toEqual(r.ids);
  expect(r.habitacion, 'el 303 se puede caminar desde el pasillo').toBe('sala303');
  expect(fin.habitacion, 'el dormitorio del 302 se puede caminar desde la sala').toBe('dormitorio302');
  expect(fin.medidas.map((m) => m.id).sort(), 'los medí todos').toEqual([...r.ids].sort());
  comprobarMedidas(fin.medidas);
  expect(fin.sinVerAlFinal, 'al final del recorrido los vi todos').toEqual([]);
  expect(fin.estado).toBe('jugando');
  expect(errores).toEqual([]);
});
