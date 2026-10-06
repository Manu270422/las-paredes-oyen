// El director y la radio dependen de las REGLAS del piso, no de banderas escritas a mano:
// 1) la silueta y la respiración a tu espalda solo existen después de que la criatura despierta
//    (la bandera "despiertaCon" del paquete);
// 2) la radio no se enciende en el cuarto donde está, y ese cuarto se deduce de su posición en el mapa.
// Para (1) se AÍSLA la guardia del director: se fuerza que ambos eventos puedan ocurrir (su propia
// condición siempre cierta) y se mira cuáles elige. Así la prueba falla si la guardia desaparece, aunque en el
// juego la condición propia del evento (un punto visible en la periferia, quedarse quieto) rara vez se dé.
// Es una comprobación de reglas del director, no un recorrido: lo que se camina está en los otros archivos.
import { expect, test } from '@playwright/test';

test('la silueta y la respiración detrás solo salen cuando la criatura ya despertó; la radio respeta su cuarto', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');

  const r = await page.evaluate(() => {
    const J = window.__juego!;
    const { ctx } = J;
    const D = ctx.director;
    (J as unknown as { estado: string }).estado = 'pausa';

    // La radio, antes que nada: no ocurre en SU cuarto (deducido del mapa); sí en otro, a buena distancia.
    const radio = ctx.nivel.radio!;
    const cuartoDeLaRadio = ctx.nivel.habitacionEn(radio.objeto.position.x, radio.objeto.position.z)?.id ?? null;
    const radioEvento = D['eventos'].find((e) => e.id === 'radio_encendida')!;
    ctx.jugador.posicion.set(12.5 * 1.3, 0, 10.5 * 1.3);
    ctx.memoria.habitacionActual = cuartoDeLaRadio;
    const enSuCuarto = radioEvento.puedeOcurrir(ctx);
    ctx.memoria.habitacionActual = 'pasillo';
    const enOtroCuarto = radioEvento.puedeOcurrir(ctx);

    // La guardia del director: ambos eventos pueden ocurrir SIEMPRE; solo la bandera decide.
    const solo = D['eventos'].filter((e) => e.requiereDespierta);
    const originales = solo.map((e) => e.puedeOcurrir);
    for (const e of solo) e.puedeOcurrir = () => true;
    const elegir = (despierta: boolean) => {
      const cuenta: Record<string, number> = {};
      ctx.progreso.importar(null);
      ctx.progreso.marcar('leyo:orden_trabajo');
      if (despierta) ctx.progreso.marcar(ctx.piso.reglas.despiertaCon);
      ctx.entidad.puedeManifestarse = despierta;
      D.reiniciar(0, ctx.dificultad.alivio);
      D.activo = true;
      D.forzarFase('acumulacion', ctx);
      D['tiempoFase'] = 60; // acumulación avanzada: ya caben los eventos de intensidad 3
      for (let i = 0; i < 400; i++) {
        D['presupuesto'].reiniciar();
        D['usos'].clear();
        D['ultimoUso'].clear();
        const { evento } = D['elegirEvento'](ctx);
        if (evento) cuenta[evento.id] = (cuenta[evento.id] ?? 0) + 1;
      }
      return cuenta;
    };
    const dormida = elegir(false);
    const despierta = elegir(true);
    solo.forEach((e, i) => (e.puedeOcurrir = originales[i]));
    return { ids: solo.map((e) => e.id), dormida, despierta, cuartoDeLaRadio, enSuCuarto, enOtroCuarto };
  });

  expect(r.ids.sort(), 'los eventos que dependen de que la criatura haya despertado').toEqual(['respiracion_detras', 'silueta_fugaz']);
  for (const id of r.ids) {
    expect(r.dormida[id] ?? 0, `${id}: con la criatura dormida el director NO lo elige`).toBe(0);
    expect(r.despierta[id] ?? 0, `${id}: con la criatura despierta el director sí lo elige`).toBeGreaterThan(0);
  }
  expect(Object.keys(r.dormida).length, 'con la criatura dormida el director sigue eligiendo otros eventos').toBeGreaterThan(2);

  expect(r.cuartoDeLaRadio, 'el cuarto de la radio sale de su posición en el mapa').toBe('sala401');
  expect(r.enSuCuarto, 'la radio no se enciende en el cuarto donde está').toBe(false);
  expect(r.enOtroCuarto, 'en otro cuarto, a buena distancia, sí puede encenderse').toBe(true);
  expect(errores, 'errores de consola').toEqual([]);
});

test('cada cosa del mundo que cambia el director suma en "Cosas que cambiaron"; un sonido no', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__juego?.estado === 'inicio', null, { timeout: 120_000 });
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nueva partida', exact: true }).click();
  await page.waitForFunction(() => window.__juego?.estado === 'jugando');

  const r = await page.evaluate(async () => {
    const { ctx } = window.__juego!;
    const D = ctx.director;
    const original = D['elegirEvento'];
    /** Hago que el bucle REAL del director lance ese evento (solo fuerzo la elección) y espero a que lo haga. */
    const lanzar = async (id: string) => {
      const evento = D['eventos'].find((e) => e.id === id)!;
      const antes = D['usos'].get(id) ?? 0;
      D['elegirEvento'] = () => ({ evento, porPresupuesto: false });
      D.activo = true;
      D.forzarFase('acumulacion', ctx);
      const limite = performance.now() + 8000;
      while ((D['usos'].get(id) ?? 0) === antes && performance.now() < limite) {
        D['bloqueo'] = 0;
        D['proximoEvento'] = 0;
        D['tiempoFase'] = 0;
        await new Promise((res) => setTimeout(res, 30));
      }
      D['elegirEvento'] = original;
      D.activo = false;
      return { lanzado: (D['usos'].get(id) ?? 0) > antes, cambios: ctx.memoria.cambiosMundo, sustos: ctx.memoria.sustos };
    };
    const inicio = { cambios: ctx.memoria.cambiosMundo, sustos: ctx.memoria.sustos };
    const sonido = await lanzar('susurro_lejano');
    const luz = await lanzar('luz_falla');
    return { inicio, sonido, luz };
  });

  expect(r.inicio).toEqual({ cambios: 0, sustos: 0 });
  expect(r.sonido.lanzado, 'el director lanzó el susurro').toBe(true);
  expect(r.sonido.cambios, 'un sonido no cambia el mundo').toBe(0);
  expect(r.luz.lanzado, 'el director lanzó la falla de luz').toBe(true);
  expect(r.luz.cambios, 'una luz que falla sí cuenta').toBe(1);
  expect(r.luz.sustos, '"sustos" sigue con su propia regla (intensidad ≥ 2): no lo toco').toBe(0);
  expect(errores, 'errores de consola').toEqual([]);
});
