// Aquí simulo mi respiración. No es decoración: es una mecánica.
// - Tranquilo, respiro despacio y casi no hago ruido.
// - Asustado o cansado, jadeo... y la criatura puede oírlo.
// - Puedo contener la respiración, pero el aire se acaba (más rápido si tengo miedo).
// - Si aguanto hasta el final, jadeo sin control: el peor ruido posible.
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import { interpolar } from '../utilidades/Matematicas';

/** Con miedo máximo el aire dura un 45 % menos: 9 s tranquilo, 4.95 s aterrado. El encuentro debe caber ahí. */
export const PERDIDA_AIRE_POR_MIEDO = 0.45;
/** Con la ayuda visual del aire: por debajo de esto, el borde de la pantalla late y un subtítulo avisa. */
export const AVISO_POCO_AIRE = 0.25;

export class Respiracion {
  /** Aire disponible para contener la respiración (0..1). */
  aire = 1;
  aguantando = false;
  private recuperando = false;
  /**
   * Después de un jadeo forzado tengo que SOLTAR la tecla para volver a aguantar.
   * Antes, con la tecla apretada, volvía a aguantar al recuperar un 35 % y
   * jadeaba otra vez cada ~4.5 s: una trampa que el jugador no podía ver.
   */
  private debeSoltar = false;
  private tiempoAguantado = 0;
  /** Ya avisé que queda poco aire en esta aguantada (ayuda visual del aire). */
  private avisePocoAire = false;
  private temporizador = 1.5;
  private inhalando = true;

  reiniciar(): void {
    this.aire = 1;
    this.aguantando = false;
    this.recuperando = false;
    this.debeSoltar = false;
    this.temporizador = 1.5;
  }

  actualizar(dt: number, quiereAguantar: boolean, esfuerzo: number, estres: number, ctx: ContextoJuego, x: number, z: number): void {
    const agitacion = Math.min(1, Math.max(esfuerzo, estres));

    if (!quiereAguantar) this.debeSoltar = false;
    if (quiereAguantar && !this.recuperando && !this.debeSoltar && this.aire > 0) {
      if (!this.aguantando) {
        this.tiempoAguantado = 0;
        this.avisePocoAire = false;
      }
      this.aguantando = true;
      this.tiempoAguantado += dt;
      // Con miedo, el aire dura casi la mitad.
      this.aire -= dt / (CONFIG.duracionAire * (1 - estres * PERDIDA_AIRE_POR_MIEDO));
      // Ayuda visual del aire (la dificultad o Ajustes): aviso con tiempo para soltarlo antes del jadeo.
      if (this.aire < AVISO_POCO_AIRE && !this.avisePocoAire && (ctx.dificultad.ayudaAire || ctx.ajustes.valores.ayudaVisualAire)) {
        this.avisePocoAire = true;
        ctx.bus.emit('subtitulo', { texto: '[Te queda poco aire: suéltalo antes de jadear]', duracion: 2.5, tipo: 'efecto' });
      }
      if (this.aire <= 0) {
        this.aire = 0;
        this.aguantando = false;
        this.recuperando = true;
        this.debeSoltar = true;
        this.jadear(ctx, x, z, 1);
        ctx.jugador.sumarEstres(0.15);
      }
      return;
    }

    if (this.aguantando) {
      // Solté el aire a tiempo: nunca jadeo (el jadeo es solo si se acaba, como dice
      // la pantalla de muerte). Si aguanté mucho, la exhalación es honda y se oye un poco.
      this.aguantando = false;
      if (this.aire < 0.3) {
        ctx.audio.reproducir('respira_out', { bus: 'voz', volumen: 0.45 });
        ctx.bus.emit('ruido', { x, z, intensidad: CONFIG.ruido.exhalacionHonda, origen: 'jugador', causa: 'respiracion' });
      } else {
        ctx.audio.reproducir('respira_out', { bus: 'voz', volumen: 0.25 });
      }
      this.temporizador = 0.8;
      this.inhalando = true;
    }

    this.aire = Math.min(1, this.aire + dt / 4);
    if (this.recuperando && this.aire > 0.35) this.recuperando = false;

    // Ciclo normal: más rápido y más fuerte cuanto más agitado estoy.
    this.temporizador -= dt;
    if (this.temporizador <= 0) {
      const periodo = interpolar(4.4, 1.25, agitacion);
      this.temporizador = periodo / 2;
      const volumen = 0.08 + agitacion * 0.45;
      ctx.audio.reproducir(this.inhalando ? 'respira_in' : 'respira_out', { bus: 'voz', volumen, variacion: 0.08 });
      if (!this.inhalando) {
        const intensidad = 0.02 + agitacion * 0.3;
        ctx.bus.emit('ruido', { x, z, intensidad, origen: 'jugador', causa: 'respiracion' });
      }
      this.inhalando = !this.inhalando;
    }
  }

  private jadear(ctx: ContextoJuego, x: number, z: number, fuerza: number): void {
    ctx.audio.reproducir('jadeo', { bus: 'voz', volumen: 0.7 * fuerza });
    ctx.bus.emit('ruido', { x, z, intensidad: CONFIG.ruido.jadeo * fuerza, origen: 'jugador', causa: 'jadeo' });
    ctx.bus.emit('subtitulo', { texto: '[Jadeas]', duracion: 1.5, tipo: 'efecto' });
  }
}
