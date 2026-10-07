// Aquí están los objetos que se recogen: pilas para la linterna, llaves...
// Las pilas son el recurso que regula la tensión: la oscuridad total asusta más,
// pero sin linterna no veo nada. Y con la pila baja, la linterna zumba.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import type { DefObjetoRecogible } from '../../pisos/TiposPiso';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloLlave, modeloPilas } from './Modelos';

export class Recogible implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  /** El id del objeto que entrega (una clave de `objetos` del paquete). */
  private readonly idObjeto: string;
  private readonly datos: DefObjetoRecogible;
  /** La bandera desde la que existe (si no tiene, existe desde el principio). */
  private readonly aparece: string | undefined;

  constructor(def: DefInteractuable, objetos: Readonly<Record<string, DefObjetoRecogible>>) {
    this.id = def.id;
    this.idObjeto = def.objeto ?? '';
    const datos = objetos[this.idObjeto];
    if (!datos) throw new Error(`El recogible "${def.id}" entrega "${this.idObjeto}", que no está en los objetos del piso.`);
    this.datos = datos;
    this.aparece = def.aparece;
    this.objeto.add(datos.modelo === 'pilas' ? modeloPilas() : modeloLlave(), crearZonaToque(0.18));
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 0.8, def.y * CONFIG.celda);
    vincular(this.objeto, this);
  }

  get activo(): boolean {
    return this.objeto.visible;
  }

  texto(): string {
    return this.datos.texto;
  }

  interactuar(ctx: ContextoJuego): void {
    this.objeto.visible = false;
    ctx.progreso.marcar(`recogido:${this.id}`);
    ctx.audio.reproducir('recoger', { bus: 'interfaz', volumen: 0.7 });
    if (this.datos.recargaLinterna) ctx.linterna.recargar(this.datos.recargaLinterna);
    if (this.datos.guardaEnInventario) ctx.progreso.agregarObjeto(this.idObjeto);
    ctx.bus.emit('subtitulo', { texto: this.datos.mensaje, duracion: this.datos.duracionMensaje });
  }

  /** Al cargar, el objeto existe solo si ya apareció y no lo había recogido. */
  restablecer(ctx: ContextoJuego): void {
    const aparecio = this.aparece === undefined || ctx.progreso.tiene(this.aparece);
    this.objeto.visible = aparecio && !ctx.progreso.tiene(`recogido:${this.id}`);
  }
}
