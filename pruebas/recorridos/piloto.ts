// El piloto de pruebas: vive DENTRO de la página y juega como una persona.
// Camina manteniendo W y orientando la mirada hacia el siguiente punto, pulsa
// E para interactuar y Q para contener el aire. Nunca teletransporta al jugador:
// si una puerta no abre o un mueble tapa el paso, la prueba falla (así se
// encontró el bug del sofá del 401, que las pruebas con teletransporte no vieron).
import type { Page } from '@playwright/test';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';

/** Lo que las pruebas leen del juego (window.__juego, solo existe en desarrollo). */
export interface JuegoExpuesto {
  readonly estado: string;
  readonly ctx: ContextoJuego;
  readonly interaccion: { readonly enfocado: { readonly id: string; texto(ctx: ContextoJuego): string } | null };
}

export interface Piloto {
  /** Camino por una lista de puntos en CELDAS del mapa. */
  caminar(puntos: ReadonlyArray<readonly [number, number]>, tolerancia?: number): Promise<void>;
  /** Oriento la mirada hacia un punto en METROS (y = altura). */
  mirarA(x: number, y: number, z: number): void;
  pulsar(codigo: string): Promise<void>;
  sostener(codigo: string): void;
  soltar(codigo: string): void;
  /** Espero tiempo de JUEGO (no avanza en menús, documentos ni muerte). */
  esperarJuego(segundos: number): Promise<void>;
  esperarReal(ms: number): Promise<void>;
  esperarEstado(estado: string, ms?: number): Promise<void>;
}

declare global {
  interface Window {
    __juego?: JuegoExpuesto;
    __piloto?: Piloto;
  }
}

export async function instalarPiloto(page: Page): Promise<void> {
  await page.evaluate(() => {
    const juego = (): JuegoExpuesto => {
      const J = window.__juego;
      if (!J) throw new Error('window.__juego no existe: ¿el servidor corre en modo desarrollo?');
      return J;
    };
    const C = 1.3;
    const tecla = (codigo: string, tipo: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(tipo, { code: codigo }));
    const esperarReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const mirarA = (x: number, y: number, z: number) => {
      const { jugador, camara } = juego().ctx;
      const p = jugador.posicion;
      jugador.yaw = Math.atan2(-(x - p.x), -(z - p.z));
      jugador.pitch = Math.atan2(y - camara.position.y, Math.hypot(x - p.x, z - p.z));
    };
    const piloto: Piloto = {
      async caminar(puntos, tolerancia = 0.25) {
        const J = juego();
        const p = J.ctx.jugador.posicion;
        for (const [cx, cy] of puntos) {
          const x = cx * C;
          const z = cy * C;
          const limite = performance.now() + 30_000;
          tecla('KeyW', 'keydown');
          try {
            while (Math.hypot(p.x - x, p.z - z) > tolerancia) {
              if (J.estado !== 'jugando') throw new Error(`El juego pasó a "${J.estado}" caminando hacia (${cx}, ${cy})`);
              if (performance.now() > limite) throw new Error(`No llegué a (${cx}, ${cy}); quedé en (${(p.x / C).toFixed(2)}, ${(p.z / C).toFixed(2)}). ¿Algo tapa el paso?`);
              mirarA(x, J.ctx.camara.position.y, z);
              await esperarReal(16);
            }
          } finally {
            tecla('KeyW', 'keyup');
          }
        }
        await piloto.esperarJuego(0.3);
      },
      mirarA,
      async pulsar(codigo) {
        tecla(codigo, 'keydown');
        await esperarReal(80);
        tecla(codigo, 'keyup');
      },
      sostener: (codigo) => tecla(codigo, 'keydown'),
      soltar: (codigo) => tecla(codigo, 'keyup'),
      async esperarJuego(segundos) {
        const J = juego();
        const fin = J.ctx.programador.ahora + segundos;
        while (J.ctx.programador.ahora < fin && J.estado === 'jugando') await esperarReal(20);
      },
      esperarReal,
      async esperarEstado(estado, ms = 10_000) {
        const limite = performance.now() + ms;
        while (juego().estado !== estado) {
          if (performance.now() > limite) throw new Error(`Esperaba el estado "${estado}" y sigue en "${juego().estado}"`);
          await esperarReal(20);
        }
      },
    };
    window.__piloto = piloto;
  });
}
