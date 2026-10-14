// Los rastros del Piso 2, caminando: bajo por los escalones del 4 al 2 (ayudasPiso2), avanzo por el pasillo hasta la
// administración ("MENTIROSO", junto a su puerta), sigo hasta la puerta del 202 (la mano que bajó arrastrándose) y
// entro a la sala acolchada a mirar el techo (la humedad roja, justo debajo del charco del umbral del 302). Cada uno
// lo mido con el medidor (medidorRastros.ts): visto, se ve con la linterna, y se ve menos sin ella.
// Ella y el director quedan quietos: aquí se prueban los rastros.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import { bajarAlPiso2, calmar, instalarAyudas } from './ayudasPiso2';
import { comprobarMedidas, instalarMedidor, type MedidaRastro } from './medidorRastros';

test('los rastros del Piso 2 están donde dicen los datos, se ven con la linterna y el juego los da por vistos', async ({ page }, info) => {
  test.setTimeout(300_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await instalarAyudas(page);
  await instalarMedidor(page);
  expect(await bajarAlPiso2(page)).toBe('piso2');
  await calmar(page);

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const M = window.__medidor!;
    const { ctx } = J;
    const defs = ctx.piso.rastros ?? [];
    const enEscena = defs.filter((d) => ctx.escena.getObjectByName(`rastro:${d.id}`)).map((d) => d.id);
    const sinVerAlLlegar = [...ctx.nivel.vigiaRastros.sinVer];
    const medidas: MedidaRastro[] = [];
    const medir = async (id: string) => medidas.push(await M.medir(id));

    // 1. "MENTIROSO", en el muro del pasillo junto a la puerta de la administración.
    await P.caminar([[3.6, 10.5], [10.5, 10.75]], 0.18);
    await medir('frase_mentiroso');
    // 2. La mano, en el muro del pasillo junto a la puerta del 202.
    await P.caminar([[13.6, 10.4], [15.5, 10.3]], 0.18);
    await medir('mano_202');
    // 3. La humedad del techo de la sala del 202: abro, entro y miro arriba.
    await P.caminar([[14.5, 10.4]], 0.18);
    await window.__abrirPuerta!('p202');
    await P.caminar([[14.5, 11.5], [14.5, 12.4], [13.2, 12.9]], 0.18);
    await medir('humedad_202');
    return { ids: defs.map((d) => d.id), enEscena, sinVerAlLlegar, medidas, sinVerAlFinal: [...ctx.nivel.vigiaRastros.sinVer], estado: J.estado };
  });
  await page.screenshot({ path: info.outputPath('humedad-202.png') });

  console.log(JSON.stringify(r.medidas));
  expect(r.ids, 'el Piso 2 declara sus tres rastros').toEqual(['frase_mentiroso', 'mano_202', 'humedad_202']);
  expect(r.enEscena, 'todos están en la escena').toEqual(r.ids);
  expect(r.sinVerAlLlegar, 'al llegar no se ha visto ninguno').toEqual(r.ids);
  expect(r.medidas.map((m) => m.id).sort(), 'los medí todos').toEqual([...r.ids].sort());
  comprobarMedidas(r.medidas);
  expect(r.sinVerAlFinal, 'al final del recorrido los vi todos').toEqual([]);
  expect(r.estado).toBe('jugando');
  expect(errores).toEqual([]);
});
