// Aquí paso, en cada fotograma, el estado del jugador al postprocesado: el estrés, el modo escuchar y el pulso (solo
// mientras se juega, se muere o se viaja), el susto que se apaga solo, y la interferencia de la imagen: la que piden
// los eventos (un apagón, el aviso de una caza) más la que sube cuando ella está cerca con cuerpo.
// Lo saqué de Juego.ts (que tiene un tope de 700 líneas).
import type { BusEventos } from '../nucleo/BusEventos';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { MapaEventos } from '../nucleo/Eventos';
import { amortiguar } from '../utilidades/Matematicas';
import type { ParametrosEfectos } from './PostProceso';

/** Cuánto baja por segundo la interferencia que pidió un evento. */
const CAIDA_INTERFERENCIA = 1.6;
/** A esta distancia (metros) de ella empieza a interferir su cercanía, y cuánto como máximo. */
const CERCANIA = { distancia: 8, maximo: 0.25 } as const;

export class EfectosFotograma {
  private interferencia = 0;

  constructor(bus: BusEventos<MapaEventos>) {
    bus.on('interferencia', ({ intensidad }) => {
      this.interferencia = Math.max(this.interferencia, intensidad);
    });
  }

  /** Se calma la imagen (al cargar un punto de control o al llegar a otro piso). */
  calmar(): void {
    this.interferencia = 0;
  }

  actualizar(dt: number, efectos: ParametrosEfectos, enJuego: boolean, ctx: ContextoJuego): void {
    const j = ctx.jugador;
    efectos.estres = enJuego ? j.estres : 0;
    efectos.escuchando = enJuego ? j.nivelEscucha : 0;
    efectos.pulso = enJuego ? j.corazon.pulso : 0;
    efectos.susto = amortiguar(efectos.susto, 0, 2.5, dt);
    this.interferencia = Math.max(0, this.interferencia - dt * CAIDA_INTERFERENCIA);
    const e = ctx.entidad;
    const cercania = e.fisica ? Math.max(0, 1 - e.distanciaAlJugador(ctx) / CERCANIA.distancia) * CERCANIA.maximo : 0;
    efectos.interferencia = Math.min(1, this.interferencia + (enJuego ? cercania : 0));
  }
}
