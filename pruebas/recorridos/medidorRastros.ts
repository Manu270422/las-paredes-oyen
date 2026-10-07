// El medidor de rastros: vive DENTRO de la página, como el piloto. Desde donde estoy parado miro el centro de
// un rastro con la linterna y compruebo:
// - que el juego lo da por VISTO (el aviso `rastro-visto` que cuenta la telemetría);
// - que de verdad se ve: dibujo el cuadro con el rastro y sin él, y cuento cuántos píxeles cambian, contra
//   cuántos DEBERÍAN cambiar (el área del cuadro en pantalla por la parte del dibujo que tiene pintura). Si algo
//   lo tapa (un muro, un mueble, la hoja de una puerta) o la luz no le llega, cambia mucho menos;
// - que con la linterna se ve más que sin ella (lo repito con la linterna apagada).
// Lo que esto NO dice es si los rastros "dan miedo" o "se entienden": eso se juzga en las capturas.
import { expect, type Page } from '@playwright/test';

/** Qué parte de lo pintado de un rastro tiene que notarse con la linterna (fijado mirando medidas y capturas). */
export const UMBRAL_SE_VE = 0.3;

export interface MedidaRastro {
  id: string;
  visto: boolean;
  /** De los píxeles con pintura del rastro, qué parte se nota al quitarlo (con linterna y sin ella). */
  seVeConLuz: number;
  seVeSinLuz: number;
  /** Cuánto cambian en promedio los píxeles que cambian (0..255). */
  difConLuz: number;
  difSinLuz: number;
  /** Cuántos píxeles de pantalla deberían cambiar (área del cuadro en pantalla × parte pintada del dibujo). */
  esperados: number;
}

export interface MedidorRastros {
  /** Miro el rastro desde donde estoy y lo mido con la linterna y sin ella (la dejo encendida al terminar). */
  medir(id: string): Promise<MedidaRastro>;
  /** Los que el juego dio por vistos desde que instalé el medidor. */
  readonly vistos: readonly string[];
}

declare global {
  interface Window {
    __medidor?: MedidorRastros;
  }
}

