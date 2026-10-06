// La tabla de dificultades (config/Dificultad.ts):
// 1) La FOTO de Normal: sus valores son los del juego congelado para el Gate 1. Están escritos a mano, leídos
//    de la etiqueta con `git show gate1-congelado:<archivo>` (archivo y línea al lado de cada uno). Si alguien
//    toca Normal, esta prueba falla: cambiar Normal es cambiar el juego que probaron los testers.
// 2) El PISO DE JUSTICIA: ninguna dificultad, ni Pesadilla, quita el aviso antes de cazar ni vuelve imposible
//    el encuentro.
// 3) El orden: cada palanca empeora (o se queda igual) de Historia a Pesadilla.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { DIFICULTADES, puntoDeControlDe, TABLA_DIFICULTAD, type ValoresDificultad } from '../../src/config/Dificultad';
import { PISO_INICIAL as PISO } from '../../src/pisos/catalogo';
import { DirectorTerror } from '../../src/director/DirectorTerror';
import { RADIO_ENCUENTRO } from '../../src/ia/estados/EstadoInvestigando';
import { PERDIDA_AIRE_POR_MIEDO } from '../../src/jugador/Respiracion';

describe('Normal es el juego de gate1-congelado', () => {
  it('valor por valor', () => {
    expect(TABLA_DIFICULTAD.normal).toEqual({
      avisoCaza: 0.8, // src/ia/estados/EstadoCazando.ts:17  const ARRANQUE = 0.8
      oido: 1, // no había multiplicador: el ruido llegaba tal cual
      radioPresencia: 1.9, // src/config/ConfiguracionJuego.ts:68  radioPresencia: 1.9
      velocidadCaza: 3.15, // src/config/ConfiguracionJuego.ts:60  velocidadCazar: 3.15
      duracionEncuentro: [2.8, 4.6], // src/ia/estados/EstadoInvestigando.ts:24
      graciaEncuentro: 0.9, // src/ia/estados/EstadoInvestigando.ts:31  GRACIA_INHALACION
      bateria: 480, // src/config/ConfiguracionJuego.ts:34  duracionBateria: 480
      presupuesto: 1, // src/director/PresupuestoTension.ts:29  LIMITE_FASE sin multiplicar
      alivio: { porMuerte: 0.15, tope: 0.45, modo: 'techo' }, // src/director/DirectorTerror.ts:81  Math.min(0.45, … * 0.15), limite × (1 − alivio)
      puntosControl: 'todos', // src/nucleo/Juego.ts:265  const punto = PUNTOS_CONTROL[nombre]: toda bandera de la lista guardaba
      pistas: true, // src/ui/hud/HUD.ts:84  bus.on('pista', (p) => this.pistas.agregar(p.texto)): siempre
      indicadorAire: true, // src/ui/hud/EstadoJugadorHUD.ts:38  this.aire.fijar(aire, aguantando || aire < 0.98, …): siempre
      // NUEVO en la Tarea 4 (aprobado): a la 3.ª muerte seguida solo OFRECE bajar a Historia. Si no se acepta, el juego es el mismo.
      ofrecerBajarA: 'historia',
    });
  });
});

describe.each(DIFICULTADES.map((id) => [id, TABLA_DIFICULTAD[id]] as const))('Piso de justicia en %s', (_id, v: ValoresDificultad) => {
  it('hay aviso antes de cazar (≥ 0.5 s)', () => {
    expect(v.avisoCaza).toBeGreaterThanOrEqual(0.5);
  });

  it('correr sirve: caza a no más del 95 % de mi velocidad corriendo', () => {
    expect(v.velocidadCaza).toBeLessThanOrEqual(CONFIG.velocidadCorrer * 0.95);
  });

  it('el encuentro llega antes que la presencia: si me quedo quieto, me escucha antes de sentirme', () => {
    expect(v.radioPresencia).toBeLessThanOrEqual(RADIO_ENCUENTRO - 0.4);
  });

  it('el encuentro existe y se puede aguantar: dura menos que el aire con miedo máximo, con 0.3 s de margen', () => {
    const [minimo, maximo] = v.duracionEncuentro;
    expect(minimo).toBeGreaterThan(0);
    expect(maximo).toBeGreaterThanOrEqual(minimo);
    expect(maximo + 0.3).toBeLessThanOrEqual(CONFIG.duracionAire * (1 - PERDIDA_AIRE_POR_MIEDO));
  });

  it('hay una ventana para reaccionar al empezar el encuentro (≥ 0.6 s)', () => {
    expect(v.graciaEncuentro).toBeGreaterThanOrEqual(0.6);
  });

  it('el alivio nunca vuelve inofensivo al director (tope ≤ 60 %)', () => {
    expect(v.alivio.tope).toBeLessThanOrEqual(0.6);
  });
});

