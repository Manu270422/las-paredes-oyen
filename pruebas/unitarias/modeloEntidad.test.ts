// El cuerpo de "El Inquilino": la mandíbula enseña la boca según la pose (cerrada es la ranura; en el susto se
// desencaja), los dedos se cierran en garra al correr y se abren en el susto, y todo el cuerpo cabe en pocas
// mallas (cada una es una llamada de dibujo, y en un celular cuentan).
import { describe, expect, it } from 'vitest';
import type { Mesh } from 'three';
import { ModeloEntidad } from '../../src/ia/ModeloEntidad';

describe('ModeloEntidad', () => {
  it('empieza invisible: solo se ve cuando sale de la pared', () => {
    expect(new ModeloEntidad().raiz.visible).toBe(false);
  });

  it('la mandíbula: casi cerrada al acechar (la ranura), abierta al correr, desencajada en el susto', () => {
    const m = new ModeloEntidad();
    m.forzarPose('quieto');
    const quieto = m.aperturaMandibula;
    m.forzarPose('correr');
    const corriendo = m.aperturaMandibula;
    m.forzarPose('susto');
    const susto = m.aperturaMandibula;
    expect(quieto).toBeLessThan(0.15);
    expect(corriendo).toBeGreaterThan(0.5);
    expect(susto).toBeGreaterThan(1);
  });

  it('cabe en pocas mallas: lo fino (costillas, vértebras, dientes) va fundido', () => {
    const m = new ModeloEntidad();
    let mallas = 0;
    m.raiz.traverse((o) => {
      if ((o as Mesh).isMesh) mallas++;
    });
    expect(mallas).toBeLessThanOrEqual(50);
  });
});
