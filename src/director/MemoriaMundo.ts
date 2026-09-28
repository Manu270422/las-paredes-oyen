// Aquí el juego recuerda lo que hizo el jugador: qué habitaciones visitó,
// cuánto tiempo pasó en cada una, qué puertas usó y cuáles vio. El director
// usa esta memoria para cambiar cosas que el jugador YA conoce:
// "esa habitación no era así".
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import { puntoEnVista } from './Visibilidad';

interface RegistroHabitacion {
  visitas: number;
  tiempo: number;
  ultimaSalida: number;
}

export class MemoriaMundo {
  habitacionActual: string | null = null;
  private readonly registro = new Map<string, RegistroHabitacion>();
  private readonly puertasUsadas = new Set<string>();
  private temporizadorVista = 0;
  // Estadísticas para la pantalla final.
  persecuciones = 0;
  muertes = 0;
  sustos = 0;
  /**
   * Lo que el jugador YA VIVIÓ en esta partida (sobrevive a morir y recargar):
   * cuántas veces oyó la imitación (sube su etapa) y qué consejos de muerte
   * ya le di (no quiero repetir la explicación: la segunda vez basta el sonido).
   */
  exposicionesImitacion = 0;
  readonly consejosVistos = new Set<string>();

  reiniciarSesion(): void {
    this.habitacionActual = null;
    this.registro.clear();
    this.puertasUsadas.clear();
  }

  reiniciarEstadisticas(): void {
    this.persecuciones = 0;
    this.muertes = 0;
    this.sustos = 0;
    this.exposicionesImitacion = 0;
    this.consejosVistos.clear();
  }

  visitas(id: string): number {
    return this.registro.get(id)?.visitas ?? 0;
  }

  segundosDesdeSalida(id: string, ahora: number): number {
    const r = this.registro.get(id);
    return r ? ahora - r.ultimaSalida : Infinity;
  }

  registrarPuertaUsada(id: string): void {
    this.puertasUsadas.add(id);
  }

  puertaConocida(id: string): boolean {
    return this.puertasUsadas.has(id);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    const j = ctx.jugador.posicion;
    const habitacion = ctx.nivel.habitacionEn(j.x, j.z);
    const ahora = ctx.programador.ahora;

    if (habitacion && habitacion.id !== this.habitacionActual) {
      const anterior = this.habitacionActual;
      if (anterior) {
        const r = this.registro.get(anterior);
        if (r) r.ultimaSalida = ahora;
      }
      this.habitacionActual = habitacion.id;
      const r = this.registro.get(habitacion.id) ?? { visitas: 0, tiempo: 0, ultimaSalida: -Infinity };
      r.visitas++;
      this.registro.set(habitacion.id, r);
      ctx.audio.fijarReverb(habitacion.reverb);
      ctx.bus.emit('habitacion-cambiada', { anterior, actual: habitacion.id });
    }
    if (this.habitacionActual) {
      const r = this.registro.get(this.habitacionActual);
      if (r) r.tiempo += dt;
    }

    // Cada medio segundo anoto qué puertas está viendo el jugador.
    this.temporizadorVista -= dt;
    if (this.temporizadorVista <= 0) {
      this.temporizadorVista = 0.5;
      for (const puerta of ctx.nivel.puertas) {
        if (puerta.centro.distanceTo(j) < 10 && puntoEnVista(ctx, puerta.centro.x, 1.2, puerta.centro.z, 0)) puerta.vecesVista++;
      }
    }
  }
}
