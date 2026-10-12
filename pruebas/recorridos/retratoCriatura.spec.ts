// El retrato de "El Inquilino": lo pongo de pie frente a mí, con la linterna, en cada pose, y saco una captura de
// cada una (para juzgarlo a ojo: lo que esto no dice es si da miedo). La última es el susto DE VERDAD (Susto.ts, el
// que sale al morir): su cara tiene que quedar en el centro de la vista. Compruebo lo mínimo: que se dibuja delante
// (cambia el centro de la pantalla) y que no hay errores.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';
import type { PoseEntidad } from '../../src/ia/ModeloEntidad';

const POSES: ReadonlyArray<{ pose: PoseEntidad; distancia: number }> = [
  { pose: 'quieto', distancia: 1.9 },
  { pose: 'escuchar', distancia: 1.6 },
  { pose: 'correr', distancia: 1.9 },
  { pose: 'susto', distancia: 0 },
];

test('el retrato de la criatura en cada pose, con la linterna', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    // Al pasillo, mirando hacia el fondo: hay espacio delante para que quepa de pie.
    await window.__piloto!.caminar([[3.6, 10.5], [5.5, 10.5]]);
    if (!ctx.linterna.encendida) await window.__piloto!.pulsar('KeyF');
  });

  for (const { pose, distancia } of POSES) {
    const cambio = await page.evaluate(
      async ({ pose, distancia }) => {
        const { ctx } = window.__juego!;
        const camara = ctx.jugador.camara;
        ctx.jugador.yaw = -Math.PI / 2;
        ctx.jugador.pitch = pose === 'susto' ? 0 : -0.05;
        await window.__piloto!.esperarJuego(0.3);
        const modelo = ctx.entidad.modelo;
        // ¿Se dibuja? Leo el centro de la pantalla sin ella y con ella.
        const leer = () => {
          const webgl = ctx.renderizador.webgl;
          webgl.render(ctx.escena, camara);
          const gl = webgl.getContext();
          const px = new Uint8Array(4 * 120 * 120);
          gl.readPixels(gl.drawingBufferWidth / 2 - 60, gl.drawingBufferHeight / 2 - 60, 120, 120, gl.RGBA, gl.UNSIGNED_BYTE, px);
          return px;
        };
        modelo.fijarVisible(false);
        const sin = leer();
        const p = ctx.jugador.posicion;
        if (pose === 'susto') {
          // El susto real: él la pone delante de la cámara, en su pose, con la linterna y el grito.
          // El módulo lo sirve Vite dentro de la página (la ruta es de su servidor, no de este archivo).
          const ruta = '/src/nucleo/Susto.ts';
          const { mostrarSusto } = (await import(ruta)) as { mostrarSusto: (c: unknown, o: string) => void };
          mostrarSusto(ctx, 'muerte');
        } else {
          // De pie, de frente a `distancia`. Mirándome: su frente (+z) apunta hacia −x, de vuelta a la cámara.
          modelo.raiz.position.set(p.x + distancia, p.y, p.z);
          modelo.raiz.rotation.y = -Math.PI / 2;
          modelo.forzarPose(pose);
          modelo.fijarVisible(true);
        }
        await window.__piloto!.esperarJuego(0.2);
        modelo.forzarPose(pose);
        const con = leer();
        let distintos = 0;
        for (let i = 0; i < con.length; i += 4) if (Math.abs(con[i] - sin[i]) + Math.abs(con[i + 1] - sin[i + 1]) + Math.abs(con[i + 2] - sin[i + 2]) > 12) distintos++;
        return distintos / (con.length / 4);
      },
      { pose, distancia },
    );
    await page.screenshot({ path: info.outputPath(`criatura-${pose}.png`) });
    expect(cambio, `en la pose "${pose}" se dibuja delante de mí`).toBeGreaterThan(0.1);
  }
  expect(errores).toEqual([]);
});
