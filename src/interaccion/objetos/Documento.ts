// Aquí está un documento en el mundo: papel, diario, casete o carta.
// Al interactuar, la interfaz lo abre para leer y queda registrado.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import { DOCUMENTOS } from '../../narrativa/Documentos';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloDocumento } from './Modelos';
import { GRADOS } from '../../utilidades/Matematicas';

export class Documento implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  readonly activo = true;
  private readonly idDocumento: string;

  constructor(def: DefInteractuable) {
    this.id = def.id;
    this.idDocumento = def.documento ?? '';
    const tipo = DOCUMENTOS[this.idDocumento]?.tipo ?? 'nota';
    const modelo = modeloDocumento(tipo);
    this.objeto.add(modelo, crearZonaToque(0.2));
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 0.8, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    vincular(this.objeto, this);
  }

  texto(): string {
    const doc = DOCUMENTOS[this.idDocumento];
    if (doc?.tipo === 'cinta') return 'Leer la carátula del casete';
    return doc?.tipo === 'diario' ? 'Leer el diario' : 'Leer';
  }

  interactuar(ctx: ContextoJuego): void {
    ctx.audio.reproducir('papel', { bus: 'interfaz', volumen: 0.6 });
    ctx.progreso.registrarDocumento(this.idDocumento);
    ctx.ui.abrirDocumento(this.idDocumento);
  }
}