export async function instalarMedidor(page: Page): Promise<void> {
  await page.evaluate(() => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const vistos: string[] = [];
    ctx.bus.on('rastro-visto', ({ id }) => vistos.push(id));

    /** Dibujo el cuadro una vez y leo los píxeles del rectángulo de pantalla que ocupa el rastro. */
    const webgl = ctx.renderizador.webgl;
    const gl = webgl.getContext();
    const leer = (x: number, y: number, w: number, h: number) => {
      webgl.setRenderTarget(null);
      webgl.render(ctx.escena, ctx.camara);
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    };
    /** Qué parte del dibujo del rastro tiene pintura de verdad (alfa > 10 %): el resto del cuadro es transparente. */
    const partePintada = (malla: import('three').Object3D) => {
      const imagen = ((malla as import('three').Mesh).material as import('three').MeshStandardMaterial).map!.image as HTMLCanvasElement;
      const datos = imagen.getContext('2d')!.getImageData(0, 0, imagen.width, imagen.height).data;
      let pintados = 0;
      for (let i = 3; i < datos.length; i += 4) if (datos[i] > 25) pintados++;
      return pintados / (imagen.width * imagen.height);
    };
    /** Con el rastro y sin él: de los píxeles que deberían cambiar, qué parte cambia, y cuánto. */
    const comparar = (id: string) => {
      const malla = ctx.escena.getObjectByName(`rastro:${id}`)!;
      ctx.camara.updateMatrixWorld();
      malla.updateWorldMatrix(true, false);
      const tam = { x: gl.drawingBufferWidth, y: gl.drawingBufferHeight };
      // Las cuatro esquinas del plano, en pantalla (y de abajo hacia arriba, como las lee WebGL).
      const geo = (malla as import('three').Mesh).geometry as import('three').PlaneGeometry;
      const { width: a, height: b } = geo.parameters;
      const esquinas = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]].map(([x, y]) => {
        const v = malla.localToWorld(malla.position.clone().set(x, y, 0)).project(ctx.camara);
        return [((v.x + 1) / 2) * tam.x, ((v.y + 1) / 2) * tam.y];
      });
      const x0 = Math.max(0, Math.floor(Math.min(...esquinas.map((e) => e[0]))));
      const x1 = Math.min(tam.x, Math.ceil(Math.max(...esquinas.map((e) => e[0]))));
      const y0 = Math.max(0, Math.floor(Math.min(...esquinas.map((e) => e[1]))));
      const y1 = Math.min(tam.y, Math.ceil(Math.max(...esquinas.map((e) => e[1]))));
      const [w, h] = [x1 - x0, y1 - y0];
      // El área del cuadro en pantalla (fórmula del cordón de zapato): con ella y la parte pintada del dibujo
      // sé cuántos píxeles deberían cambiar si todo el rastro se ve.
      const area =
        Math.abs(
          esquinas.reduce((suma, [ax, ay], i) => {
            const [bx, by] = esquinas[(i + 1) % 4];
            return suma + ax * by - bx * ay;
          }, 0),
        ) / 2;
      const esperados = area * partePintada(malla);
      if (w <= 0 || h <= 0 || esperados <= 0) return { seVe: 0, dif: 0, esperados: 0 };
      const con = leer(x0, y0, w, h);
      malla.visible = false;
      const sin = leer(x0, y0, w, h);
      malla.visible = true;
      let cambian = 0;
      let suma = 0;
      for (let i = 0; i < con.length; i += 4) {
        const d = (Math.abs(con[i] - sin[i]) + Math.abs(con[i + 1] - sin[i + 1]) + Math.abs(con[i + 2] - sin[i + 2])) / 3;
        if (d >= 2) {
          cambian++;
          suma += d;
        }
      }
      return { seVe: cambian / esperados, dif: cambian ? suma / cambian : 0, esperados: Math.round(esperados) };
    };

    window.__medidor = {
      vistos,
      async medir(id) {
        const malla = ctx.escena.getObjectByName(`rastro:${id}`);
        if (!malla) throw new Error(`No hay ningún "rastro:${id}" en la escena.`);
        if (!ctx.linterna.encendida) await P.pulsar('KeyF');
        const c = malla.getWorldPosition(malla.position.clone());
        P.mirarA(c.x, c.y, c.z);
        await P.esperarJuego(0.8);
        const conLuz = comparar(id);
        await P.pulsar('KeyF');
        await P.esperarJuego(0.8);
        const sinLuz = comparar(id);
        await P.pulsar('KeyF');
        await P.esperarJuego(0.6);
        return {
          id,
          visto: vistos.includes(id),
          seVeConLuz: +conLuz.seVe.toFixed(3),
          seVeSinLuz: +sinLuz.seVe.toFixed(3),
          difConLuz: +conLuz.dif.toFixed(1),
          difSinLuz: +sinLuz.dif.toFixed(1),
          esperados: conLuz.esperados,
        };
      },
    };
  });
}

/** Lo que exijo a cada rastro medido. */
export function comprobarMedidas(medidas: readonly MedidaRastro[]): void {
  for (const m of medidas) {
    expect(m.visto, `${m.id}: mirándolo de cerca con la linterna, el juego no lo dio por visto`).toBe(true);
    // Con la linterna, buena parte de lo pintado se nota al quitarlo: se ve y nada lo tapa.
    expect(m.seVeConLuz, `${m.id}: con la linterna casi no se nota (¿algo lo tapa?)`).toBeGreaterThan(UMBRAL_SE_VE);
    // Sin linterna se ve menos (o menos fuerte) que con ella: la linterna es la que lo descubre.
    expect(m.seVeSinLuz * m.difSinLuz, `${m.id}: sin linterna se ve igual que con ella`).toBeLessThan(m.seVeConLuz * m.difConLuz);
  }
}
