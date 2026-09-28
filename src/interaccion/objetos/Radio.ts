// Aquí está la radio del 401. El director puede encenderla cuando no estoy:
// estática y una voz que casi se entiende. Es una fuente de ruido real:
// la criatura la oye. Apagarla es una decisión: ¿vuelvo a ese cuarto o no?
import { Group, type MeshStandardMaterial } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import type { FuenteSonido } from '../../audio/FuenteSonido';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { modeloRadio } from './Modelos';
import { GRADOS } from '../../utilidades/Matematicas';

export class Radio implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  private readonly dial: MeshStandardMaterial;
  private estatica: FuenteSonido | null = null;
  private encendida = false;
  private temporizadorVoz = 0;
  private temporizadorRuido = 0;

  constructor(def: DefInteractuable) {
    this.id = def.id;
    const { grupo, dial } = modeloRadio();
    this.dial = dial;
    this.objeto.add(grupo, crearZonaToque(0.22));
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 0.76, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    vincular(this.objeto, this);
  }

  get activo(): boolean {
    return this.encendida;
  }

  get estaEncendida(): boolean {
    return this.encendida;
  }

  texto(): string {
    return 'Apagar la radio';
  }

  encender(ctx: ContextoJuego): void {
    if (this.encendida) return;
    this.encendida = true;
    this.dial.emissiveIntensity = 1.4;
    const p = this.objeto.position;
    this.estatica = ctx.audio.reproducir('estatica', { posicion: { x: p.x, y: p.y, z: p.z }, bucle: true, volumen: 0.55, reverb: 0.5 });
    this.temporizadorVoz = 2;
    this.temporizadorRuido = 0;
  }

  apagar(): void {
    this.encendida = false;
    this.dial.emissiveIntensity = 0;
    this.estatica?.detener(0.05);
    this.estatica = null;
  }

  interactuar(ctx: ContextoJuego): void {
    this.apagar();
    const p = this.objeto.position;
    ctx.audio.reproducir('clic', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.6 });
    ctx.bus.emit('subtitulo', { texto: 'El silencio que queda es peor.', duracion: 2.5 });
  }

  /** Mientras suena, emite ruido real que la criatura puede oír, y a veces una voz. */
  actualizar(dt: number, ctx: ContextoJuego): void {
    if (!this.encendida) return;
    const p = this.objeto.position;
    this.temporizadorRuido -= dt;
    if (this.temporizadorRuido <= 0) {
      this.temporizadorRuido = 1.5;
      ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.45, origen: 'radio', causa: 'radio' });
    }
    this.temporizadorVoz -= dt;
    if (this.temporizadorVoz <= 0) {
      this.temporizadorVoz = 5 + Math.random() * 6;
      ctx.audio.reproducir('susurro', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.5, tono: 0.85, reverb: 0.4 });
      ctx.bus.emit('sonido-relevante', { descripcion: 'una voz en la radio', x: p.x, z: p.z });
    }
  }

  restablecer(): void {
    this.apagar();
  }
}
