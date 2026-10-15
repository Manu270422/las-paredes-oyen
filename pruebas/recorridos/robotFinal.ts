// Un jugador robot para el final del juego (P1-guion, tanda 3): juega la puerta principal del Piso 1 en el juego
// real, con ella y el director activos, siguiendo una estrategia. Camina (nunca teletransporta), se queda quieto y
// aguanta el aire cuando ella se detiene a escuchar, usa el citófono y abre las cerraduras. Sirve para MEDIR qué tan
// difícil es salir con cada estrategia (medirCerraduras.spec).
//
// Lo que "sabe" de ella es lo que oiría una persona atenta, no más:
// - dónde está, solo si está a menos de OIDO m de mí (sus pasos, su respiración, los rasguños en el muro);
// - que se detuvo a escuchar (el encuentro: su inhalación es inconfundible).
// Lo que NO hace (y una persona sí podría): correr cuando lo cazan o usar la grabadora. Por eso sus resultados son una
// cota de lo que logra alguien con esa estrategia, no una promesa.
//
// Las estrategias:
// - 'seguidas' (descuidado): desde el punto de control, a la puerta y las tres cerraduras una tras otra. Solo se
//   queda quieto, sin aire, cuando ella se detiene a escuchar. Es lo que P1-guion dice que "la trae seguro".
// - 'paciente' (cuidadoso, sin citófono): en la puerta, abre una solo si no la oye cerca; si no, espera.
// - 'citofono' (cuidadoso): una por vez. Timbra lejos desde la portería, va a la puerta, abre UNA si no la oye cerca,
//   vuelve a la portería y repite.
// - 'rafaga' (cuidadoso): timbra una vez y abre las tres seguidas.
// Cuidadoso es, además: quieto si la oye con cuerpo cerca, agachado si la oye a menos de AGACHADO m, y si la oye venir
// mientras gira una cerradura, se aparta (si el juego lo permite, alejarse la suelta a medias y no suena el final).
import type { Page } from '@playwright/test';

export type Estrategia = 'seguidas' | 'paciente' | 'citofono' | 'rafaga';

export interface ResultadoIntento {
  /** 'atascado': no pudo seguir su camino (algo le tapó el paso un buen rato). */
  resultado: 'salio' | 'muerte' | 'tiempo' | 'atascado';
  /** Lo que me delató (si morí). */
  motivo: string | null;
  /** Segundos de juego hasta salir, morir o rendirme. */
  tiempo: number;
  cerraduras: number;
  encuentros: number;
  superados: number;
  cazas: number;
  timbres: number;
  /** Cuántas veces llegué a la puerta y no abrí porque la oía cerca. */
  esperas: number;
  /** Cerraduras que solté a medias porque la oí venir. */
  soltadas: number;
  /** Timbres que sonaron en otro botón que el que quise pulsar (la mano se fue al de al lado). */
  equivocados: number;
  /** Segundos desde el primer ruido de cerradura hasta que ella estuvo a 6 m de la puerta (null: nunca). */
  llegada: number | null;
}

declare global {
  interface Window {
    __robot?: { intentar(estrategia: Estrategia, limite: number): Promise<ResultadoIntento> };
  }
}

