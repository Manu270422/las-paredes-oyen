// Los rastros del Piso 4, caminando: me doy vuelta en el descanso (la mano en el muro, junto a la reja), entro
// al 401 y abro el baño (la frase sobre la tina), vuelvo al pasillo (el charco frente al 402 y la mano en el
// muro del hueco), abro el 402 y recorro la sala (el charco), el dormitorio (las rayas de estatura) y el cuarto
// (el conteo, sobre la silla), y termino en el cuarto de servicio (la frase junto al tablero). En cada uno me
// paro donde un jugador se pararía y lo mido con el medidor (medidorRastros.ts): visto, se ve con la linterna,
// y se ve menos sin ella.
//
// La puerta del 402 la desbloqueo directamente: la ruta de la llave ya la camina llave.spec.ts. Nadie lee la
// orden de trabajo, así que el director no trabaja y la criatura no sale: aquí se prueban los rastros.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { comprobarMedidas, instalarMedidor, type MedidaRastro } from './medidorRastros';

test('los rastros del Piso 4 están donde dicen los datos, se ven con la linterna y el juego los da por vistos', async ({ page }) => {
  test.setTimeout(400_000);
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
    const C = 1.3;
    const defs = ctx.piso.rastros ?? [];
    const puerta = (id: string) => ctx.nivel.puertas.find((p) => p.id === id)!;
    const abrir = async (id: string) => {
      const h = puerta(id).puntoInteraccion();
      P.mirarA(h.x, h.y, h.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      const limite = performance.now() + 8000;
      while (!puerta(id).abierta && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.8);
    };
    const medidas: MedidaRastro[] = [];
    const medir = async (id: string) => medidas.push(await M.medir(id));

    const enEscena = defs.filter((d) => ctx.escena.getObjectByName(`rastro:${d.id}`)).map((d) => d.id);
    const sinVerAlEmpezar = [...ctx.nivel.vigiaRastros.sinVer];
    await P.pulsar('KeyF');

    // 1. La mano: en el muro oeste del descanso, junto a la reja. Al empezar queda a la espalda: me doy vuelta.
    await P.caminar([[2.6, 9.6]]);
    await medir('mano_escalera');

    // 2. La frase del baño del 401: entro por la sala (rodeando el sofá y la silla) y abro el baño.
    await P.caminar([[3.6, 10.5], [7.5, 10.5]]);
    await abrir('p401');
    await P.caminar([[7.5, 9.5], [7.5, 7.6], [11.5, 7.3], [11.5, 5.3]], 0.18);
    await abrir('pBano401');
    await P.caminar([[11.5, 4.4], [11.5, 3.4]], 0.18);
    await medir('frase_bano401');
    await P.caminar([[11.5, 4.4], [11.5, 5.3], [11.5, 7.3], [7.5, 7.6], [7.5, 9.5], [7.5, 10.5]], 0.18);

    // 3. Frente al 402, en el pasillo: el charco (desde el oeste) y la mano en el muro del hueco (de cerca).
    await P.caminar([[12.4, 10.5]]);
    await medir('charco_pasillo402');
    await P.caminar([[15.0, 10.75]]);
    await medir('mano_hueco');

    // 4. El charco del 402: al abrirlo desde el pasillo, la linterna cae en el umbral.
    await P.caminar([[14.5, 10.5]]);
    puerta('p402').desbloquear();
    await abrir('p402');
    await P.caminar([[14.5, 10.6]]);
    await medir('charco_402');

    // 5. Las rayas de estatura: por la sala (sin rozar la mesa cubierta) al dormitorio.
    await P.caminar([[14.5, 12.4], [14.5, 15.4], [10.5, 15.4]]);
    await abrir('pDormitorio402');
    await P.caminar([[10.5, 16.6], [11.5, 18.2]]);
    await medir('estatura_andres');

    // 6. El conteo: de vuelta a la sala y al cuarto, detrás de la silla que mira la pared.
    await P.caminar([[10.5, 16.6], [10.5, 15.4], [18.5, 15.4]]);
    await abrir('pCuarto402');
    await P.caminar([[18.5, 16.6], [18.6, 17.4]]);
    await medir('conteo_402');

    // 7. La frase del servicio: salgo del 402 y voy por el pasillo (la ruta del tablero) hasta el fondo.
    await P.caminar([[18.5, 16.6], [18.5, 15.4], [14.5, 15.4], [14.5, 12.4], [14.5, 10.5]]);
    await P.caminar([[16.5, 10.3], [18.2, 10.3], [20.5, 10.5], [26.2, 10.75], [27.5, 10.5]]);
    await abrir('pServicio');
    await P.caminar([[29.5, 10.5]]);
    await medir('frase_servicio');

    return {
      ids: defs.map((d) => d.id),
      enEscena,
      sinVerAlEmpezar,
      sinVerAlFinal: [...ctx.nivel.vigiaRastros.sinVer],
      medidas,
      estado: J.estado,
      posicion: [+(ctx.jugador.posicion.x / C).toFixed(2), +(ctx.jugador.posicion.z / C).toFixed(2)],
    };
  });

  console.log(JSON.stringify(r.medidas));
  expect(r.ids, 'el Piso 4 declara sus ocho rastros').toEqual([
    'charco_402',
    'mano_escalera',
    'estatura_andres',
    'conteo_402',
    'charco_pasillo402',
    'mano_hueco',
    'frase_servicio',
    'frase_bano401',
  ]);
  expect(r.enEscena, 'todos están en la escena').toEqual(r.ids);
  expect(r.sinVerAlEmpezar, 'al empezar no se ha visto ninguno').toEqual(r.ids);
  expect(r.medidas.map((m) => m.id).sort(), 'los medí todos').toEqual([...r.ids].sort());
  comprobarMedidas(r.medidas);
  expect(r.sinVerAlFinal, 'al final del recorrido los vi todos').toEqual([]);
  expect(r.estado).toBe('jugando');
  expect(errores).toEqual([]);
});
