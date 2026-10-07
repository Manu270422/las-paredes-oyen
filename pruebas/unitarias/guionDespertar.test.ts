// Después del final del 402 despierto sin la llave de la reja. El guion me la hace oír caer en el 402 (en toda
// dificultad) y, si tardo, deja una pista escrita. Nada de eso pasa mientras la secuencia final se ve, ni si
// la llave ya está en mi bolsillo.
import { describe, expect, it } from 'vitest';
import type { AccionesGuion } from '../../src/narrativa/AccionesGuion';
import { Progreso } from '../../src/narrativa/Progreso';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { PISO_4 } from '../../src/pisos/piso4';
import { GuionPiso4 } from '../../src/pisos/piso4/guion';
import { crearContextoFalso } from './contextoFalso';

function armar(banderas: string[], inventario: string[] = []) {
  const falso = crearContextoFalso();
  const progreso = new Progreso(falso.bus, PISO_4.objetivos, PISO_4.reglas);
  progreso.importar({ banderas, inventario, documentos: [] });
  const relevantes: Array<{ descripcion: string; x: number; z: number }> = [];
  const pistas: string[] = [];
  falso.bus.on('sonido-relevante', (s) => relevantes.push(s));
  falso.bus.on('pista', (p) => pistas.push(p.id));
  const llave = { x: 23.66, y: 0.02, z: 23.95 };
  const ctx = {
    ...falso.ctx,
    piso: PISO_4,
    progreso,
    // La linterna encendida: así no se mezcla la pista de encenderla.
    linterna: { encendida: true },
    memoria: { habitacionActual: 'escalera' },
    nivel: { interactuables: [{ id: 'llaveEscalera', objeto: { position: llave } }], aplicarLuzDe: () => undefined, lamparas: [] },
    // La secuencia final solo se agenda: aquí no corre (se prueba en guion.spec.ts).
    programador: { ahora: 0, secuencia: () => undefined, despues: () => undefined },
    director: { bloquear: () => undefined, activo: true },
    entidad: { puedeManifestarse: true, estado: 'paredes', cambiarEstado: () => undefined },
  } as unknown as ContextoJuego;
  const nada = () => undefined;
  const acciones: AccionesGuion = { mostrarSusto: nada, fundido: nada, fijarSoloMirar: nada, terminarPartida: nada, despertar: nada };
  const guion = new GuionPiso4(acciones);
  guion.conectar(ctx);
  guion.reiniciar(ctx);
  const jugar = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.5) guion.actualizar(0.5, ctx);
  };
  return { ctx, progreso, relevantes, pistas, llave, sonidos: falso.sonidos, jugar };
}

describe('Después del final del 402, sin la llave de la reja', () => {
  it('a los 3 s la oigo caer en el 402, con su dirección, una sola vez', () => {
    const { relevantes, sonidos, llave, jugar } = armar(['medido:402']);
    jugar(2.5);
    expect(relevantes, 'todavía no').toEqual([]);
    jugar(1);
    expect(relevantes).toEqual([{ descripcion: 'algo metálico cae', x: llave.x, z: llave.z }]);
    expect(sonidos.filter((s) => s === 'llave'), 'cae y rebota').toHaveLength(2);
    jugar(20);
    expect(relevantes, 'no se repite').toHaveLength(1);
  });

  it('si tardo en encontrarla, a los 75 s sale una pista escrita (una sola vez)', () => {
    const { pistas, jugar } = armar(['medido:402']);
    jugar(70);
    expect(pistas).not.toContain('llave-escalera');
    jugar(10);
    expect(pistas.filter((p) => p === 'llave-escalera')).toHaveLength(1);
  });

  it('con la llave en el bolsillo no hay ni sonido ni pista', () => {
    const { relevantes, pistas, jugar } = armar(['medido:402'], ['llave_escalera']);
    jugar(80);
    expect(relevantes).toEqual([]);
    expect(pistas).not.toContain('llave-escalera');
  });

  it('mientras corre la secuencia final (el mismo guion que la lanzó), ni sonido ni pista', () => {
    const { progreso, relevantes, pistas, jugar } = armar([]);
    progreso.marcar('medido:402');
    jugar(80);
    expect(relevantes).toEqual([]);
    expect(pistas).not.toContain('llave-escalera');
  });
});