export async function instalarRobot(page: Page): Promise<void> {
  await page.evaluate(() => {
    const J = window.__juego!;
    const { ctx } = J;
    const P = window.__piloto!;
    const C = 1.3;
    const tecla = (codigo: string, tipo: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(tipo, { code: codigo }));
    /** Hasta dónde la oigo (m): los rasguños del muro se oyen a 14 m (EstadoParedes). */
    const OIDO = 14;
    /** Con cuerpo y más cerca que esto, me quedo quieto (sus pasos, su respiración). */
    const CERCA = 6;
    /** Si la oigo a menos de esto, camino agachado. */
    const AGACHADO = 10;
    /** No abro una cerradura si la oigo a menos de esto de la puerta. */
    const SEGURA = 10;
    /** Si la oigo a menos de esto mientras giro una cerradura, me aparto. */
    const SOLTAR = 7;
    /** Lo que espero en la puerta a que se aleje antes de volver a timbrar (s de juego). */
    const PACIENCIA = 12;
    /** Dónde me paro para abrir, frente al panel, la ruta entre los dos y adónde me aparto (celdas). */
    const PUERTA: [number, number] = [16, 12.9];
    const APARTE: [number, number] = [16, 11.6];
    const PANEL: [number, number] = [28.1, 11.3];
    /** Frente a la puerta de la portería, de cada lado (celdas): ahí reviso si está abierta. */
    const ANTES_PORTERIA: [number, number] = [22.2, 10.5];
    const DENTRO_PORTERIA: [number, number] = [24.3, 10.5];
    /** Los timbres lejos de la puerta y de la portería (el del 101 la traería junto a mí), en celdas. */
    const TIMBRES = [
      { id: 'panelCitofono:timbreContadores', x: 16.8, y: 1.1 },
      { id: 'panelCitofono:timbreVestibulo', x: 11, y: 5.08 },
      { id: 'panelCitofono:timbreAscensor', x: 5.5, y: 11.5 },
    ];

    const cuenta = {
      encuentros: 0,
      superados: 0,
      cazas: 0,
      timbres: 0,
      esperas: 0,
      soltadas: 0,
      equivocados: 0,
      ultimoTimbre: '',
      motivo: null as string | null,
      primeraCerradura: null as number | null,
      llegada: null as number | null,
    };
    ctx.bus.on('encuentro', (e) => {
      if (e.estado === 'inicio') cuenta.encuentros++;
      if (e.estado === 'superado') cuenta.superados++;
    });
    ctx.bus.on('entidad-estado', (e) => {
      if (e.estado === 'cazando') cuenta.cazas++;
    });
    ctx.bus.on('citofono', (c) => {
      if (c.accion === 'timbre') {
        cuenta.timbres++;
        cuenta.ultimoTimbre = c.timbre;
      }
    });
    ctx.bus.on('jugador-atrapado', (a) => {
      cuenta.motivo = a.motivo;
    });
    ctx.bus.on('ruido', (r) => {
      const p = ctx.nivel.salidas[0]?.objeto.position;
      if (!p || cuenta.primeraCerradura !== null || (r.causa !== 'puerta' && r.causa !== ('cerradura' as typeof r.causa))) return;
      if (Math.hypot(r.x - p.x, r.z - p.z) < 1) cuenta.primeraCerradura = ctx.programador.ahora;
    });

    class Fin extends Error {}
    let limiteJuego = 0;
    let cuidadoso = true;
    const revisar = () => {
      // Desde que se marca la llegada, la anoto aquí (cada vez que el robot mira el mundo).
      if (cuenta.primeraCerradura !== null && cuenta.llegada === null) {
        const p = puerta().objeto.position;
        if (Math.hypot(ctx.entidad.posicion.x - p.x, ctx.entidad.posicion.z - p.z) <= 6) cuenta.llegada = ctx.programador.ahora - cuenta.primeraCerradura;
      }
      if (J.estado !== 'jugando') throw new Fin(J.estado);
      if (ctx.programador.ahora > limiteJuego) throw new Fin('tiempo');
    };
    const puerta = () => ctx.nivel.salidas[0];
    const yo = () => ctx.jugador.posicion;
    const distanciaA = (x: number, z: number) => Math.hypot(ctx.entidad.posicion.x - x, ctx.entidad.posicion.z - z);
    /** Dónde la oigo, si la oigo. */
    const oida = (): { x: number; z: number } | null => {
      const e = ctx.entidad;
      return Math.hypot(e.posicion.x - yo().x, e.posicion.z - yo().z) < OIDO ? { x: e.posicion.x, z: e.posicion.z } : null;
    };
    const peligro = () => {
      const e = ctx.entidad;
      if (e.enEncuentro) return true;
      if (!cuidadoso) return false;
      return e.fisica && Math.hypot(e.posicion.x - yo().x, e.posicion.z - yo().z) < CERCA;
    };
    /** Agachado si la oigo cerca (solo cuidadoso). La C alterna: la pulso si hace falta cambiar. */
    const agacharseSiHaceFalta = async () => {
      const ella = oida();
      const quiero = cuidadoso && ella !== null && Math.hypot(ella.x - yo().x, ella.z - yo().z) < AGACHADO;
      if (ctx.jugador.agachado !== quiero) {
        await P.pulsar('KeyC');
        await P.esperarReal(30);
      }
    };
    /** Si está escuchando (o, cuidadoso, con cuerpo muy cerca): quieto, y sin aire mientras escucha, hasta que se aleje. */
    const quietoSiHaceFalta = async () => {
      if (!peligro()) return;
      tecla('KeyW', 'keyup');
      let calma = 0;
      while (calma < 0.6) {
        revisar();
        if (ctx.entidad.enEncuentro) P.sostener('KeyQ');
        else P.soltar('KeyQ');
        const antes = ctx.programador.ahora;
        await P.esperarReal(20);
        calma = peligro() ? 0 : calma + (ctx.programador.ahora - antes);
      }
      P.soltar('KeyQ');
    };
    /** Camino por puntos (celdas) como el piloto, pero atento: si hace falta, me quedo quieto o me agacho. */
    const caminar = async (puntos: ReadonlyArray<readonly [number, number]>) => {
      for (const [cx, cy] of puntos) {
        const x = cx * C;
        const z = cy * C;
        const tope = performance.now() + 90_000;
        try {
          while (Math.hypot(yo().x - x, yo().z - z) > 0.25) {
            revisar();
            if (performance.now() > tope) throw new Fin(`atascado en (${cx}, ${cy})`);
            if (peligro()) {
              await quietoSiHaceFalta();
              continue;
            }
            await agacharseSiHaceFalta();
            tecla('KeyW', 'keydown');
            P.mirarA(x, ctx.camara.position.y, z);
            await P.esperarReal(16);
          }
        } finally {
          tecla('KeyW', 'keyup');
        }
      }
    };
    /** Espero tiempo de juego, atento. */
    const esperar = async (segundos: number) => {
      const fin = ctx.programador.ahora + segundos;
      while (ctx.programador.ahora < fin) {
        revisar();
        await quietoSiHaceFalta();
        await P.esperarReal(20);
      }
    };
    /**
     * Miro algo y pulso E, como una persona: corrijo la mira hasta que el indicador dice lo que quiero (con miedo la
     * cámara tiembla un poco y los botones del citófono están juntos) y recién entonces pulso, sin dejar de apuntar.
     */
    const usar = async (id: string): Promise<boolean> => {
      await quietoSiHaceFalta();
      const cosa = ctx.nivel.interactuables.find((i) => i.id === id);
      if (!cosa) throw new Error(`No hay "${id}".`);
      const p = cosa.objeto.getWorldPosition(cosa.objeto.position.clone());
      const apuntar = () => P.mirarA(p.x, id === 'puertaPrincipal' ? 1.2 : p.y, p.z);
      const tope = ctx.programador.ahora + 2;
      while (ctx.programador.ahora < tope) {
        revisar();
        apuntar();
        await P.esperarReal(16);
        if (J.interaccion.enfocado?.id !== id) continue;
        tecla('KeyE', 'keydown');
        for (let i = 0; i < 5; i++) {
          apuntar();
          await P.esperarReal(16);
        }
        tecla('KeyE', 'keyup');
        return true;
      }
      return false;
    };
    /** Si la puerta de la portería está cerrada (el director cierra puertas), la abro desde donde estoy, frente a ella. */
    const abrirPorteria = async () => {
      const p = ctx.nivel.puertas.find((x) => x.id === 'pPorteria');
      if (!p || p.abierta) return;
      const h = p.puntoInteraccion();
      const fin = ctx.programador.ahora + 4;
      while (!p.abierta && ctx.programador.ahora < fin) {
        await quietoSiHaceFalta();
        P.mirarA(h.x, h.y, h.z);
        await P.esperarJuego(0.3);
        if (J.interaccion.enfocado?.id === 'pPorteria') await P.pulsar('KeyE');
        await esperar(0.8);
      }
      await esperar(0.4);
    };
    const irAlPanel = async () => {
      await caminar([ANTES_PORTERIA]);
      await abrirPorteria();
      await caminar([DENTRO_PORTERIA, PANEL]);
    };
    const irALaPuerta = async () => {
      await caminar([DENTRO_PORTERIA]);
      await abrirPorteria();
      await caminar([ANTES_PORTERIA, PUERTA]);
    };
    /**
     * Abro la cerradura que sigue y espero a que termine su momento. Cuidadoso: si la oigo venir mientras giro, me
     * aparto (y vuelvo después, si sigo vivo). Devuelve si quedó abierta.
     */
    const abrirUna = async (): Promise<boolean> => {
      const antes = puerta().cerradurasAbiertas;
      if (!(await usar('puertaPrincipal'))) {
        // Me corrí un poco: vuelvo a pararme frente a la puerta.
        await caminar([PUERTA]);
        if (!(await usar('puertaPrincipal'))) throw new Error('El robot no logra enfocar la puerta.');
      }
      const centro = puerta().objeto.position;
      while (puerta().cerradurasAbiertas === antes) {
        const ella = oida();
        if (cuidadoso && ella && !ctx.entidad.enEncuentro && distanciaA(centro.x, centro.z) < SOLTAR) {
          cuenta.soltadas++;
          await caminar([APARTE]);
          await esperar(0.5);
          return puerta().cerradurasAbiertas > antes;
        }
        await esperar(0.05);
      }
      return true;
    };
    /** Timbro lejos de la puerta: el timbre lejano más cercano a ella, si la oigo; si no, los contadores. */
    const timbrar = async () => {
      const citofono = ctx.nivel.citofonos[0];
      while (!citofono.libre) await esperar(0.2);
      const ella = oida();
      const elegido = ella
        ? [...TIMBRES].sort((a, b) => Math.hypot(a.x * C - ella.x, a.y * C - ella.z) - Math.hypot(b.x * C - ella.x, b.y * C - ella.z))[0]
        : TIMBRES[0];
      if (!(await usar(elegido.id))) throw new Error(`El robot no logra enfocar ${elegido.id}.`);
      await P.esperarReal(50);
      if (!elegido.id.endsWith(cuenta.ultimoTimbre)) cuenta.equivocados++;
      // La escucho ir hacia el timbre.
      await esperar(2);
    };
    /** En la puerta: ¿la oigo lejos? Si no, espero un rato a que se aleje. */
    const lejosDeLaPuerta = async (paciencia: number): Promise<boolean> => {
      const fin = ctx.programador.ahora + paciencia;
      const centro = puerta().objeto.position;
      for (;;) {
        const ella = oida();
        if (!ella || distanciaA(centro.x, centro.z) >= SEGURA) return true;
        if (ctx.programador.ahora > fin) return false;
        await esperar(0.25);
      }
    };

    const estrategias = {
      async seguidas() {
        await caminar([PUERTA]);
        while (puerta().cerradurasAbiertas < 3) await abrirUna();
      },
      async paciente() {
        await caminar([PUERTA]);
        while (puerta().cerradurasAbiertas < 3) {
          if (await lejosDeLaPuerta(PACIENCIA)) await abrirUna();
          else cuenta.esperas++;
          if (Math.hypot(yo().x - PUERTA[0] * C, yo().z - PUERTA[1] * C) > 0.5) await caminar([PUERTA]);
        }
      },
      async citofono() {
        await irAlPanel();
        while (puerta().cerradurasAbiertas < 3) {
          await timbrar();
          await irALaPuerta();
          if (await lejosDeLaPuerta(PACIENCIA)) await abrirUna();
          else cuenta.esperas++;
          if (puerta().cerradurasAbiertas < 3) await irAlPanel();
        }
      },
      async rafaga() {
        await irAlPanel();
        await timbrar();
        await irALaPuerta();
        while (puerta().cerradurasAbiertas < 3) {
          if (!(await abrirUna())) await caminar([PUERTA]);
        }
      },
    };

    window.__robot = {
      async intentar(estrategia, limite) {
        Object.assign(cuenta, {
          encuentros: 0,
          superados: 0,
          cazas: 0,
          timbres: 0,
          esperas: 0,
          soltadas: 0,
          equivocados: 0,
          ultimoTimbre: '',
          motivo: null,
          primeraCerradura: null,
          llegada: null,
        });
        cuidadoso = estrategia !== 'seguidas';
        const inicio = ctx.programador.ahora;
        limiteJuego = inicio + limite;
        if (!ctx.linterna.encendida) await P.pulsar('KeyF');
        if (ctx.jugador.agachado) await P.pulsar('KeyC');
        let resultado: ResultadoIntento['resultado'] = 'salio';
        let abierta: number | null = null;
        try {
          await estrategias[estrategia]();
          abierta = ctx.programador.ahora;
          // Abiertas las tres, decide el juego: el guion me saca (la pantalla final) o, si la última me delató y me
          // está cazando, todavía no salgo. Me quedo quieto, atento, hasta que pase una de las dos cosas.
          limiteJuego = Math.max(limiteJuego, ctx.programador.ahora + 25);
          for (;;) await esperar(0.25);
        } catch (e) {
          if (!(e instanceof Fin)) throw e;
          resultado = e.message === 'tiempo' ? 'tiempo' : e.message.startsWith('atascado') ? 'atascado' : J.estado === 'muerte' || cuenta.motivo ? 'muerte' : 'salio';
        } finally {
          for (const t of ['KeyW', 'KeyQ']) tecla(t, 'keyup');
        }
        if (resultado === 'salio' && puerta().cerradurasAbiertas < 3) resultado = 'muerte';
        return {
          resultado,
          motivo: cuenta.motivo,
          // Si salí, hasta que quedó abierta la puerta (el final del guion dura unos segundos más).
          tiempo: Math.round(((resultado === 'salio' && abierta !== null ? abierta : ctx.programador.ahora) - inicio) * 10) / 10,
          cerraduras: puerta().cerradurasAbiertas,
          encuentros: cuenta.encuentros,
          superados: cuenta.superados,
          cazas: cuenta.cazas,
          timbres: cuenta.timbres,
          esperas: cuenta.esperas,
          soltadas: cuenta.soltadas,
          equivocados: cuenta.equivocados,
          llegada: cuenta.llegada === null ? null : Math.round(cuenta.llegada * 10) / 10,
        };
      },
    };
  });
}