describe('Cada palanca va de más fácil a más difícil, en orden', () => {
  const columna = <T>(f: (v: ValoresDificultad) => T) => DIFICULTADES.map((id) => f(TABLA_DIFICULTAD[id]));
  const creciente = (xs: number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1]);
  const decreciente = (xs: number[]) => xs.every((x, i) => i === 0 || x <= xs[i - 1]);

  it('menos aviso, menos gracia, menos batería y menos alivio', () => {
    expect(decreciente(columna((v) => v.avisoCaza))).toBe(true);
    expect(decreciente(columna((v) => v.graciaEncuentro))).toBe(true);
    expect(decreciente(columna((v) => v.bateria))).toBe(true);
    expect(decreciente(columna((v) => v.alivio.tope))).toBe(true);
  });

  it('más oído, más presencia, más velocidad, encuentros no más cortos y más presupuesto', () => {
    expect(creciente(columna((v) => v.oido))).toBe(true);
    expect(creciente(columna((v) => v.radioPresencia))).toBe(true);
    expect(creciente(columna((v) => v.velocidadCaza))).toBe(true);
    expect(creciente(columna((v) => v.duracionEncuentro[1]))).toBe(true);
    expect(creciente(columna((v) => v.presupuesto))).toBe(true);
  });
});

describe('Los dos modos del alivio', () => {
  it("'techo' (Normal): con 4 muertes seguidas baja el techo un 45 % y no espacia los eventos", () => {
    const d = new DirectorTerror();
    d.reiniciar(4, TABLA_DIFICULTAD.normal.alivio);
    expect(d['alivioDelTecho']).toBeCloseTo(0.45, 10);
    expect(d['estiramiento']).toBe(1);
  });

  it("'intervalos' (Historia): el techo no se toca y los eventos se espacian (con 4 muertes, × 1.6)", () => {
    const d = new DirectorTerror();
    d.reiniciar(4, TABLA_DIFICULTAD.historia.alivio);
    expect(d['alivioDelTecho']).toBe(0);
    expect(d['estiramiento']).toBeCloseTo(1.6, 10);
  });
});

describe('Puntos de control por dificultad (Piso 4)', () => {
  const crean = (id: (typeof DIFICULTADES)[number]) =>
    Object.keys(PISO.puntosControl).filter((bandera) => puntoDeControlDe(PISO, TABLA_DIFICULTAD[id], bandera) !== undefined);
  const todas = Object.keys(PISO.puntosControl);

  it('Historia y Normal guardan en todos los del paquete', () => {
    expect(crean('historia')).toEqual(todas);
    expect(crean('normal')).toEqual(todas);
  });

  it('Difícil solo al medir un apartamento: el tablero y la llave hay que conseguirlos sin morir', () => {
    expect(crean('dificil')).toEqual(['medido:401', 'medido:403']);
  });

  it('Pesadilla en ninguno', () => {
    expect(crean('pesadilla')).toEqual([]);
  });

  it('una bandera que no es punto de control no crea ninguno en ninguna dificultad', () => {
    for (const id of DIFICULTADES) expect(puntoDeControlDe(PISO, TABLA_DIFICULTAD[id], 'leyo:diario_rosalba')).toBeUndefined();
  });
});

describe('La oferta de bajar tras morir seguido', () => {
  it('ofrece exactamente un escalón más fácil, y nunca la que no guarda', () => {
    for (const id of DIFICULTADES) {
      const destino = TABLA_DIFICULTAD[id].ofrecerBajarA;
      if (destino === null) continue;
      expect(DIFICULTADES.indexOf(destino), `${id} → ${destino}`).toBe(DIFICULTADES.indexOf(id) - 1);
      expect(TABLA_DIFICULTAD[destino].puntosControl).not.toBe('ninguno');
    }
  });

  it('se ofrece en Normal y en Difícil; no en Historia (ya es la más fácil) ni en Pesadilla (se eligió a conciencia)', () => {
    expect(DIFICULTADES.filter((id) => TABLA_DIFICULTAD[id].ofrecerBajarA !== null)).toEqual(['normal', 'dificil']);
  });
});
