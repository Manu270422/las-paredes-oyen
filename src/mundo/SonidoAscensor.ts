// Aquí está lo que suena del ascensor. Lo saqué de Ascensor.ts (como decía su cabecera: si la máquina crecía, el
// sonido salía primero) antes de agregarle la parada entre pisos del Piso 2. No decide nada: la máquina dice cuándo,
// y yo cómo suena:
// - el motor en bucle: por los muros mientras viene; adentro, mientras viajo;
// - lo que el motor le hace oír a ella, cada tanto (sabe que alguien viene);
// - las puertas, la campanilla al llegar (fuerte: ella también la oye) y el golpe de un sacudón.
import type { FuenteSonido } from '../audio/FuenteSonido';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { MarcoCabina } from './MarcoCabina';

/** Cuánto le suena a ella (0..1): el motor por los muros, y la campanilla, fuerte. */
export const RUIDO_ASCENSOR = { motor: 0.3, campanilla: 0.6 } as const;
/** Cada cuánto (s) el motor hace ruido para ella mientras viene o viaja. */
export const CADA_RUIDO_MOTOR = 1.5;

/** Un punto en metros sobre el piso (x, z). */
type Punto = { readonly x: number; readonly z: number };

export class SonidoAscensor {
  private motor: FuenteSonido | null = null;
  private hastaRuido = 0;

  constructor(private readonly marco: MarcoCabina) {}

  /** Arranco el motor en bucle. `dentroPared`: viene por el pozo (se oye apagado, por los muros). */
  arrancarMotor(ctx: ContextoJuego, dentroPared: boolean): void {
    this.detenerMotor();
    this.hastaRuido = 0;
    const c = this.marco;
    this.motor = ctx.audio.reproducir('motor_ascensor', { posicion: { x: c.cx, y: 1.4, z: c.cz }, dentroPared, bucle: true, volumen: dentroPared ? 0.9 : 0.7 });
  }

  detenerMotor(): void {
    this.motor?.detener(0.4);
    this.motor = null;
  }

  /** El motor, para ella: un ruido por los muros cada tanto, frente a las puertas (`frente`). */
  motorParaElla(dt: number, ctx: ContextoJuego, frente: Punto): void {
    this.hastaRuido -= dt;
    if (this.hastaRuido > 0) return;
    this.hastaRuido = CADA_RUIDO_MOTOR;
    ctx.bus.emit('ruido', { x: frente.x, z: frente.z, intensidad: RUIDO_ASCENSOR.motor, origen: 'entorno', causa: 'maquina', pared: true });
  }

  /** Las puertas abriendo o cerrando, en el centro del vano. */
  puertas(ctx: ContextoJuego, puerta: Punto): void {
    ctx.audio.reproducir('puertas_ascensor', { posicion: { x: puerta.x, y: 1.2, z: puerta.z }, volumen: 0.8 });
  }

  /** La campanilla al llegar: sobre las puertas, y un ruido fuerte para ella frente a ellas. */
  campanilla(ctx: ContextoJuego, puerta: Punto, frente: Punto): void {
    ctx.audio.reproducir('campanilla', { posicion: { x: puerta.x, y: 2.3, z: puerta.z }, volumen: 1, reverb: 0.5 });
    ctx.bus.emit('ruido', { x: frente.x, z: frente.z, intensidad: RUIDO_ASCENSOR.campanilla, origen: 'entorno', causa: 'maquina' });
    ctx.bus.emit('sonido-relevante', { descripcion: 'la campanilla del ascensor', x: puerta.x, z: puerta.z });
  }

  /** El golpe del freno en un sacudón, desde el piso de la cabina. */
  golpe(ctx: ContextoJuego, volumen = 0.55): void {
    const c = this.marco;
    ctx.audio.reproducir('golpe', { posicion: { x: c.cx, y: 0.2, z: c.cz }, volumen, tono: 0.55 });
  }
}
