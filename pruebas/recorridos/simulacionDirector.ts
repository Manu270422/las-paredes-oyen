// La simulación del director para el golden master de Normal: con Math.random sembrado, el director corre
// muchas veces 400 s de juego (paso fijo de 0.25 s) y anoto qué hizo y cuándo. Con la misma semilla, el mismo
// código da exactamente la misma secuencia; si algo de Normal cambia, la secuencia cambia.
//
// Corre IGUAL contra el juego de hoy y contra el de la etiqueta gate1-congelado (por eso solo usa lo que ya
// existía allí: director, progreso, nivel, memoria y programador). Todo pasa dentro de UNA función síncrona:
// el bucle del juego no puede colarse entre dos pasos.
import type { Page } from '@playwright/test';

export interface OpcionesSimulacion {
  /** Muertes seguidas sin progreso (0 a 4: de sin alivio al tope del alivio). */
  muertes: readonly number[];
  corridas: number;
  segundos: number;
  paso: number;
}

export const SIMULACION_NORMAL: OpcionesSimulacion = { muertes: [0, 1, 2, 3, 4], corridas: 10, segundos: 400, paso: 0.25 };

/** Corrida → líneas "segundo evento intensidad fase" y "segundo fase nombre". */
export type RegistroDirector = Record<string, string[]>;

export function simularDirector(page: Page, opciones: OpcionesSimulacion = SIMULACION_NORMAL): Promise<RegistroDirector> {
  return page.evaluate(({ muertes, corridas, segundos, paso }) => {
    const J = window.__juego!;
    const { ctx } = J;
    const D = ctx.director;
    (J as unknown as { estado: string }).estado = 'pausa';
    // mulberry32: un generador pequeño y conocido, sembrado por corrida.
    const sembrado = (semilla: number) => {
      let a = semilla >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const original = Math.random;
    const registro: Record<string, string[]> = {};
    try {
      for (const m of muertes) {
        for (let c = 0; c < corridas; c++) {
          Math.random = sembrado(1000 * m + c + 1);
          // Cada corrida empieza del mismo mundo: nada pendiente, puertas y luces como al cargar.
          ctx.programador.cancelarTodo();
          ctx.progreso.importar(null);
          ctx.progreso.marcar('leyo:orden_trabajo');
          ctx.nivel.restablecer(ctx);
          ctx.memoria.reiniciarSesion();
          ctx.entidad.puedeManifestarse = false;
          D.olvidarPerfil();
          // El segundo argumento (la dificultad) no existía en gate1: allí se ignora y vale Normal.
          D.reiniciar(m, ctx.dificultad?.alivio);
          D.activo = true;
          D['usos'].clear();
          D['ultimoUso'].clear();
          const lineas: string[] = [];
          let t = 0;
          const quitarEvento = ctx.bus.on('evento-director', (e) => lineas.push(`${t.toFixed(2)} ${e.id} ${e.intensidad} ${e.fase}`));
          const quitarFase = ctx.bus.on('director-fase', (f) => lineas.push(`${t.toFixed(2)} fase ${f.fase}`));
          while (t < segundos) {
            t += paso;
            ctx.programador.actualizar(paso);
            D.actualizar(paso, ctx);
          }
          quitarEvento();
          quitarFase();
          registro[`muertes${m}-corrida${c}`] = lineas;
        }
      }
    } finally {
      Math.random = original;
      D.activo = false;
    }
    return registro;
  }, opciones);
}
