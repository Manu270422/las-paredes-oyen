// Las escaleras que se caminan, con los paquetes REALES del Piso 4 y el Piso 3: qué tramo lleva a qué piso, qué lo
// cierra (la reja hasta que se abre; las tablas y los escombros, siempre), adónde llego al cruzar el descanso y por
// qué celdas del pozo puede seguirme ella (mi tramo y su descanso; nunca el camino a otro piso).
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { puntoDentro } from '../../src/mundo/Colisiones';
import { PozosCaminables } from '../../src/mundo/PozosCaminables';
import type { RejaEscalera } from '../../src/mundo/RejaEscalera';
import { Rejilla } from '../../src/mundo/Rejilla';
import { Navegacion } from '../../src/ia/Navegacion';
import { PISO_3 } from '../../src/pisos/piso3';
import { PISO_4 } from '../../src/pisos/piso4';

const C = CONFIG.celda;
/** Una reja de mentira en la boca del tramo que baja (la de verdad necesita la escena): solo dónde está y si abrió. */
function rejaFalsa(abierta: boolean): RejaEscalera {
  return { abierta, posicion: () => ({ x: 1.95, y: 0, z: 11 * C + 0.09 }) } as unknown as RejaEscalera;
}
/** Un punto en celdas, en metros. */
const en = (x: number, y: number) => ({ x: x * C, z: y * C });

describe('Escaleras que se caminan del Piso 4', () => {
  const rejilla = new Rejilla(PISO_4.mapa.rejilla);
  const reja = rejaFalsa(false);
  const pozos = new PozosCaminables(rejilla, PISO_4, [reja]);
  const entradaBaja = en(1.5, 11.07);
  const entradaSube = en(3.5, 11.07);

  it('la reja cierra el tramo que baja hasta que se abre; las tablas cierran el que sube para siempre', () => {
    expect(puntoDentro(entradaBaja.x, entradaBaja.z, pozos.cajas('piso', entradaBaja.x, entradaBaja.z))).toBe(true);
    expect(puntoDentro(entradaSube.x, entradaSube.z, pozos.cajas('piso', entradaSube.x, entradaSube.z))).toBe(true);
    (reja as { abierta: boolean }).abierta = true;
    expect(puntoDentro(entradaBaja.x, entradaBaja.z, pozos.cajas('piso', entradaBaja.x, entradaBaja.z))).toBe(false);
    expect(puntoDentro(entradaSube.x, entradaSube.z, pozos.cajas('piso', entradaSube.x, entradaSube.z))).toBe(true);
    (reja as { abierta: boolean }).abierta = false;
  });

  it('bajando, al cruzar el descanso voy al Piso 3 (la escalera "bajada") y llego subiendo a su descanso de arriba', () => {
    const p = en(2.8, 12.65);
    const cruce = pozos.cruce('bajando', p.x, p.z);
    expect(cruce?.def.id).toBe('bajada');
    expect(cruce?.def.hacia).toBe('piso3');
    expect(cruce?.sigue).toBe('subiendo');
  });

  it('ella sigue por el tramo que baja y su descanso solo con la reja abierta, y nunca toma el tramo que sigue hacia abajo', () => {
    expect(pozos.pisableCriatura(1, 11, 'baja'), 'reja cerrada').toBe(false);
    (reja as { abierta: boolean }).abierta = true;
    expect(pozos.pisableCriatura(1, 11, 'baja')).toBe(true);
    expect(pozos.pisableCriatura(1, 12, 'baja')).toBe(true);
    expect(pozos.pisableCriatura(2, 12, 'baja'), 'el descanso').toBe(true);
    expect(pozos.pisableCriatura(3, 12, 'baja'), 'el descanso, al otro lado').toBe(true);
    expect(pozos.pisableCriatura(3, 11, 'baja'), 'el tramo que sigue hacia el piso de abajo').toBe(false);
    expect(pozos.pisableCriatura(2, 11, 'baja'), 'el ojo').toBe(false);
    expect(pozos.pisableCriatura(3, 11, 'sube'), 'el tramo que sube está tapado').toBe(false);
    expect(pozos.pisableCriatura(5, 10, 'baja'), 'fuera del pozo decide la rejilla').toBe(false);
    (reja as { abierta: boolean }).abierta = false;
  });

  it('con su tramo, la búsqueda de caminos la lleva de la boca hasta el descanso', () => {
    (reja as { abierta: boolean }).abierta = true;
    const camino = new Navegacion(rejilla).buscar({ gx: 1, gy: 10 }, { gx: 2, gy: 12 }, undefined, (gx, gy) => pozos.pisableCriatura(gx, gy, 'baja'));
    expect(camino?.map((c) => `${c.gx},${c.gy}`)).toEqual(['1,10', '1,11', '1,12', '2,12']);
    expect(new Navegacion(rejilla).buscar({ gx: 1, gy: 10 }, { gx: 2, gy: 12 }), 'sin el tramo, el pozo no se pisa').toBeNull();
    (reja as { abierta: boolean }).abierta = false;
  });
});

describe('Escaleras que se caminan del Piso 3', () => {
  const rejilla = new Rejilla(PISO_3.mapa.rejilla);
  const pozos = new PozosCaminables(rejilla, PISO_3, [rejaFalsa(false)]);

  it('el tramo que sube está abierto y lleva al Piso 4; subiendo, llego bajando a su descanso de abajo', () => {
    const entrada = en(3.5, 11.07);
    expect(puntoDentro(entrada.x, entrada.z, pozos.cajas('piso', entrada.x, entrada.z))).toBe(false);
    const p = en(2.2, 12.65);
    const cruce = pozos.cruce('subiendo', p.x, p.z);
    expect(cruce?.def.id).toBe('subida');
    expect(cruce?.def.hacia).toBe('piso4');
    expect(cruce?.sigue).toBe('bajando');
  });

  it('el que baja (al Piso 2, que no existe todavía) queda cerrado aunque haya reja: nadie la abre', () => {
    const entrada = en(1.5, 11.07);
    expect(puntoDentro(entrada.x, entrada.z, pozos.cajas('piso', entrada.x, entrada.z))).toBe(true);
    expect(pozos.pisableCriatura(1, 11, 'baja')).toBe(false);
  });

  it('al llegar desde el Piso 4, la escalera es la que vuelve a él', () => {
    expect(pozos.llegadaDesde('piso4')).not.toBeNull();
  });
});
