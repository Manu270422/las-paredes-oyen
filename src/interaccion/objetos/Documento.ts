// Aquí está un documento en el mundo: papel, diario, casete o carta.
// Al interactuar, la interfaz lo abre para leer y queda registrado.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import type { Documento as DatosDocumento } from '../../narrativa/TiposNarrativa';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloDocumento } from './Modelos';
import { GRADOS } from '../../utilidades/Matematicas';

export class Documento implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  readonly activo = true;
  private readonly idDocumento: string;
  private readonly tipo: DatosDocumento['tipo'];
  /** Lo que el documento pide que diga el indicador (si no, va el de su tipo). */
  private readonly accion: string | undefined;

  constructor(def: DefInteractuable, documentos: Readonly<Record<string, DatosDocumento>>) {
    this.id = def.id;
    this.idDocumento = def.documento ?? '';
    this.tipo = documentos[this.idDocumento]?.tipo ?? 'nota';
    this.accion = documentos[this.idDocumento]?.accion;
    const modelo = modeloDocumento(this.tipo);
    this.objeto.add(modelo, crearZonaToque(0.2));
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 0.8, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    vincular(this.objeto, this);
  }

  texto(): string {
    if (this.accion) return this.accion;
    if (this.tipo === 'cinta') return 'Leer la carátula del casete';
    return this.tipo === 'diario' ? 'Leer el diario' : 'Leer';
  }

  interactuar(ctx: ContextoJuego): void {
    ctx.audio.reproducir('papel', { bus: 'interfaz', volumen: 0.6 });
    ctx.progreso.registrarDocumento(this.idDocumento);
    ctx.ui.abrirDocumento(this.idDocumento);
  }
}
