// La caza sin navegador: cuando ella ya llegó a la celda del jugador (su camino termina en el centro) y sabe dónde
// está, da el último paso hasta él. Antes se quedaba en el centro y, con el jugador quieto cerca de una esquina (hasta
// 0.92 m del centro), nunca llegaba a menos de 0.85 m: la caza no terminaba (tanda 3 del Piso 1).
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { EstadoCazando } from '../../src/ia/estados/EstadoCazando';
import type { Entidad } from '../../src/ia/Entidad';
import { Memoria } from '../../src/ia/Memoria';
import { crearContextoFalso } from './contextoFalso';

function armar(resultadoAvanzar: 'llego' | 'moviendo' | 'sin-camino') {
  const falso = crearContextoFalso({ memoria: { persecuciones: 0 } });
  const C = CONFIG.celda;
  // El jugador, quieto en la esquina de su celda; ella, en el centro de esa celda.
  falso.ctx.jugador.posicion.x = 16.98 * C;
  falso.ctx.jugador.posicion.z = 12.98 * C;
  (falso.ctx.jugador as unknown as { sobresaltar: () => void }).sobresaltar = () => undefined;
  const e = {
    memoria: new Memoria(),
    posicion: { x: 16.5 * C, y: 0, z: 12.5 * C },
    pose: 'quieto',
    velocidadActual: 0,
    avisando: false,
    deslizadas: [] as Array<{ x: number; z: number }>,
    distanciaAlJugador(ctx: { jugador: { posicion: { x: number; z: number } } }) {
      return Math.hypot(e.posicion.x - ctx.jugador.posicion.x, e.posicion.z - ctx.jugador.posicion.z);
    },
    mirarHacia() {},
    irHacia() {
      return true;
    },
    avanzar() {
      return resultadoAvanzar;
    },
    deslizarHacia(x: number, z: number, velocidad: number, dt: number) {
      e.deslizadas.push({ x, z });
      // Como la de verdad (Entidad.deslizarHacia): a menos de 0.3 m ya llegó.
      const d = Math.hypot(x - e.posicion.x, z - e.posicion.z);
      if (d < 0.3) return true;
      const paso = Math.min(d, velocidad * dt);
      e.posicion.x += ((x - e.posicion.x) / d) * paso;
      e.posicion.z += ((z - e.posicion.z) / d) * paso;
      return d < 0.3;
    },
    cambiarEstado() {},
  };
  const estado = new EstadoCazando();
  const entidad = e as unknown as Entidad;
  estado.entrar(entidad, falso.ctx);
  const correr = (segundos: number) => {
    for (let t = 0; t < segundos; t += 0.05) {
      falso.reloj.ahora += 0.05;
      estado.actualizar(entidad, falso.ctx, 0.05);
    }
  };
  return { e, falso, correr };
}

describe('La caza: el último paso', () => {
  it('en la celda del jugador, quieto en la esquina, ella llega a alcanzarlo (después del aviso)', () => {
    const m = armar('llego');
    expect(m.e.distanciaAlJugador(m.falso.ctx), 'desde el centro de la celda no alcanza').toBeGreaterThan(CONFIG.entidad.distanciaAtrapar);
    m.correr(m.falso.ctx.dificultad.avisoCaza - 0.1);
    expect(m.e.deslizadas, 'durante el aviso no se mueve').toHaveLength(0);
    m.correr(0.6);
    expect(m.e.deslizadas.length).toBeGreaterThan(0);
    expect(m.e.distanciaAlJugador(m.falso.ctx)).toBeLessThan(CONFIG.entidad.distanciaAtrapar);
  });

  it('mientras su camino sigue, camina como siempre (no atraviesa nada)', () => {
    const m = armar('moviendo');
    m.correr(m.falso.ctx.dificultad.avisoCaza + 0.6);
    expect(m.e.deslizadas).toHaveLength(0);
  });
});
