// Para la ronda 2 de testers (con ?telemetria=1): el registro exportado tiene que decir qué versión del juego se
// jugó (la compilación), cada cambio de piso y CÓMO fue (caminando, con fundido, en ascensor o al despertar), y cada
// vez que se llamó el ascensor (con su respuesta y lo cerca que estaba ella). Lo compruebo en el juego real: llamo
// el ascensor muerto, abro la reja, lo tomo al Piso 3 y exporto el registro desde la pausa, como un probador.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';

interface Evento {
  tipo: string;
  datos?: Record<string, string | number | boolean | null>;
}

test('el registro de la prueba trae la compilación, cómo se cambió de piso y las llamadas al ascensor', async ({ page }) => {
  test.setTimeout(240_000);
  await abrirEleccion(page, '/?telemetria=1');
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await page.evaluate(async () => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    ctx.entidad.cambiarEstado('paredes', ctx);
    const ascensor = () => ctx.nivel.ascensor!;
    const pulsar = async (boton: { objeto: { position: { x: number; y: number; z: number } } }) => {
      const p = boton.objeto.position;
      P.mirarA(p.x, p.y, p.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      await P.esperarJuego(0.2);
    };
    const esperarFase = async (fase: string) => {
      const limite = performance.now() + 40_000;
      while (!(J.estado === 'jugando' && ascensor().fase === fase)) {
        if (performance.now() > limite) throw new Error(`El ascensor no llegó a "${fase}" (está en "${ascensor().fase}", ${ctx.piso.id}).`);
        await P.esperarReal(30);
      }
    };
    // Lo llamo muerto (la reja sigue cerrada), lo despierto abriendo la reja y viajo al Piso 3.
    await P.caminar([[4.4, 10.5], [5.3, 10.45]]);
    await pulsar(ascensor().botones[0]);
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcar('abierta:bajada');
    await esperarFase('abierto');
    await P.caminar([[5.5, 10.6], [5.5, 11.45]], 0.12);
    await pulsar(ascensor().botones[1]);
    const limite = performance.now() + 30_000;
    while (!(ctx.piso.id === 'piso3' && J.estado === 'jugando' && ascensor().fase === 'abierto')) {
      if (performance.now() > limite) throw new Error('No llegué al Piso 3 en ascensor.');
      await P.esperarReal(30);
    }
  });
  // Exporto desde la pausa, como lo haría un probador.
  await page.evaluate(() => window.__piloto!.pulsar('Escape'));
  await page.waitForFunction(() => window.__juego?.estado === 'pausa');
  const boton = page.locator('.pausa').getByRole('button', { name: 'Exportar registro de la prueba' });
  const [descarga] = await Promise.all([page.waitForEvent('download'), boton.click()]);
  const archivo = JSON.parse(readFileSync(await descarga.path(), 'utf-8')) as { sesiones: { entorno: { compilacion: string }; eventos: Evento[] }[] };
  const sesion = archivo.sesiones.at(-1)!;

  expect(sesion.entorno.compilacion, 'la versión del juego (package.json + commit, o +local en desarrollo)').toMatch(/^\d+\.\d+\.\d+\+\w+$/);
  const llamadas = sesion.eventos.filter((e) => e.tipo === 'ascensor-llamado');
  expect(llamadas[0]?.datos).toMatchObject({ piso: 'piso4', respuesta: 'muerto' });
  expect(llamadas[0]?.datos, 'con el estado del peligro (dónde estaba y qué hacía ella)').toHaveProperty('entidadEstado');
  const cambios = sesion.eventos.filter((e) => e.tipo === 'piso-cambiado');
  expect(cambios.map((e) => e.datos)).toContainEqual({ desde: 'piso4', hacia: 'piso3', por: 'cabina' });
});
