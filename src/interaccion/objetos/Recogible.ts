// Aquí están los objetos que se recogen: pilas para la linterna y la llave del 402.
// Las pilas son el recurso que regula la tensión: la oscuridad total asusta más,
// pero sin linterna no veo nada. Y con la pila baja, la linterna zumba.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloLlave, modeloPilas } from './Modelos';

export class Recogible implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  private readonly tipo: 'pilas' | 'llave_402';

  constructor(def: DefInteractuable) {
    this.id = def.id;
    this.tipo = def.objeto ?? 'pilas';
    this.objeto.add(this.tipo === 'pilas' ? modeloPilas() : modeloLlave(), crearZonaToque(0.18));
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 0.8, def.y * CONFIG.celda);
    vincular(this.objeto, this);
  }

  get activo(): boolean {
    return this.objeto.visible;
  }

  texto(): string {
    return this.tipo === 'pilas' ? 'Recoger pilas' : 'Tomar la llave del 402';
  }

  interactuar(ctx: ContextoJuego): void {
    this.objeto.visible = false;
    ctx.progreso.marcar(`recogido:${this.id}`);
    ctx.audio.reproducir('recoger', { bus: 'interfaz', volumen: 0.7 });
    if (this.tipo === 'pilas') {
      ctx.linterna.recargar(0.5);
      ctx.bus.emit('subtitulo', { texto: 'Pilas. La linterna durará un poco más.', duracion: 2.5 });
    } else {
      ctx.progreso.agregarObjeto('llave_402');
      ctx.bus.emit('subtitulo', { texto: 'Una llave con una etiqueta de cartón: «402».', duracion: 3 });
    }
  }

  /** Al cargar, el objeto existe solo si no lo había recogido. */
  restablecer(ctx: ContextoJuego): void {
    this.objeto.visible = !ctx.progreso.tiene(`recogido:${this.id}`);
  }
}
