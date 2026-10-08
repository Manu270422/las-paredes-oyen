// Aquí está algo que se mira y no se lleva: un juguete, un dibujo en la pared, un palo con rayas de lápiz.
// Al examinarlo flota una línea (sin panel y sin pausar: la criatura sigue oyendo mientras leo) y queda la
// bandera `examinado:<id>`. Se puede volver a mirar cuantas veces quiera: la línea no se gasta.
import { Group, type Mesh, type Vector3 } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import type { DefExaminable } from '../../pisos/TiposPiso';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloExaminable } from './Modelos';
import { GRADOS } from '../../utilidades/Matematicas';

export class Examinable implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  readonly activo = true;
  private readonly datos: DefExaminable;
  /** La zona de toque va donde cae la mirada (la punta del palo, el centro del dibujo), no en el origen. */
  private readonly zona: Mesh;

  constructor(def: DefInteractuable, examinables: Readonly<Record<string, DefExaminable>>) {
    this.id = def.id;
    const datos = examinables[def.examinable ?? ''];
    if (!datos) throw new Error(`El examinable "${def.id}" muestra "${String(def.examinable)}", que no está en los examinables del piso.`);
    this.datos = datos;
    const { grupo, mirada } = modeloExaminable(datos.modelo);
    this.zona = crearZonaToque(0.2);
    this.zona.position.copy(mirada);
    this.objeto.add(grupo, this.zona);
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 0, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    vincular(this.objeto, this);
  }

  puntoInteraccion(destino: Vector3): Vector3 {
    return this.zona.getWorldPosition(destino);
  }

  texto(): string {
    return this.datos.texto;
  }

  interactuar(ctx: ContextoJuego): void {
    ctx.bus.emit('tarjeta', { titulo: this.datos.linea, subtitulo: '', estilo: 'nota' });
    ctx.progreso.marcar(`examinado:${this.id}`);
  }
}
