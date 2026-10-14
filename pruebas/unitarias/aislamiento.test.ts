// El cuarto sordo (P2-guion, tanda 2) sin navegador: qué separa un cuarto acolchado y que ella no oiga a través de él
// ni con el ruido más fuerte, en ninguna dificultad.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { TABLA_DIFICULTAD } from '../../src/config/Dificultad';
import { Percepcion } from '../../src/ia/Percepcion';
import { aislaAcolchado, esAcolchado } from '../../src/mundo/Aislamiento';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import type { Ruido } from '../../src/nucleo/Eventos';
import { PISO_2 } from '../../src/pisos/piso2';

const cuarto = (id: string) => PISO_2.mapa.habitaciones.find((h) => h.id === id)!;

describe('Los cuartos acolchados del Piso 2', () => {
  it('el 202 entero y el archivo del 201 están forrados; el pasillo, la oficina y el 203, no', () => {
    const forrados = PISO_2.mapa.habitaciones.filter(esAcolchado).map((h) => h.id);
    expect(forrados.sort()).toEqual(['archivo201', 'cuarto202', 'dormitorio202', 'sala202']);
    for (const id of forrados) expect(cuarto(id).reverb, `${id}: sin eco`).toBe('acolchado');
  });

  it('aíslan entre un cuarto acolchado y cualquier otro lugar (también un muro), en los dos sentidos', () => {
    expect(aislaAcolchado(cuarto('sala202'), cuarto('pasillo'))).toBe(true);
    expect(aislaAcolchado(cuarto('pasillo'), cuarto('sala202'))).toBe(true);
    expect(aislaAcolchado(null, cuarto('sala202')), 'ella dentro del muro').toBe(true);
    expect(aislaAcolchado(cuarto('sala202'), cuarto('dormitorio202')), 'dos cuartos forrados distintos').toBe(true);
  });

  it('dentro del mismo cuarto acolchado, y entre cuartos sin forrar, el sonido es normal', () => {
    expect(aislaAcolchado(cuarto('sala202'), cuarto('sala202'))).toBe(false);
    expect(aislaAcolchado(cuarto('pasillo'), cuarto('oficina201'))).toBe(false);
    expect(aislaAcolchado(null, cuarto('pasillo'))).toBe(false);
  });
});

describe('Ella, a través de los colchones', () => {
  const ctx = (aislado: boolean) =>
    ({ nivel: { consultaOclusion: () => 1, consultaAislamiento: () => aislado } }) as unknown as ContextoJuego;
  // El doble del ruido más fuerte que hago (correr pegado a un muro: 0.9 × 1.6): margen de sobra.
  const ruido: Ruido = { x: 0, z: 0, intensidad: 2 * CONFIG.ruido.pasoCorriendo * CONFIG.ruido.multiplicadorPared, origen: 'jugador', causa: 'carrera' };
  const percepcion = new Percepcion();

  it('no oye ni el ruido más fuerte, pegada al muro, ni con el mejor oído de todas las dificultades', () => {
    const oidoMaximo = Math.max(...Object.values(TABLA_DIFICULTAD).map((d) => d.oido));
    const dentroDelMuro = percepcion.percibir(ruido, 0.3, 0, true, ctx(true)) * oidoMaximo;
    const conCuerpo = percepcion.percibir(ruido, 0.3, 0, false, ctx(true)) * oidoMaximo;
    expect(dentroDelMuro).toBeLessThan(CONFIG.entidad.umbralAudicion);
    expect(conCuerpo).toBeLessThan(CONFIG.entidad.umbralAudicion);
  });

  it('sin colchones, el mismo ruido le llega de sobra', () => {
    expect(percepcion.percibir(ruido, 0.3, 0, true, ctx(false))).toBeGreaterThan(CONFIG.entidad.umbralAudicion * 5);
  });
});
