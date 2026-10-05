// Aquí está el tablero eléctrico del cuarto de servicio. Devolver la luz
// parece un alivio ("por fin veo")... y es la trampa del vertical slice:
// minutos después, las luces del pasillo mueren una por una hacia mí.
import { Group, type MeshStandardMaterial } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloTablero } from './Modelos';
import { GRADOS } from '../../utilidades/Matematicas';

export class Tablero implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  private readonly palanca: Group;
  private readonly piloto: MeshStandardMaterial;

  /** La bandera que marco al activarme (dato del mapa). */
  private readonly bandera: string;

  constructor(def: DefInteractuable) {
    this.id = def.id;
    if (!def.bandera) throw new Error(`El tablero "${def.id}" no dice qué bandera marca.`);
    this.bandera = def.bandera;
    const { grupo, palanca, piloto } = modeloTablero();
    this.palanca = palanca;
    this.piloto = piloto;
    const zona = crearZonaToque(0.35);
    zona.position.z = 0.1;
    this.objeto.add(grupo, zona);
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 1.4, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    vincular(this.objeto, this);
  }

  get activo(): boolean {
    return this.palanca.rotation.x > 0;
  }

  texto(): string {
    return 'Subir el interruptor general';
  }

  interactuar(ctx: ContextoJuego): void {
    this.fijarEncendido(true);
    const p = this.objeto.position;
    ctx.audio.reproducir('tablero', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.9 });
    ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.5, origen: 'entorno', causa: 'tablero' });
    ctx.progreso.marcar(this.bandera);
  }

  private fijarEncendido(encendido: boolean): void {
    this.palanca.rotation.x = encendido ? -0.5 : 0.5;
    this.piloto.emissiveIntensity = encendido ? 2.5 : 0;
  }

  restablecer(ctx: ContextoJuego): void {
    this.fijarEncendido(ctx.progreso.tiene(this.bandera));
  }
}
