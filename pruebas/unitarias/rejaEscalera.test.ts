// La reja del tramo que baja: abrirla es un momento (la llave, el candado que cae, la cadena, las hojas) y hace
// ruido una vez, como una puerta. Abierta se queda abierta; al cargar se pone sin animación.
import { Group, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { RejaEscalera } from '../../src/mundo/RejaEscalera';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { crearContextoFalso } from './contextoFalso';

/** Una reja como la arma ConstructorEscalera: cada pieza es un grupo (su eje) con la malla como hijo. */
function armarReja() {
  const grupo = new Group();
  grupo.name = 'reja';
  for (const nombre of ['reja-hoja-izq', 'reja-hoja-der', 'reja-cadena', 'reja-candado']) {
    const eje = new Group();
    eje.name = nombre;
    eje.position.set(2, 0.7, 14);
    eje.add(new Object3D());
    grupo.add(eje);
  }
  grupo.userData.caida = { cadena: 1.1, candado: 0.9 };
  return grupo;
}

const malla = (g: Group, nombre: string) => g.getObjectByName(nombre)!.children[0];

describe('RejaEscalera', () => {
  it('se abre en orden (llave, cede, candado al caer, cadena, chirrido), hace ruido una vez y al final avisa', () => {
    const falso = crearContextoFalso();
    const g = armarReja();
    const reja = new RejaEscalera(g);
    const alTerminar = vi.fn();
    reja.abrir(alTerminar);
    expect(reja.abriendo).toBe(true);
    for (let i = 0; i < 100; i++) reja.actualizar(0.05, falso.ctx as ContextoJuego);
    expect(falso.sonidos).toEqual(['llave', 'cerradura', 'cadena', 'candado', 'puerta_crujido']);
    expect(falso.ruidos.map((r) => r.causa), 'el candado contra el escalón: una vez, como una puerta').toEqual(['puerta']);
    expect(alTerminar).toHaveBeenCalledTimes(1);
    expect(reja.abierta).toBe(true);
    expect(reja.abriendo).toBe(false);
    expect(malla(g, 'reja-hoja-izq').rotation.y, 'las hojas, abiertas hacia adentro').toBeCloseTo(-1.7);
    expect(malla(g, 'reja-hoja-der').rotation.y).toBeCloseTo(1.7);
    expect(malla(g, 'reja-candado').position.y, 'el candado quedó en el escalón').toBeCloseTo(-0.9);
    expect(malla(g, 'reja-cadena').position.y).toBeCloseTo(-1.1);
  });

  it('a medio abrir, las hojas todavía no se movieron y el candado va cayendo', () => {
    const falso = crearContextoFalso();
    const g = armarReja();
    const reja = new RejaEscalera(g);
    reja.abrir(() => undefined);
    for (let i = 0; i < 20; i++) reja.actualizar(0.05, falso.ctx as ContextoJuego);
    expect(malla(g, 'reja-hoja-izq').rotation.y).toBe(-0);
    expect(malla(g, 'reja-candado').position.y).toBeLessThan(0);
    expect(reja.abierta).toBe(false);
  });

  it('fijar la pone abierta o cerrada al instante, sin sonidos ni aviso', () => {
    const falso = crearContextoFalso();
    const g = armarReja();
    const reja = new RejaEscalera(g);
    reja.fijar(true);
    expect(reja.abierta).toBe(true);
    expect(malla(g, 'reja-hoja-der').rotation.y).toBeCloseTo(1.7);
    reja.fijar(false);
    expect(reja.abierta).toBe(false);
    expect(malla(g, 'reja-hoja-der').rotation.y).toBe(0);
    expect(malla(g, 'reja-candado').position.y).toBe(-0);
    reja.actualizar(1, falso.ctx as ContextoJuego);
    expect(falso.sonidos).toEqual([]);
  });

  it('abrir dos veces no la abre dos veces', () => {
    const falso = crearContextoFalso();
    const reja = new RejaEscalera(armarReja());
    const fin = vi.fn();
    reja.abrir(fin);
    reja.abrir(fin);
    for (let i = 0; i < 100; i++) reja.actualizar(0.05, falso.ctx as ContextoJuego);
    reja.abrir(fin);
    for (let i = 0; i < 100; i++) reja.actualizar(0.05, falso.ctx as ContextoJuego);
    expect(fin).toHaveBeenCalledTimes(1);
    expect(falso.ruidos).toHaveLength(1);
  });
});
