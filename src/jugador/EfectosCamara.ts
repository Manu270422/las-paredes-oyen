// Aquí calculo los efectos físicos de la cámara: sacudidas por "trauma"
// (un portazo, un susto) con ruido suave, no aleatorio puro, para que se
// sientan como un cuerpo reaccionando y no como una pantalla vibrando.
import { Vector3 } from 'three';
import { Ruido2D } from '../utilidades/Ruido';

const ruido = new Ruido2D(77);

export class EfectosCamara {
  /** Entre 0 y 1. La sacudida es trauma², así los golpes pequeños casi no se notan. */
  trauma = 0;
  readonly desplazamiento = new Vector3();
  giroZ = 0;
  giroX = 0;
  giroY = 0;
  private tiempo = 0;

  agregarTrauma(cantidad: number): void {
    this.trauma = Math.min(1, this.trauma + cantidad);
  }

  actualizar(dt: number, reducir: boolean): void {
    this.tiempo += dt;
    this.trauma = Math.max(0, this.trauma - dt * 0.9);
    const s = this.trauma * this.trauma * (reducir ? 0.3 : 1);
    const t = this.tiempo * 22;
    const n = (k: number) => ruido.valor(t, k) * 2 - 1;
    this.desplazamiento.set(n(1) * 0.05 * s, n(2) * 0.04 * s, 0);
    this.giroZ = n(3) * 0.06 * s;
    this.giroX = n(4) * 0.05 * s;
    this.giroY = n(5) * 0.05 * s;
  }

  reiniciar(): void {
    this.trauma = 0;
    this.desplazamiento.set(0, 0, 0);
    this.giroX = this.giroY = this.giroZ = 0;
  }
}
