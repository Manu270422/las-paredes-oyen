// "La muerte siempre es justa y explicada": toda causa que puede iniciar una
// caza debe tener su explicación propia, nunca el genérico "Te encontró".
import { describe, expect, it } from 'vitest';
import { explicarMuerte } from '../../src/narrativa/ExplicacionesMuerte';
import type { MotivoCaza } from '../../src/nucleo/Eventos';

/** Las únicas causas que pueden iniciar una caza: ruidos del jugador y su presencia. */
const MOTIVOS_POSIBLES: MotivoCaza[] = ['paso', 'carrera', 'respiracion', 'jadeo', 'linterna-clic', 'linterna-zumbido', 'presencia'];

describe('explicarMuerte', () => {
  it.each(MOTIVOS_POSIBLES)('"%s" tiene explicación, consejo y no es la genérica', (motivo) => {
    const e = explicarMuerte(motivo, false);
    expect(e.clave).not.toBe('general');
    expect(e.linea.length).toBeGreaterThan(0);
    expect(e.consejo.length).toBeGreaterThan(0);
  });

  it('el consejo del jadeo coincide con la regla: soltar a tiempo no hace jadear', () => {
    expect(explicarMuerte('jadeo', false).consejo).toMatch(/antes de que se acabe/);
  });
});
