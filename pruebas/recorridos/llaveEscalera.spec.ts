// La llave de la reja de la escalera, caminando. Antes del final no está. Con el final despierto en la escalera
// sin nada en la mano: la reja no cede. Camino al 402, entro al cuarto y la encuentro en el piso, bajo la silla
// que mira la pared. Con ella en el bolsillo (y la partida guardada junto a la reja), vuelvo caminando: la
// primera E abre la reja (el candado cae y hace ruido), la segunda baja. Al volver a subir, sigue abierta.
// La puerta del 402 la desbloqueo directamente: la ruta de su llave ya la camina llave.spec.ts.
import { expect, test } from '@playwright/test';
import { abrirEleccion, elegirYEmpezar, esperarJugando, PREFIJO } from './acciones';

test('la llave de la escalera se encuentra bajo la silla del 402 después del final, y con ella se baja', async ({ page }) => {
  test.setTimeout(240_000);
  const errores: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });
  page.on('pageerror', (e) => errores.push(String(e)));
  await abrirEleccion(page);
  await elegirYEmpezar(page, 'Normal');
  await esperarJugando(page);

  const r = await page.evaluate(async (prefijo) => {
    const J = window.__juego!;
    const P = window.__piloto!;
    const { ctx } = J;
    const subtitulos: string[] = [];
    ctx.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
    const llave = () => ctx.nivel.interactuables.find((i) => i.id === 'llaveEscalera')!;
    const puerta = (id: string) => ctx.nivel.puertas.find((p) => p.id === id)!;
    const abrir = async (id: string) => {
      const h = puerta(id).puntoInteraccion();
      P.mirarA(h.x, h.y, h.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
      const limite = performance.now() + 8000;
      while (!puerta(id).abierta && performance.now() < limite) await P.esperarReal(30);
      await P.esperarJuego(0.8);
    };
    const asomarmeYPulsar = async () => {
      await P.caminar([[2.2, 9.5]]);
      const z = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
      P.mirarA(z.x, z.y, z.z);
      await P.esperarJuego(0.3);
      await P.pulsar('KeyE');
    };

    const antesDelFinal = llave().activo;

    // El final del 402 (su guion de verdad): despierto en la escalera, un viaje al mismo piso.
    let desperto = false;
    ctx.bus.on('piso-cambiado', ({ desde, hacia }) => (desperto ||= desde === 'piso4' && hacia === 'piso4'));
    ctx.progreso.marcar('medido:402');
    const l1 = performance.now() + 40_000;
    while (!(desperto && J.estado === 'jugando') && performance.now() < l1) await P.esperarReal(50);
    await P.esperarJuego(0.5);

    // Sin la llave, la reja no cede.
    await asomarmeYPulsar();
    await P.esperarJuego(0.8);
    const sinLlave = { piso: ctx.piso.id, candado: subtitulos.includes('La cadena está dada vuelta con candado.') };

    // Al 402 y a su cuarto, caminando.
    await P.caminar([[3.6, 10.5], [12, 10.5], [14.5, 10.5]]);
    puerta('p402').desbloquear();
    await abrir('p402');
    await P.caminar([[14.5, 12.4], [14.5, 15.4], [18.5, 15.4]]);
    await abrir('pCuarto402');
    await P.caminar([[18.5, 16.6], [18.45, 17.8]], 0.18);
    const p = llave().objeto.position;
    P.mirarA(p.x, p.y, p.z);
    await P.esperarJuego(0.4);
    const enfocada = J.interaccion.enfocado?.id ?? null;
    await P.pulsar('KeyE');
    await P.esperarJuego(0.6);
    const tomada = {
      enBolsillo: ctx.progreso.tieneObjeto('llave_escalera'),
      yaNoEsta: !llave().activo,
      mensaje: subtitulos.some((s) => s.includes('Es de un candado')),
      guardada: JSON.parse(localStorage.getItem(prefijo + 'partida') ?? 'null'),
    };

    // De vuelta a la escalera, caminando. Con la llave, la primera E ABRE la reja (no baja).
    await P.caminar([[18.5, 16.6], [18.5, 15.4], [14.5, 15.4], [14.5, 12.4], [14.5, 10.5], [3.6, 10.5]]);
    const ruidos: Array<{ x: number; z: number; causa: string }> = [];
    ctx.bus.on('ruido', (r) => ruidos.push({ x: r.x, z: r.z, causa: r.causa }));
    await P.caminar([[2.2, 9.5]]);
    const z = ctx.nivel.interactuables.find((i) => i.id === 'bajada')!.objeto.position;
    P.mirarA(z.x, z.y, z.z);
    await P.esperarJuego(0.3);
    const textoConLlave = J.interaccion.enfocado?.texto(ctx) ?? null;
    await P.pulsar('KeyE');
    await P.esperarJuego(0.2);
    const reja = ctx.nivel.rejas[0];
    const apertura = { abriendo: reja.abriendo, piso: ctx.piso.id };
    const l2 = performance.now() + 8000;
    while (!reja.abierta && performance.now() < l2) await P.esperarReal(30);
    const candado = reja.posicion();
    const abierta = {
      abierta: reja.abierta,
      bandera: ctx.progreso.tiene('abierta:bajada'),
      ruidoDelCandado: ruidos.some((r) => r.causa === 'puerta' && Math.hypot(r.x - candado.x, r.z - candado.z) < 1),
      textoDespues: (await (async () => {
        await P.esperarJuego(0.3);
        return J.interaccion.enfocado?.texto(ctx) ?? null;
      })()),
    };
    // Ya abierta: E baja.
    await P.pulsar('KeyE');
    const l3 = performance.now() + 20_000;
    while (!(J.estado === 'jugando' && ctx.piso.id === 'piso3') && performance.now() < l3) await P.esperarReal(30);
    const pisoTrasBajar = ctx.piso.id;

    // Subo otra vez: la reja del Piso 4 sigue abierta (se armó de nuevo, sin animación).
    ctx.director.bloquear(999);
    ctx.entidad.puedeManifestarse = false;
    await P.caminar([[2.2, 9.5]]);
    const s = ctx.nivel.interactuables.find((i) => i.id === 'subida')!.objeto.position;
    P.mirarA(s.x, s.y, s.z);
    await P.esperarJuego(0.3);
    await P.pulsar('KeyE');
    const l4 = performance.now() + 20_000;
    while (!(J.estado === 'jugando' && ctx.piso.id === 'piso4') && performance.now() < l4) await P.esperarReal(30);
    const alVolver = { piso: ctx.piso.id, rejaAbierta: ctx.nivel.rejas[0]?.abierta ?? null };
    return { antesDelFinal, sinLlave, enfocada, tomada, textoConLlave, apertura, abierta, pisoTrasBajar, alVolver, estado: J.estado };
  }, PREFIJO);

  expect(r.antesDelFinal, 'antes del final la llave no está').toBe(false);
  expect(r.sinLlave.piso, 'sin la llave no bajé').toBe('piso4');
  expect(r.sinLlave.candado, 'la reja dice que tiene candado').toBe(true);
  expect(r.enfocada, 'bajo la silla, la llave se enfoca').toBe('llaveEscalera');
  expect(r.tomada.enBolsillo).toBe(true);
  expect(r.tomada.yaNoEsta).toBe(true);
  expect(r.tomada.mensaje, 'el mensaje dice que es de un candado').toBe(true);
  expect(r.tomada.guardada, 'tomarla guarda la partida junto a la reja').toMatchObject({ puntoControl: 'escalera', progreso: { inventario: ['llave_escalera'] } });
  expect(r.textoConLlave, 'con la llave, lo que hago es abrir').toBe('Abrir el candado');
  expect(r.apertura, 'la primera E abre la reja, no baja').toEqual({ abriendo: true, piso: 'piso4' });
  expect(r.abierta.abierta).toBe(true);
  expect(r.abierta.bandera, 'queda abierta con su bandera').toBe(true);
  expect(r.abierta.ruidoDelCandado, 'el candado al caer hace ruido de puerta (la criatura lo oye)').toBe(true);
  expect(r.abierta.textoDespues, 'abierta, el tramo vuelve a decir a dónde lleva').toBe('Bajar al Piso 3');
  expect(r.pisoTrasBajar, 'abierta, E baja al Piso 3').toBe('piso3');
  expect(r.alVolver, 'al volver a subir, la reja del Piso 4 sigue abierta').toEqual({ piso: 'piso4', rejaAbierta: true });
  expect(r.estado).toBe('jugando');
  expect(errores).toEqual([]);
});
