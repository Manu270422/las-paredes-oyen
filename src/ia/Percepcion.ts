// Aquí está el oído de la criatura. Es CIEGA: solo percibe sonido.
// Sus reglas (que el jugador descubre poco a poco):
// 1) El sonido se debilita con la distancia y con cada muro.
// 2) Cuando está DENTRO de las paredes, los muros casi no la afectan:
//    las paredes le llevan el sonido. Por eso oye mejor desde adentro.
// 3) Excepción que rompe la regla: si estoy muy cerca, me siente aunque
//    no haga ruido (eso se maneja en los estados, con el radio de presencia).
import type { Ruido } from '../nucleo/Eventos';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import { distancia2D } from '../utilidades/Matematicas';

export class Percepcion {
  /** Calculo cuánto "oye" la criatura un ruido desde su posición actual. */
  percibir(ruido: Ruido, x: number, z: number, dentroDeParedes: boolean, ctx: ContextoJuego): number {
    const distancia = distancia2D(x, z, ruido.x, ruido.z);
    if (distancia > 30) return 0;
    const obstaculos = ctx.nivel.consultaOclusion(ruido.x, ruido.z, x, z);
    const transmision = Math.pow(dentroDeParedes ? 0.82 : 0.45, obstaculos);
    return (ruido.intensidad * transmision) / (1 + distancia * 0.22);
  }
}
