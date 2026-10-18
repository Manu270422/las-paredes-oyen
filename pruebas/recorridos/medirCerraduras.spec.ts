// MEDICIÓN del final (P1-guion, tanda 3): ¿qué tan difícil es abrir las tres cerraduras con ella cerca? No es una
// prueba de la batería: se corre a pedido, porque son muchos intentos (minutos cada uno).
//
//   MEDIR_CERRADURAS=1 npx playwright test --config pruebas/playwright.config.ts medirCerraduras
//
// Opcionales: MEDIR_ESTRATEGIAS (seguidas,paciente,citofono,rafaga), MEDIR_DIFICULTADES (normal,pesadilla), MEDIR_INTENTOS (6),
// MEDIR_LIMITE (segundos de juego por intento: 240) y MEDIR_SALIDA (archivo .jsonl donde anoto cada intento).
//
// Cómo (ayudasFinal.ts): juego una vez hasta tomar las llaves (el punto de control frente a la puerta queda
// guardado). Cada intento retoma ESE guardado con "Continuar" (como una persona que vuelve a la partida), con la
// dificultad que toca, Math.random sembrado (la misma semilla para cada estrategia: así se comparan en las mismas
// condiciones) y sin las muertes de los intentos anteriores (si no, el alivio del director haría más fácil cada
// intento siguiente). Juega el robot (robotFinal.ts), con ella y el director activos.
import { appendFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { llegarALasLlaves, retomar } from './ayudasFinal';
import { instalarRobot, type Estrategia, type ResultadoIntento } from './robotFinal';

const MEDIR = process.env.MEDIR_CERRADURAS;
const ESTRATEGIAS = (process.env.MEDIR_ESTRATEGIAS ?? 'seguidas,paciente,citofono,rafaga').split(',') as Estrategia[];
const DIFICULTADES = (process.env.MEDIR_DIFICULTADES ?? 'normal,pesadilla').split(',');
const INTENTOS = Number(process.env.MEDIR_INTENTOS ?? 6);
const LIMITE = Number(process.env.MEDIR_LIMITE ?? 240);
const SALIDA = process.env.MEDIR_SALIDA;
/**
 * O un plan exacto, en vez de todas las combinaciones: "pesadilla:seguidas:3,normal:citofono:2" (dificultad,
 * estrategia e intentos de cada parte, en ese orden).
 */
const PLAN: Array<{ dificultad: string; estrategia: Estrategia; intentos: number }> = process.env.MEDIR_PLAN
  ? process.env.MEDIR_PLAN.split(',').map((parte) => {
      const [dificultad, estrategia, intentos] = parte.split(':');
      return { dificultad, estrategia: estrategia as Estrategia, intentos: Number(intentos) };
    })
  : DIFICULTADES.flatMap((dificultad) => ESTRATEGIAS.map((estrategia) => ({ dificultad, estrategia, intentos: INTENTOS })));

/**
 * Con MEDIR_VARIAR=1, cada intento la pone (dentro de los muros, sin nada en la memoria) en otro lugar del piso, por
 * turnos: si no, la semilla casi no cambia nada y los intentos de una estrategia salen iguales. En celdas.
 */
const VARIAR = process.env.MEDIR_VARIAR === '1';
const ARRANQUES: ReadonlyArray<{ nombre: string; x: number; y: number }> = [
  { nombre: 'guarida', x: 11, y: 2.5 },
  { nombre: 'vestibulo', x: 10, y: 12.5 },
  { nombre: 'ascensor', x: 5, y: 10.5 },
  { nombre: 'contadores', x: 16, y: 1.5 },
  { nombre: 'cuarto101', x: 27, y: 4 },
  { nombre: 'porteria', x: 27, y: 11 },
];

test.skip(!MEDIR, 'Medición a pedido: MEDIR_CERRADURAS=1');

test('medir el final: las tres cerraduras con ella cerca, por estrategia y dificultad', async ({ page }) => {
  test.setTimeout(0);
  const errores: string[] = [];
  page.on('pageerror', (e) => {
    errores.push(String(e));
    console.log(`ERROR DE LA PÁGINA: ${e.stack ?? e}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`ERROR EN CONSOLA: ${m.text()}`);
  });
  const guardado = await llegarALasLlaves(page);
  await instalarRobot(page);

  const filas: Array<ResultadoIntento & { dificultad: string; estrategia: Estrategia; semilla: number; arranque: string }> = [];
  for (const { dificultad, estrategia, intentos } of PLAN) {
    for (let i = 1; i <= intentos; i++) {
      const semilla = i * 7919;
      await retomar(page, guardado, dificultad, semilla);
      const arranque = VARIAR ? ARRANQUES[(i - 1) % ARRANQUES.length] : ARRANQUES[0];
      if (VARIAR) {
        await page.evaluate(({ x, y }) => {
          const { ctx } = window.__juego!;
          const E = ctx.entidad;
          if (E.estado !== 'paredes') E.cambiarEstado('paredes', ctx);
          E.posicion.x = x * 1.3;
          E.posicion.z = y * 1.3;
          E.memoria.ultimoRuido = null;
          E.memoria.sospecha = 0;
        }, arranque);
      }
      const r = await page.evaluate(([e, l]) => window.__robot!.intentar(e as Estrategia, l as number), [estrategia, LIMITE] as const);
      // Que termine lo que empezó: la pantalla final o la de la muerte.
      if (r.resultado === 'salio') await page.waitForFunction(() => window.__juego?.estado === 'fin', null, { timeout: 30_000 });
      if (r.resultado === 'muerte') await page.waitForFunction(() => window.__juego?.estado === 'muerte', null, { timeout: 30_000 });
      const fila = { dificultad, estrategia, semilla, arranque: arranque.nombre, ...r };
      filas.push(fila);
      console.log(JSON.stringify(fila));
      if (SALIDA) appendFileSync(SALIDA, JSON.stringify(fila) + '\n');
    }
  }

  // El resumen: por dificultad y estrategia, cuántas veces salí y la mediana del tiempo.
  for (const { dificultad, estrategia } of PLAN) {
    const de = filas.filter((f) => f.dificultad === dificultad && f.estrategia === estrategia);
    const salio = de.filter((f) => f.resultado === 'salio');
    const tiempos = salio.map((f) => f.tiempo).sort((a, b) => a - b);
    const motivos = de.filter((f) => f.motivo).map((f) => f.motivo).join(',');
    const llegadas = de.map((f) => f.llegada).filter((l): l is number => l !== null).sort((a, b) => a - b);
    console.log(
      `RESUMEN ${dificultad} ${estrategia}: salí ${salio.length}/${de.length}` +
        ` · murió ${de.filter((f) => f.resultado === 'muerte').length} (${motivos || '-'})` +
        ` · sin tiempo ${de.filter((f) => f.resultado === 'tiempo').length}` +
        ` · mediana ${tiempos.length ? tiempos[Math.floor(tiempos.length / 2)] : '-'} s` +
        ` · encuentros ${de.reduce((s, f) => s + f.encuentros, 0)} · cazas ${de.reduce((s, f) => s + f.cazas, 0)}` +
        ` · soltadas ${de.reduce((s, f) => s + f.soltadas, 0)} · equivocados ${de.reduce((s, f) => s + f.equivocados, 0)}` +
        ` · llega a la puerta (mediana) ${llegadas.length ? llegadas[Math.floor(llegadas.length / 2)] : '-'} s`,
    );
  }
  expect(errores, 'errores de la página').toEqual([]);
});
