// Aquí está el punto de medición: la X de cinta roja en el piso de cada sala.
// Es mi mecánica principal: para avanzar tengo que quedarme QUIETO y en
// SILENCIO seis segundos, en la oscuridad, sabiendo que algo me escucha.
// El jugador tiene miedo de quedarse quieto... y el juego lo obliga a hacerlo.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloMarcaMedicion } from './Modelos';

export class PuntoMedicion implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  readonly apartamento: string;

  constructor(def: DefInteractuable) {
    this.id = def.id;
    this.apartamento = def.apartamento ?? '';
    const zona = crearZonaToque(0.45);
    zona.position.y = 0.3;
    this.objeto.add(modeloMarcaMedicion(), zona);
    this.objeto.position.set(def.x * CONFIG.celda, 0, def.y * CONFIG.celda);
    vincular(this.objeto, this);
  }

  /** Solo se puede medir en orden y si no se ha medido ya. */
  get activo(): boolean {
    return this.disponible;
  }

  private disponible = true;

  texto(ctx: ContextoJuego): string {
    if (ctx.grabadora.midiendo) return 'Midiendo…';
    return `Medir la sala del ${this.apartamento} (quédate quieto)`;
  }

  interactuar(ctx: ContextoJuego): void {
    const objetivo = ctx.progreso.objetivoActual();
    if (objetivo?.bandera !== `medido:${this.apartamento}`) {
      ctx.bus.emit('subtitulo', { texto: 'Todavía no. Primero lo que dice la orden de trabajo.', duracion: 3 });
      return;
    }
    ctx.grabadora.iniciarMedicion(this, ctx);
  }

  restablecer(ctx: ContextoJuego): void {
    this.disponible = !ctx.progreso.tiene(`medido:${this.apartamento}`);
  }

  completar(): void {
    this.disponible = false;
  }
}
