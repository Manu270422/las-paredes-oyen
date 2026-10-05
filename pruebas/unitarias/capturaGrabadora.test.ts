// Las reglas de la cinta ("segunda realidad"): lo que capta, lo que agrupa,
// lo que no duplica del guion y lo que nunca descarta (la presencia).
import { describe, expect, it } from 'vitest';
import { CapturaGrabadora } from '../../src/jugador/CapturaGrabadora';
import type { LineaTranscripcion } from '../../src/narrativa/TiposNarrativa';
import { crearContextoFalso } from './contextoFalso';

function preparar(entidad: { fisica: boolean; distancia: number } = { fisica: false, distancia: 20 }) {
  const falso = crearContextoFalso({
    entidad: {
      fisica: entidad.fisica,
      posicion: { x: -entidad.distancia, y: 0, z: 0 },
      distanciaAlJugador: () => entidad.distancia,
    },
  });
  const captura = new CapturaGrabadora();
  captura.iniciar(falso.ctx);
  return { ...falso, captura };
}

describe('CapturaGrabadora', () => {
  it('capta los sonidos del mundo cercanos y agrupa los repetidos en una sola línea', () => {
    const { captura, sonar, reloj } = preparar();
    for (let i = 0; i < 3; i++) {
      reloj.ahora = 1 + i * 0.36;
      sonar('golpe', { bus: 'entidad', posicion: { x: 2, y: 1, z: 0 } });
    }
    captura.cerrar();
    const lineas = captura.lineas([]);
    expect(lineas).toHaveLength(3);
    expect(lineas.filter((l) => l.texto)).toHaveLength(1);
    expect(lineas[0].texto).toContain('Golpes en la pared');
  });

  it('no capta mis propios sonidos, la interfaz ni lo que suena lejos', () => {
    const { captura, sonar } = preparar();
    sonar('paso_granito', { bus: 'voz', posicion: { x: 1, y: 0, z: 0 } });
    sonar('bip', { bus: 'interfaz' });
    sonar('golpe', { bus: 'entidad', posicion: { x: 30, y: 1, z: 0 } });
    captura.cerrar();
    expect(captura.cantidad).toBe(0);
  });

  it('no duplica un sonido que el guion ya tiene en ese momento de la cinta', () => {
    const { captura, sonar, reloj } = preparar();
    reloj.ahora = 2.6;
    sonar('golpe', { bus: 'entidad', posicion: { x: 1, y: 1, z: 0 } });
    captura.cerrar();
    const guion: LineaTranscripcion[] = [{ t: 3, texto: '[Tres golpes]', sonido: 'golpe', repeticiones: 3 }];
    expect(captura.lineas(guion)).toHaveLength(0);
  });

  it('capta la presencia silenciosa de la criatura en el muro y nunca la descarta', () => {
    const { captura, ctx } = preparar({ fisica: false, distancia: 3 });
    captura.actualizar(0.6, ctx);
    captura.cerrar();
    expect(captura.captoPresencia).toBe(true);
    const [linea] = captura.lineas([{ t: 1.8, texto: '', sonido: 'respira_entidad' }]);
    expect(linea.texto).toContain('dentro del muro');
    expect(linea.texto).toContain('Tú no oíste nada');
  });

  it('una medición cancelada no deja nada en la cinta', () => {
    const { captura, sonar } = preparar();
    sonar('rasguno', { bus: 'entidad', posicion: { x: 2, y: 1, z: 0 } });
    captura.cancelar();
    expect(captura.cantidad).toBe(0);
    expect(captura.lineas([])).toEqual([]);
  });
});
