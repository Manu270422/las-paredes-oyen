// El hueco de la escalera del Piso 4, caminando: me asomo por la boca en tres puntos (sobre la reja del tramo
// que baja, sobre el ojo y sobre las tablas del tramo que sube) y empujo con W hacia adentro. El hueco se ve
// y se oye, pero no se pisa: el jugador tiene que quedar en el descanso, sin caerse ni atravesar nada.
//
// Lo que esta prueba NO dice es si la escalera "se ve bien": eso se juzga en las capturas.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando } from './acciones';

test('el hueco de la escalera está en la escena, se oye a través de él y no se puede pisar', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Historia');
  await esperarJugando(page);

  const r = await page.evaluate(async () => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const C = 1.3;
    const p = ctx.jugador.posicion;

    const escaleras = ctx.escena.getObjectByName('escaleras');
    const mallas: string[] = [];
    escaleras?.traverse((o) => {
      if (o.name.startsWith('escalera-')) mallas.push(o.name);
    });

    // La boca del hueco es el borde sur del descanso: z = 11 celdas.
    const boca = 11 * C;
    const empujes: Array<{ donde: string; z: number; estado: string }> = [];
    for (const [donde, x] of [['reja', 1.6], ['ojo', 2.5], ['tablas', 3.4]] as const) {
      await P.caminar([[x, 10.4]]);
      // Miro hacia el fondo del hueco y camino 2 s de juego contra él.
      P.mirarA(x * C, ctx.camara.position.y, 12.8 * C);
      P.sostener('KeyW');
      await P.esperarJuego(2);
      P.soltar('KeyW');
      empujes.push({ donde, z: p.z, estado: J.estado });
    }

    // El viento sube por el hueco: entre la boca y su fuente no hay ningún obstáculo para el sonido.
    const viento = ctx.piso.mapa.viento!;
    const oclusionViento = ctx.nivel.consultaOclusion(p.x, p.z, viento.x * C, viento.y * C);

    return { escaleras: !!escaleras, huecos: escaleras?.children.length ?? 0, mallas, boca, empujes, oclusionViento };
  });

  expect(r.escaleras, 'el grupo "escaleras" está en la escena').toBe(true);
  expect(r.huecos, 'el Piso 4 tiene un hueco de escalera').toBe(1);
  for (const nombre of ['escalera-pisoConcreto', 'escalera-paredConcreto', 'escalera-metal', 'escalera-madera', 'escalera-oscuridad', 'escalera-fondo']) {
    expect(r.mallas, `falta la malla ${nombre}`).toContain(nombre);
  }
  for (const e of r.empujes) {
    expect(e.estado, `empujando hacia el hueco por ${e.donde} el juego siguió`).toBe('jugando');
    // El cuerpo del jugador (radio ~0.28 m) se queda antes del borde: nunca entra al hueco.
    expect(e.z, `empujando por ${e.donde} quedé en z ${e.z.toFixed(2)}, el borde está en ${r.boca.toFixed(2)}`).toBeLessThan(r.boca - 0.2);
    // ...pero sí llegó hasta el borde (si se quedara lejos, algo invisible estaría tapando el paso).
    expect(e.z, `empujando por ${e.donde} no llegué al borde`).toBeGreaterThan(r.boca - 0.45);
  }
  expect(r.oclusionViento, 'el hueco no ahoga el viento que sube').toBe(0);
  expect(errores).toEqual([]);
});
