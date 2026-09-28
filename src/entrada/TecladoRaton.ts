// Aquí leo teclado y ratón. El ratón usa Pointer Lock: el cursor desaparece
// y recibo el movimiento crudo para girar la cámara sin límites.
import type { EstadoEntrada } from './AccionesEntrada';

/** Radianes por píxel de ratón con sensibilidad 1. */
const RADIANES_POR_PIXEL = 0.0022;

export class TecladoRaton {
  private readonly teclas = new Set<string>();
  private readonly recienPulsadas = new Set<string>();
  private deltaX = 0;
  private deltaY = 0;
  private botonDerecho = false;
  private clicIzquierdo = false;

  constructor(
    private readonly lienzo: HTMLCanvasElement,
    private readonly alActividad: () => void,
  ) {
    window.addEventListener('keydown', (e) => {
      // Evito que Tab cambie el foco o que las flechas desplacen la página.
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (this.bloqueado) e.preventDefault();
      }
      if (!this.teclas.has(e.code)) this.recienPulsadas.add(e.code);
      this.teclas.add(e.code);
      this.alActividad();
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    // Si la ventana pierde el foco, suelto todo para que el jugador no quede corriendo solo.
    window.addEventListener('blur', () => {
      this.teclas.clear();
      this.botonDerecho = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.bloqueado) return;
      this.deltaX += e.movementX;
      this.deltaY += e.movementY;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) this.alActividad();
    });
    this.lienzo.addEventListener('mousedown', (e) => {
      if (!this.bloqueado) return;
      if (e.button === 2) this.botonDerecho = true;
      if (e.button === 0) this.clicIzquierdo = true;
      this.alActividad();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.botonDerecho = false;
    });
    this.lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get bloqueado(): boolean {
    return document.pointerLockElement === this.lienzo;
  }

  pedirBloqueo(): void {
    if (this.bloqueado) return;
    try {
      const resultado = this.lienzo.requestPointerLock() as unknown;
      // En navegadores modernos devuelve una promesa que puede rechazarse.
      if (resultado instanceof Promise) resultado.catch(() => undefined);
    } catch {
      // Si falla (por ejemplo en un iframe), el jugador puede reintentar con un clic.
    }
  }

  liberarBloqueo(): void {
    if (this.bloqueado) document.exitPointerLock();
  }

  /** Vuelco lo leído en el estado de acciones y limpio lo acumulado. */
  volcar(estado: EstadoEntrada, sensibilidad: number, invertirY: boolean): void {
    const t = this.teclas;
    const adelante = t.has('KeyW') || t.has('ArrowUp');
    const atras = t.has('KeyS') || t.has('ArrowDown');
    const izquierda = t.has('KeyA') || t.has('ArrowLeft');
    const derecha = t.has('KeyD') || t.has('ArrowRight');
    estado.moverY += (adelante ? 1 : 0) - (atras ? 1 : 0);
    estado.moverX += (derecha ? 1 : 0) - (izquierda ? 1 : 0);

    if (this.bloqueado) {
      estado.mirarX += this.deltaX * RADIANES_POR_PIXEL * sensibilidad;
      estado.mirarY += this.deltaY * RADIANES_POR_PIXEL * sensibilidad * (invertirY ? -1 : 1);
    }

    estado.correr ||= t.has('ShiftLeft') || t.has('ShiftRight');
    estado.aguantar ||= t.has('KeyQ');
    estado.escuchar ||= this.botonDerecho || t.has('Tab');

    const r = this.recienPulsadas;
    estado.agacharse ||= r.has('KeyC') || r.has('ControlLeft');
    estado.interactuar ||= r.has('KeyE') || this.clicIzquierdo;
    estado.linterna ||= r.has('KeyF');
    estado.senuelo ||= r.has('KeyG');
    estado.pausa ||= r.has('Escape') || r.has('KeyP');

    this.recienPulsadas.clear();
    this.deltaX = 0;
    this.deltaY = 0;
    this.clicIzquierdo = false;
  }

  /** Descarto lo pulsado mientras el juego no leía (por ejemplo, el Escape que cerró la pausa). */
  descartar(): void {
    this.recienPulsadas.clear();
    this.deltaX = 0;
    this.deltaY = 0;
    this.clicIzquierdo = false;
    this.botonDerecho = false;
  }

  /** Reviso si una tecla se acaba de pulsar (para menús). */
  seAcabaDePulsar(codigo: string): boolean {
    return this.recienPulsadas.has(codigo);
  }
}
