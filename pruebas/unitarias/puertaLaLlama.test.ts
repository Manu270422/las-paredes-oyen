// El final del Piso 1 (P1-guion, tanda 3) sin navegador: las dos reglas nuevas de ella.
// 1) "La puerta la llama": si lo último que oyó fue una cerradura de la puerta principal, va rápido por los muros
//    (llega en LLEGADA_PUERTA s, haciéndose oír) y, junto a la puerta, sale aunque el director no quiera, cerca del
//    jugador pero no encima. Una vez por cerradura. Con cualquier otro ruido, todo sigue como antes.
// 2) "El timbre la ocupa": tras un timbre del citófono, un ruido más débil no la saca de ahí durante un rato (lo más
//    fuerte, sí); el botón del jugador no la ocupa.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { Memoria, OCUPADA_POR_TIMBRE, SACA_DEL_TIMBRE } from '../../src/ia/Memoria';
import { DISTANCIA_SALIDA_PUERTA, EstadoParedes, LLEGADA_PUERTA } from '../../src/ia/estados/EstadoParedes';
import type { Entidad } from '../../src/ia/Entidad';
import type { Ruido } from '../../src/nucleo/Eventos';
import { crearContextoFalso } from './contextoFalso';

/** Una entidad mínima: solo lo que usa el estado de las paredes, anotando lo que hace. */
function entidadFalsa(x: number, z: number) {
  const hechos = {
    sonidos: [] as Array<{ id: string; descripcion: string }>,
    salidas: [] as Array<{ x: number; z: number; minima: number }>,
    estados: [] as string[],
    velocidades: [] as number[],
  };
  const e = {
    memoria: new Memoria(),
    posicion: { x, y: 0, z },
    fisica: false,
    pose: 'quieto',
    puedeManifestarse: true,
    solicitudAcecho: false,
    pausaSalida: 0,
    desvanecer() {
      e.fisica = false;
    },
    distanciaAlJugador(ctx: { jugador: { posicion: { x: number; z: number } } }) {
      return Math.hypot(e.posicion.x - ctx.jugador.posicion.x, e.posicion.z - ctx.jugador.posicion.z);
    },
    deslizarHacia(ax: number, az: number, velocidad: number, dt: number) {
      hechos.velocidades.push(velocidad);
      const d = Math.hypot(ax - e.posicion.x, az - e.posicion.z);
      if (d < 1e-6) return;
      const paso = Math.min(d, velocidad * dt);
      e.posicion.x += ((ax - e.posicion.x) / d) * paso;
      e.posicion.z += ((az - e.posicion.z) / d) * paso;
    },
    sonarEnPared(id: string, _ctx: unknown, _volumen: number, descripcion: string) {
      hechos.sonidos.push({ id, descripcion });
    },
    buscarPuntoSalida(sx: number, sz: number, _ctx: unknown, minima: number) {
      // Un punto libre a `minima` m del jugador, del lado de ella (lo que haría la rejilla real).
      hechos.salidas.push({ x: sx, z: sz, minima });
      return { x: sx, z: sz - minima - 0.5 };
    },
    manifestar(mx: number, mz: number) {
      e.fisica = true;
      e.posicion.x = mx;
      e.posicion.z = mz;
    },
    cambiarEstado(nombre: string) {
      hechos.estados.push(nombre);
    },
    irHacia() {
      return true;
    },
  };
  return { e, hechos, entidad: e as unknown as Entidad };
}

/** El escenario: el jugador frente a la puerta (en z = 18) y ella lejos, en los muros (a 16 m). */
function armar(opciones: { director?: boolean } = {}) {
  const falso = crearContextoFalso({
    grabadora: { midiendo: null },
    nivel: { consultaAislamiento: () => false, acolchadoEn: () => false },
    director: {
      permiteAcercarse: false,
      permitePresencia: true,
      permiteManifestacion: opciones.director ?? false,
    },
  });
  falso.ctx.jugador.posicion.x = 20.8;
  falso.ctx.jugador.posicion.z = 16.8;
  const { e, hechos, entidad } = entidadFalsa(20.8, 1.4);
  const estado = new EstadoParedes();
  estado.entrar(entidad);
  const relevantes: string[] = [];
  falso.bus.on('sonido-relevante', (s) => relevantes.push(s.descripcion));
  /** Ella oye un ruido (lo registra su memoria, como en Entidad.oir). */
  const oir = (ruido: Ruido, fuerza: number) => e.memoria.registrarRuido(ruido.x, ruido.z, fuerza, falso.reloj.ahora, ruido.origen === 'jugador' ? ruido : null, ruido);
  const correr = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) {
      falso.reloj.ahora += 0.05;
      estado.actualizar(entidad, falso.ctx, 0.05);
    }
  };
  return { falso, e, hechos, estado, oir, correr, relevantes };
}

const cerradura = (intensidad = 0.45): Ruido => ({ x: 20.8, z: 18.17, intensidad, origen: 'jugador', causa: 'cerradura' });

