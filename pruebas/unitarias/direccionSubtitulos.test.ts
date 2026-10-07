// La flecha de los subtítulos con dirección ("[un golpe en la pared ←]"): dónde queda un sonido respecto a donde
// miro. Miro hacia -z con yaw 0; la izquierda es -x.
import { describe, expect, it } from 'vitest';
import { Jugador } from '../../src/jugador/Jugador';

describe('Hacia dónde queda un punto, para los subtítulos', () => {
  const jugador = new Jugador(1);

  it('delante, detrás, a la izquierda y a la derecha', () => {
    jugador.posicion.set(0, 0, 0);
    jugador.yaw = 0;
    expect(jugador.direccionHacia(0, -5)).toBe('↑');
    expect(jugador.direccionHacia(0, 5)).toBe('↓');
    expect(jugador.direccionHacia(-5, 0)).toBe('←');
    expect(jugador.direccionHacia(5, 0)).toBe('→');
  });

  it('depende de dónde estoy y hacia dónde miro', () => {
    jugador.posicion.set(10, 0, 10);
    jugador.yaw = Math.PI / 2;
    // Girado 90° a la izquierda, ahora miro hacia -x: lo que está a mi -x queda delante y lo de -z, a la derecha.
    expect(jugador.direccionHacia(5, 10)).toBe('↑');
    expect(jugador.direccionHacia(10, 5)).toBe('→');
  });
});
