// Ayudas de los recorridos del Piso 2 (piso2.spec y cuartoSordo.spec): cruzar un descanso caminando aunque en medio
// cambie de piso, abrir puertas y usar cosas como una persona (mirarlas y E), dejarla quieta, y bajar caminando del 4
// al 2 con los pisos de arriba ya terminados (lo prueban sus propios recorridos).
import type { Page } from '@playwright/test';

declare global {
  interface Window {
    /** Cruzo un descanso caminando hasta (x, y) en celdas aunque en medio cambie de piso. */
    __cruzarDescanso?: (x: number, y: number) => Promise<string>;
    /** Abro una puerta mirándola y con E, como una persona. */
    __abrirPuerta?: (id: string) => Promise<void>;
    /** Miro algo del piso (por su id) y pulso E. Devuelve lo que decía el indicador. */
    __usar?: (id: string, pitch?: number) => Promise<string | null>;
  }
}

/** El piloto no tolera el instante de "viaje" del cambio de piso caminando; estas ayudas sí (como en escaleraCaminada). */
export async function instalarAyudas(page: Page): Promise<void> {
  await page.evaluate(() => {
    const J = window.__juego!;
    const C = 1.3;
    const tecla = (codigo: string, tipo: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(tipo, { code: codigo }));
    window.__cruzarDescanso = async (cx, cy) => {
      const { ctx } = J;
      const limite = performance.now() + 30_000;
      tecla('KeyW', 'keydown');
      try {
        for (;;) {
          const p = ctx.jugador.posicion;
          if (J.estado !== 'viaje') {
            if (Math.hypot(p.x - cx * C, p.z - cy * C) < 0.2) break;
            ctx.jugador.yaw = Math.atan2(-(cx * C - p.x), -(cy * C - p.z));
            ctx.jugador.pitch = 0;
          }
          if (performance.now() > limite) throw new Error(`No llegué a (${cx}, ${cy}) en ${ctx.piso.id}.`);
          await new Promise((r) => setTimeout(r, 16));
        }
      } finally {
        tecla('KeyW', 'keyup');
      }
      return ctx.piso.id;
    };
    window.__abrirPuerta = async (id) => {
      const { ctx } = J;
      const P = window.__piloto!;
      const puerta = ctx.nivel.puertas.find((p) => p.id === id)!;
      if (puerta.abierta) return;
      const h = puerta.puntoInteraccion();
      P.mirarA(h.x, h.y, h.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      const fin = performance.now() + 8000;
      while (!puerta.abierta && performance.now() < fin) await P.esperarReal(30);
      if (!puerta.abierta) throw new Error(`La puerta "${id}" no abrió.`);
      await P.esperarJuego(0.8);
    };
    window.__usar = async (id, pitch) => {
      const { ctx } = J;
      const P = window.__piloto!;
      const cosa = ctx.nivel.interactuables.find((i) => i.id === id) ?? ctx.nivel.ascensor?.botones.find((b) => b.id === id);
      if (!cosa) throw new Error(`No hay "${id}" en ${ctx.piso.id}.`);
      // En el mundo: los botones del citófono van dentro de su panel (su posición propia es relativa a él).
      const p = cosa.objeto.getWorldPosition(cosa.objeto.position.clone());
      P.mirarA(p.x, p.y, p.z);
      if (pitch !== undefined) ctx.jugador.pitch = pitch;
      await P.esperarJuego(0.3);
      const enfocado = J.interaccion.enfocado;
      const texto = enfocado?.id === id ? enfocado.texto(ctx) : null;
      await P.pulsar('KeyE');
      return texto;
    };
  });
}

/** Sin director ni criatura (se vuelve a pedir en cada piso: llegar a uno la despierta). */
export async function calmar(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { ctx } = window.__juego!;
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
  });
}

/**
 * Ya en el Piso 2 (en la boca de la escalera): el libro leído, el cuarto sordo grabado y la llave en el bolsillo (tomarla
 * es un punto de control: se reaparece en la sala del 202). Camino al ascensor, lo llamo, entro y pulso el 1.
 * Devuelve lo que decía el botón.
 */
