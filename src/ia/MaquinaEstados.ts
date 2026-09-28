// Aquí está la máquina de estados de la criatura.
// ¿Por qué una FSM y no un behavior tree? Porque la criatura tiene pocos
// estados muy distintos entre sí y las transiciones deben ser legibles y
// controlables por el director. Dentro de cada estado uso decisiones con
// pesos (utility) para que no sea predecible. Es el equilibrio que busco:
// entendible para el jugador, pero no mecánico.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { Ruido } from '../nucleo/Eventos';
import type { Entidad } from './Entidad';
import type { EstadoIA, NombreEstadoIA } from './TiposIA';

export class MaquinaEstados {
  private readonly estados = new Map<NombreEstadoIA, EstadoIA>();
  private actualEstado: EstadoIA | null = null;
  tiempoEnEstado = 0;

  registrar(estado: EstadoIA): void {
    this.estados.set(estado.nombre, estado);
  }

  get actual(): NombreEstadoIA | null {
    return this.actualEstado?.nombre ?? null;
  }

  cambiar(nombre: NombreEstadoIA, entidad: Entidad, ctx: ContextoJuego): void {
    const siguiente = this.estados.get(nombre);
    if (!siguiente) return;
    this.actualEstado?.salir?.(entidad, ctx);
    this.actualEstado = siguiente;
    this.tiempoEnEstado = 0;
    siguiente.entrar(entidad, ctx);
    ctx.bus.emit('entidad-estado', { estado: nombre, fisica: entidad.fisica });
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    this.tiempoEnEstado += dt;
    this.actualEstado?.actualizar(entidad, ctx, dt);
  }

  oir(entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    this.actualEstado?.alOir?.(entidad, ctx, percibido, ruido);
  }
}
