// Aquí defino los tipos compartidos de la IA de "El Inquilino".
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { Ruido } from '../nucleo/Eventos';
import type { Entidad } from './Entidad';

export type NombreEstadoIA = 'paredes' | 'investigando' | 'cazando' | 'acechando' | 'retirada';

export interface Celda {
  gx: number;
  gy: number;
}

/** Contrato de cada estado de la máquina de estados jerárquica. */
export interface EstadoIA {
  readonly nombre: NombreEstadoIA;
  entrar(entidad: Entidad, ctx: ContextoJuego): void;
  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void;
  salir?(entidad: Entidad, ctx: ContextoJuego): void;
  /** Reacción a un ruido ya filtrado por la percepción (percibido > umbral). */
  alOir?(entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void;
}
