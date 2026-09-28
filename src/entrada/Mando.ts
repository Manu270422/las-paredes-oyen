// Aquí leo mandos (Xbox, PlayStation, genéricos) con la Gamepad API.
// Uso el "mapeo estándar": los botones siempre tienen el mismo índice.
import type { EstadoEntrada } from './AccionesEntrada';

const ZONA_MUERTA = 0.16;
/** Radianes por segundo al mover el stick derecho al máximo con sensibilidad 1. */
const VELOCIDAD_GIRO = 2.7;

// Índices del mapeo estándar.
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, ARRIBA: 12, ABAJO: 13, IZQ: 14, DER: 15 } as const;

export type BotonMenu = 'arriba' | 'abajo' | 'izquierda' | 'derecha' | 'aceptar' | 'volver' | 'start';

export class Mando {
  private previo: boolean[] = [];
  private actual: boolean[] = [];
  private conectado: Gamepad | null = null;
  private repeticionEje = 0;

  /** Leo el primer mando conectado. Devuelvo true si hubo actividad. */
  sondear(): boolean {
    const mandos = navigator.getGamepads ? navigator.getGamepads() : [];
    this.conectado = null;
    for (const mando of mandos) {
      if (mando && mando.connected) {
        this.conectado = mando;
        break;
      }
    }
    this.previo = this.actual;
    if (!this.conectado) {
      this.actual = [];
      return false;
    }
    this.actual = this.conectado.buttons.map((b) => b.pressed);
    const hayBoton = this.actual.some((p) => p);
    const hayEje = this.conectado.axes.some((v) => Math.abs(v) > 0.3);
    return hayBoton || hayEje;
  }

  get hayMando(): boolean {
    return this.conectado !== null;
  }

  private presionado(i: number): boolean {
    return this.actual[i] ?? false;
  }

  private recienPulsado(i: number): boolean {
    return (this.actual[i] ?? false) && !(this.previo[i] ?? false);
  }

  /** Aplico una zona muerta radial y una curva para dar precisión en movimientos finos. */
  private eje(x: number, y: number, curva: number): [number, number] {
    const magnitud = Math.hypot(x, y);
    if (magnitud < ZONA_MUERTA) return [0, 0];
    const normal = Math.min(1, (magnitud - ZONA_MUERTA) / (1 - ZONA_MUERTA));
    const escala = Math.pow(normal, curva) / magnitud;
    return [x * escala, y * escala];
  }

  volcar(estado: EstadoEntrada, sensibilidad: number, invertirY: boolean, dt: number): void {
    const m = this.conectado;
    if (!m) return;
    const [mx, my] = this.eje(m.axes[0] ?? 0, m.axes[1] ?? 0, 1);
    const [gx, gy] = this.eje(m.axes[2] ?? 0, m.axes[3] ?? 0, 2);
    estado.moverX += mx;
    estado.moverY += -my;
    estado.mirarX += gx * VELOCIDAD_GIRO * sensibilidad * dt;
    estado.mirarY += gy * VELOCIDAD_GIRO * 0.75 * sensibilidad * dt * (invertirY ? -1 : 1);

    estado.correr ||= this.presionado(B.L3) || this.presionado(B.LT);
    estado.aguantar ||= this.presionado(B.RB);
    estado.escuchar ||= this.presionado(B.LB);
    estado.interactuar ||= this.recienPulsado(B.A);
    estado.agacharse ||= this.recienPulsado(B.B);
    estado.linterna ||= this.recienPulsado(B.Y);
    estado.senuelo ||= this.recienPulsado(B.X);
    estado.pausa ||= this.recienPulsado(B.START);
  }

  /** Traduzco el mando a navegación de menús (con repetición al mantener el stick). */
  leerMenu(dt: number): BotonMenu | null {
    const m = this.conectado;
    if (!m) return null;
    if (this.recienPulsado(B.A)) return 'aceptar';
    if (this.recienPulsado(B.B)) return 'volver';
    if (this.recienPulsado(B.START)) return 'start';
    if (this.recienPulsado(B.ARRIBA)) return 'arriba';
    if (this.recienPulsado(B.ABAJO)) return 'abajo';
    if (this.recienPulsado(B.IZQ)) return 'izquierda';
    if (this.recienPulsado(B.DER)) return 'derecha';
    const y = m.axes[1] ?? 0;
    const x = m.axes[0] ?? 0;
    this.repeticionEje -= dt;
    if (Math.max(Math.abs(x), Math.abs(y)) > 0.6) {
      if (this.repeticionEje <= 0) {
        this.repeticionEje = 0.22;
        if (Math.abs(y) > Math.abs(x)) return y < 0 ? 'arriba' : 'abajo';
        return x < 0 ? 'izquierda' : 'derecha';
      }
    } else {
      this.repeticionEje = 0;
    }
    return null;
  }

  /** Vibración del mando (si el navegador y el mando la soportan). */
  vibrar(fuerte: number, debil: number, milisegundos: number): void {
    const actuador = (this.conectado as (Gamepad & { vibrationActuator?: GamepadHapticActuator }) | null)?.vibrationActuator;
    if (!actuador?.playEffect) return;
    actuador
      .playEffect('dual-rumble', { duration: milisegundos, strongMagnitude: fuerte, weakMagnitude: debil })
      .catch(() => undefined);
  }
}