describe('La puerta la llama', () => {
  it('una cerradura la trae rápido por los muros: llega en LLEGADA_PUERTA s y se hace oír desde que sale', () => {
    const m = armar();
    m.oir(cerradura(), 0.07);
    m.correr(LLEGADA_PUERTA + 0.2);
    const falta = Math.hypot(m.e.posicion.x - 20.8, m.e.posicion.z - 18.17);
    expect(falta, 'ya está junto a la puerta').toBeLessThan(3);
    expect(Math.max(...m.hechos.velocidades)).toBeGreaterThan(CONFIG.entidad.velocidadParedes * 2);
    expect(m.hechos.sonidos[0]).toEqual({ id: 'friccion_muro', descripcion: 'algo corre por dentro del muro, hacia la puerta' });
    expect(m.hechos.sonidos.filter((s) => s.id === 'rasguno').length, 'rasguños mientras viene').toBeGreaterThanOrEqual(2);
  });

  it('junto a la puerta sale aunque el director no quiera, cerca del jugador pero no encima, y va a buscar', () => {
    const m = armar({ director: false });
    m.oir(cerradura(), 0.07);
    m.correr(LLEGADA_PUERTA + 1);
    expect(m.e.fisica).toBe(true);
    expect(m.hechos.salidas[0].minima).toBe(DISTANCIA_SALIDA_PUERTA);
    expect(m.hechos.estados).toEqual(['investigando']);
    expect(m.e.pausaSalida, 'escucha menos antes de caminar').toBeLessThan(1.5);
    expect(m.relevantes).toContain('algo se desprende del muro, cerca de la puerta');
  });

  it('una vez por cerradura: si vuelve al muro, no sale otra vez por la misma (se queda vigilando)', () => {
    const m = armar();
    m.oir(cerradura(), 0.07);
    m.correr(LLEGADA_PUERTA + 1);
    expect(m.hechos.estados).toHaveLength(1);
    m.e.fisica = false;
    m.estado.entrar(m.e as unknown as Entidad);
    m.correr(5);
    expect(m.hechos.estados, 'la misma cerradura no la saca de nuevo').toHaveLength(1);
    // Otra cerradura (otro momento): sí.
    m.oir(cerradura(0.5), 0.3);
    m.correr(1);
    expect(m.hechos.estados).toHaveLength(2);
  });

  it('cualquier otro ruido, como antes: sin director no sale y no corre', () => {
    const m = armar({ director: false });
    m.oir({ x: 20.8, z: 18.17, intensidad: 0.4, origen: 'puerta', causa: 'puerta' }, 0.4);
    m.correr(12);
    expect(m.e.fisica).toBe(false);
    expect(Math.max(...m.hechos.velocidades)).toBeLessThanOrEqual(CONFIG.entidad.velocidadParedes);
    expect(m.hechos.sonidos.some((s) => s.id === 'friccion_muro')).toBe(false);
  });
});

describe('El timbre la ocupa', () => {
  const timbre: Ruido = { x: 21.8, z: 1.4, intensidad: 0.8, origen: 'entorno', causa: 'citofono' };
  const paso: Ruido = { x: 30, z: 15, intensidad: 0.38, origen: 'jugador', causa: 'paso' };

  it('tras el timbre, un ruido más débil no la saca de ahí (pero sí sabe dónde sonó)', () => {
    const memoria = new Memoria();
    memoria.registrarRuido(timbre.x, timbre.z, 0.3, 10, null, timbre);
    expect(memoria.registrarRuido(paso.x, paso.z, 0.06, 13, paso, paso)).toBe(false);
    expect(memoria.atendioUltimo).toBe(false);
    expect(memoria.ultimoRuido).toMatchObject({ x: timbre.x, z: timbre.z, timbre: true });
    expect(memoria.ultimaPosicionJugador, 'recuerda dónde sonó el paso').toMatchObject({ x: paso.x, z: paso.z });
  });

  it('lo fuerte sí la saca (más que el timbre, o al menos SACA_DEL_TIMBRE)', () => {
    const memoria = new Memoria();
    memoria.registrarRuido(timbre.x, timbre.z, 0.1, 10, null, timbre);
    expect(memoria.registrarRuido(paso.x, paso.z, SACA_DEL_TIMBRE, 11, paso, paso)).toBe(true);
    expect(memoria.ultimoRuido).toMatchObject({ x: paso.x, z: paso.z, causa: 'paso' });
  });

  it('el rato se acaba: pasado OCUPADA_POR_TIMBRE, cualquier ruido la lleva', () => {
    const memoria = new Memoria();
    memoria.registrarRuido(timbre.x, timbre.z, 0.3, 10, null, timbre);
    expect(memoria.registrarRuido(paso.x, paso.z, 0.06, 10 + OCUPADA_POR_TIMBRE + 0.1, paso, paso)).toBe(true);
  });

  it('el botón del jugador (su clic, también del citófono) no la ocupa', () => {
    const memoria = new Memoria();
    const clic: Ruido = { x: 37, z: 14.7, intensidad: 0.15, origen: 'jugador', causa: 'citofono' };
    memoria.registrarRuido(clic.x, clic.z, 0.2, 10, clic, clic);
    expect(memoria.registrarRuido(timbre.x, timbre.z, 0.06, 10.5, null, timbre), 'el timbre lejano sí cuenta después').toBe(true);
  });

  it('la cerradura lejana tampoco la saca del timbre (es lo que hace servir el citófono)', () => {
    const memoria = new Memoria();
    memoria.registrarRuido(timbre.x, timbre.z, 0.3, 10, null, timbre);
    const c = cerradura(0.5);
    expect(memoria.registrarRuido(c.x, c.z, 0.075, 15, c, c)).toBe(false);
    expect(memoria.ultimoRuido?.causa).toBe('citofono');
  });
});
