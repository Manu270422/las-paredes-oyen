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
  /** Lo que dice el indicador: el del mapa ("Grabar la pared…") o, si no trae, medir la sala del apartamento. */
  private readonly accion: string;

  constructor(def: DefInteractuable) {
    this.id = def.id;
    this.apartamento = def.apartamento ?? '';
    this.accion = def.accion ?? `Medir la sala del ${this.apartamento} (quédate quieto)`;
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
    return this.accion;
  }

  interactuar(ctx: ContextoJuego): void {
    const objetivo = ctx.progreso.objetivoActual();
    if (objetivo?.bandera !== `medido:${this.apartamento}`) {
      // Digo qué falta de verdad: el objetivo que va primero (antes decía "lo que dice la orden de trabajo", que
      // solo tenía sentido en el Piso 4 y en el 3 dejaba al jugador sin saber qué hacer).
      const antes = objetivo ? ` Antes: ${objetivo.texto.charAt(0).toLowerCase()}${objetivo.texto.slice(1)}.` : '';
      ctx.bus.emit('subtitulo', { texto: `Todavía no.${antes}`, duracion: 4 });
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
