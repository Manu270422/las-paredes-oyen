// Aquí tengo funciones de apoyo para los eventos: encontrar un punto detrás
// del jugador, el muro más cercano, una celda al azar lejos de su vista...
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import { aleatorio } from '../../utilidades/Matematicas';
import { puntoEnVista } from '../Visibilidad';

export interface Punto {
  x: number;
  z: number;
}

/** Punto a cierta distancia detrás del jugador (con desvío lateral opcional). */
export function detrasDelJugador(ctx: ContextoJuego, distancia: number, desvio = 0): Punto {
  const j = ctx.jugador;
  const angulo = j.yaw + desvio;
  return { x: j.posicion.x + Math.sin(angulo) * distancia, z: j.posicion.z + Math.cos(angulo) * distancia };
}

/** Centro del muro más cercano a un punto (para sonidos "dentro de la pared"). */
export function muroCercano(ctx: ContextoJuego, p: Punto): Punto | null {
  const r = ctx.nivel.rejilla;
  const muro = r.muroMasCercano(p.x, p.z);
  return muro ? { x: r.centro(muro.gx), z: r.centro(muro.gy) } : null;
}

/** Celda transitable al azar a cierta distancia del jugador que cumpla un filtro. */
export function celdaAlAzar(ctx: ContextoJuego, minimo: number, maximo: number, filtro: (p: Punto) => boolean = () => true): Punto | null {
  const r = ctx.nivel.rejilla;
  const j = ctx.jugador.posicion;
  for (let intento = 0; intento < 30; intento++) {
    const angulo = Math.random() * Math.PI * 2;
    const d = aleatorio(minimo, maximo);
    const gx = r.aCelda(j.x + Math.cos(angulo) * d);
    const gy = r.aCelda(j.z + Math.sin(angulo) * d);
    if (!r.esTransitable(gx, gy) || r.esPuerta(gx, gy)) continue;
    const p = { x: r.centro(gx), z: r.centro(gy) };
    if (filtro(p)) return p;
  }
  return null;
}

/** ¿El punto está fuera de la vista del jugador? */
export function fueraDeVista(ctx: ContextoJuego, p: Punto, altura = 1.2): boolean {
  return !puntoEnVista(ctx, p.x, altura, p.z);
}
