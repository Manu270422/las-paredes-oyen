// Aquí está el latido de mi corazón. Aparece solo cuando tengo miedo y
// se acelera con el estrés. Además "empuja" la viñeta del postprocesado
// en cada latido: el jugador lo siente en la vista, no solo lo oye.
import type { ContextoJuego } from '../nucleo/ContextoJuego';

export class Corazon {
  /** Pulso visual (1 justo al latir, luego cae a 0). */
  pulso = 0;
  private temporizador = 0;

  actualizar(dt: number, estres: number, ctx: ContextoJuego): void {
    this.pulso = Math.max(0, this.pulso - dt * 4);
    if (estres < 0.35) {
      this.temporizador = 0;
      return;
    }
    this.temporizador -= dt;
    if (this.temporizador > 0) return;
    const latidosPorMinuto = 72 + estres * 95;
    this.temporizador = 60 / latidosPorMinuto;
    const volumen = Math.min(1, (estres - 0.35) * 1.6);
    ctx.audio.reproducir('latido', { bus: 'voz', volumen, variacion: 0.02, reverb: 0 });
    this.pulso = volumen;
    if (estres > 0.8) ctx.entrada.vibrar(0.15, 40);
  }
}
