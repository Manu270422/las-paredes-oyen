// La geometría de la hoja de la puerta (las 4 orientaciones): colgada del borde de su celda,
// abierta queda pegada a la jamba sin sobresalir, y su colisión no estorba el vano.
// Antes la bisagra estaba a mitad del túnel y la hoja abierta sobresalía 28 cm en el aire.
import { Box3, type BoxGeometry, type CylinderGeometry, type Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import type { Direccion } from '../../src/mundo/datos/TiposMapa';
import { Puerta } from '../../src/mundo/Puerta';

const C = CONFIG.celda;
const RELLENO = (C - CONFIG.anchoVano) / 2;
const DIAMETRO_JUGADOR = CONFIG.radioJugador * 2;
/** Cada orientación con su eje de paso y la celda de la puerta (gx, gy). */
const CASOS: Array<{ abreHacia: Direccion; pasoEnZ: boolean }> = [
  { abreHacia: 'n', pasoEnZ: true },
  { abreHacia: 's', pasoEnZ: true },
  { abreHacia: 'e', pasoEnZ: false },
  { abreHacia: 'o', pasoEnZ: false },
];

function crear(abreHacia: Direccion, pasoEnZ: boolean): Puerta {
  return new Puerta({ id: 'p', x: 7, y: 9, abreHacia }, pasoEnZ, new MeshStandardMaterial());
}

/** La caja de la hoja (sin la perilla) en el mundo, con la puerta en ese estado. */
function cajaHoja(p: Puerta): Box3 {
  p.pivote.updateWorldMatrix(true, true);
  p.hoja.geometry.computeBoundingBox();
  return new Box3().copy(p.hoja.geometry.boundingBox!).applyMatrix4(p.hoja.matrixWorld);
}

const celdaDe = (p: Puerta) => ({ x0: p.gx * C, x1: (p.gx + 1) * C, z0: p.gy * C, z1: (p.gy + 1) * C });

describe.each(CASOS)('Puerta que abre hacia $abreHacia', ({ abreHacia, pasoEnZ }) => {
  it('cerrada, queda a ras del borde de su celda, a 3 cm, sin salirse', () => {
    const p = crear(abreHacia, pasoEnZ);
    const c = celdaDe(p);
    const b = cajaHoja(p);
    expect(b.min.x).toBeGreaterThanOrEqual(c.x0 - 1e-6);
    expect(b.max.x).toBeLessThanOrEqual(c.x1 + 1e-6);
    expect(b.min.z).toBeGreaterThanOrEqual(c.z0 - 1e-6);
    expect(b.max.z).toBeLessThanOrEqual(c.z1 + 1e-6);
    // El centro del plano de la hoja está a 3 cm del borde de la bisagra.
    const centro = p.puntoInteraccion();
    const eje = pasoEnZ ? centro.z : centro.x;
    const borde = pasoEnZ ? (abreHacia === 'n' ? c.z1 : c.z0) : abreHacia === 'e' ? c.x0 : c.x1;
    expect(Math.abs(eje - borde)).toBeCloseTo(0.03, 2);
  });

  it('abierta, la hoja queda dentro de su celda: no sobresale al cuarto ni al pasillo', () => {
    const p = crear(abreHacia, pasoEnZ);
    p.fijarInstantaneo(true);
    const c = celdaDe(p);
    const b = cajaHoja(p);
    for (const [valor, min, max] of [
      [b.min.x, c.x0, c.x1],
      [b.max.x, c.x0, c.x1],
      [b.min.z, c.z0, c.z1],
      [b.max.z, c.z0, c.z1],
    ] as const) {
      expect(valor).toBeGreaterThanOrEqual(min - 1e-6);
      expect(valor).toBeLessThanOrEqual(max + 1e-6);
    }
  });

  it('abierta, no atraviesa la jamba y deja el vano libre para el jugador', () => {
    const p = crear(abreHacia, pasoEnZ);
    p.fijarInstantaneo(true);
    const c = celdaDe(p);
    const b = cajaHoja(p);
    // Eje transversal al paso: la jamba de la bisagra y la jamba opuesta.
    const [min, max, jambaMin, jambaMax] = pasoEnZ ? [b.min.x, b.max.x, c.x0 + RELLENO, c.x1 - RELLENO] : [b.min.z, b.max.z, c.z0 + RELLENO, c.z1 - RELLENO];
    expect(min, 'la hoja no se clava en la jamba').toBeGreaterThan(jambaMin);
    const libre = jambaMax - max;
    expect(libre, 'ancho libre del vano con la hoja abierta').toBeGreaterThan(DIAMETRO_JUGADOR + 0.2);
  });

  it('su colisión bloquea la hoja cerrada, pegada al borde, y abierta no existe', () => {
    const p = crear(abreHacia, pasoEnZ);
    const c = celdaDe(p);
    const caja = p.cajaColision()!;
    expect(caja).not.toBeNull();
    expect(caja.minX).toBeGreaterThanOrEqual(c.x0 - 1e-6);
    expect(caja.maxX).toBeLessThanOrEqual(c.x1 + 1e-6);
    expect(caja.minZ).toBeGreaterThanOrEqual(c.z0 - 1e-6);
    expect(caja.maxZ).toBeLessThanOrEqual(c.z1 + 1e-6);
    // Contiene el plano de la hoja cerrada.
    const centro = p.puntoInteraccion();
    const [eje, desde, hasta] = pasoEnZ ? [centro.z, caja.minZ, caja.maxZ] : [centro.x, caja.minX, caja.maxX];
    expect(eje).toBeGreaterThan(desde);
    expect(eje).toBeLessThan(hasta);
    // Es una tabla delgada (no un bloque que cierre el túnel).
    expect(hasta - desde).toBeLessThan(0.1);
    p.fijarInstantaneo(true);
    expect(p.cajaColision()).toBeNull();
  });

  it('el punto de interacción sigue a la hoja: cerrada y abierta caen en puntos distintos de su celda', () => {
    const p = crear(abreHacia, pasoEnZ);
    const cerrada = p.puntoInteraccion().clone();
    p.fijarInstantaneo(true);
    const abierta = p.puntoInteraccion().clone();
    expect(cerrada.distanceTo(abierta)).toBeGreaterThan(0.3);
    const c = celdaDe(p);
    for (const v of [cerrada, abierta]) {
      expect(v.x).toBeGreaterThan(c.x0);
      expect(v.x).toBeLessThan(c.x1);
      expect(v.z).toBeGreaterThan(c.z0);
      expect(v.z).toBeLessThan(c.z1);
      expect(v.y).toBeGreaterThan(0.8);
      expect(v.y).toBeLessThan(1.3);
    }
  });
});

describe.each(CASOS)('Perilla de la puerta que abre hacia $abreHacia', ({ abreHacia, pasoEnZ }) => {
  /** La perilla es el único hijo de la hoja que es un cilindro de 3 cm de radio. */
  function perillaDe(p: Puerta) {
    const perilla = (p.hoja.children as Mesh[]).find((h) => (h.geometry as CylinderGeometry).parameters?.radiusTop === 0.03);
    expect(perilla, 'la hoja tiene perilla').toBeDefined();
    return perilla as Mesh;
  }

  it('queda DENTRO de los límites de la hoja (ancho y alto) y del lado del borde libre', () => {
    const p = crear(abreHacia, pasoEnZ);
    const perilla = perillaDe(p);
    // Todo en el marco de la propia hoja: su origen es el centro de la hoja, la bisagra está en -ancho / 2.
    const { width, height } = (p.hoja.geometry as BoxGeometry).parameters;
    perilla.updateMatrix();
    perilla.geometry.computeBoundingBox();
    const caja = new Box3().copy(perilla.geometry.boundingBox!).applyMatrix4(perilla.matrix);
    expect(caja.min.x, 'no pasa del borde de la bisagra').toBeGreaterThan(-width / 2);
    expect(caja.max.x, 'no pasa del borde libre (antes flotaba 37 cm afuera)').toBeLessThan(width / 2);
    expect(caja.min.y).toBeGreaterThan(-height / 2);
    expect(caja.max.y).toBeLessThan(height / 2);
    // Del lado del borde libre, no de la bisagra: ahí van las bisagras.
    expect(caja.min.x).toBeGreaterThan(0);
  });

  it('sobresale por AMBAS caras de la hoja, por igual', () => {
    const p = crear(abreHacia, pasoEnZ);
    const perilla = perillaDe(p);
    const { depth } = (p.hoja.geometry as BoxGeometry).parameters;
    perilla.updateMatrix();
    perilla.geometry.computeBoundingBox();
    const caja = new Box3().copy(perilla.geometry.boundingBox!).applyMatrix4(perilla.matrix);
    expect(caja.min.z, 'sobresale por la cara de atrás').toBeLessThan(-depth / 2);
    expect(caja.max.z, 'sobresale por la cara de adelante').toBeGreaterThan(depth / 2);
    expect(Math.abs(caja.min.z + caja.max.z), 'simétrica respecto al centro de la hoja').toBeLessThan(1e-6);
  });

  it('cerrada, queda dentro del hueco del vano (no enterrada en la jamba ni en la pared)', () => {
    const p = crear(abreHacia, pasoEnZ);
    const c = celdaDe(p);
    p.pivote.updateWorldMatrix(true, true);
    const caja = new Box3().setFromObject(perillaDe(p));
    const [min, max, jambaMin, jambaMax] = pasoEnZ ? [caja.min.x, caja.max.x, c.x0 + RELLENO, c.x1 - RELLENO] : [caja.min.z, caja.max.z, c.z0 + RELLENO, c.z1 - RELLENO];
    expect(min).toBeGreaterThan(jambaMin);
    expect(max).toBeLessThan(jambaMax);
  });
});