export async function bajarAlUnoConLaLlave(page: Page): Promise<string | null> {
  await calmar(page);
  return page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const P = window.__piloto!;
    for (const b of ['leyo:libro_quejas', 'medido:202', 'cinta:202']) ctx.progreso.marcarSilencioso(b);
    ctx.progreso.agregarObjeto('llave_servicio');
    const ascensor = ctx.nivel.ascensor!;
    await P.caminar([[3.6, 10.5], [5.3, 10.45]], 0.18);
    await window.__usar!(ascensor.botones[0].id);
    const limite = performance.now() + 20_000;
    while (ascensor.fase !== 'abierto' && performance.now() < limite) await P.esperarReal(50);
    if (ascensor.fase !== 'abierto') throw new Error(`El ascensor no abrió: ${ascensor.fase}.`);
    await P.caminar([[5.5, 10.6], [5.5, 11.45]], 0.12);
    return window.__usar!(ascensor.botones.find((b) => b.hacia === 'piso1')!.id);
  });
}

/**
 * Desde el Piso 4 recién empezado, hasta el Piso 1: bajo caminando al 2, tomo la llave y bajo en la cabina. Cuando se
 * detiene y ella se queda escuchando encima, aguanto el aire hasta que se va, como una persona. Devuelve el piso donde
 * quedé y los encuentros.
 */
export async function llegarAlPiso1(page: Page): Promise<{ piso: string; encuentros: string[] }> {
  await bajarAlPiso2(page);
  await calmar(page);
  await page.evaluate(() => {
    const { ctx } = window.__juego!;
    const encuentros: string[] = [];
    ctx.bus.on('encuentro', (e) => {
      encuentros.push(e.estado);
      if (e.estado === 'inicio') window.__piloto!.sostener('KeyQ');
      else window.__piloto!.soltar('KeyQ');
    });
    (window as unknown as { __encuentros: string[] }).__encuentros = encuentros;
  });
  await bajarAlUnoConLaLlave(page);
  return page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const limite = performance.now() + 60_000;
    while (!(J.estado === 'jugando' && J.ctx.piso.id === 'piso1') && performance.now() < limite) await P.esperarReal(50);
    P.soltar('KeyQ');
    return { piso: J.ctx.piso.id, encuentros: [...(window as unknown as { __encuentros: string[] }).__encuentros] };
  });
}

/**
 * Desde el Piso 4 recién empezado: con el 4 y el 3 terminados (sus banderas, en silencio), bajo por los escalones del
 * 4 al 3 y del 3 al 2 cruzando cada descanso, y salgo a la boca del Piso 2. Devuelve el piso donde quedé.
 */
export async function bajarAlPiso2(page: Page): Promise<string> {
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    ctx.progreso.agregarObjeto('llave_escalera');
    ctx.progreso.marcarSilencioso('medido:402');
    ctx.progreso.marcarSilencioso('abierta:bajada');
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    const P = window.__piloto!;
    if (!ctx.linterna.encendida) await P.pulsar('KeyF');
    await P.caminar([[1.5, 10.45], [1.5, 11.2], [1.5, 12.0], [1.5, 12.65]], 0.15);
  });
  await calmar(page);
  await page.evaluate(() => window.__cruzarDescanso!(3.5, 12.65));
  await calmar(page);
  // En el 3, su final ya pasó (lo prueba finalPiso3.spec): la reja de abajo está abierta. Bajo al 2.
  await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    for (const b of ['cinta:302', 'final:piso3', 'reja:piso2', 'abierta:bajada']) ctx.progreso.marcarSilencioso(b);
    ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.restablecer?.(ctx);
    await window.__piloto!.caminar([[3.5, 11.6], [3.5, 10.45], [1.5, 10.45], [1.5, 11.2], [1.5, 12.0], [1.5, 12.65]], 0.15);
  });
  await calmar(page);
  const piso = await page.evaluate(() => window.__cruzarDescanso!(3.5, 12.65));
  await calmar(page);
  await page.evaluate(() => window.__piloto!.caminar([[3.5, 11.6], [3.5, 10.45], [2.6, 10.3]], 0.15));
  return piso;
}
