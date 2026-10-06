// Aquí junto todas las fuentes de entrada (teclado/ratón, mando, táctil)
// en un solo estado de acciones por fotograma. También detecto cuál
// dispositivo está usando el jugador para mostrarle los botones correctos.
import { crearEstadoVacio, limpiarEstado, type EstadoEntrada, type ModoEntrada } from './AccionesEntrada';
import { TecladoRaton } from './TecladoRaton';
import { Mando, type BotonMenu } from './Mando';
import { ControlesTactiles } from './ControlesTactiles';
import type { GestorAjustes } from '../config/Ajustes';

type OyenteModo = (modo: ModoEntrada) => void;

export class GestorEntrada {
  readonly estado: EstadoEntrada = crearEstadoVacio();
  readonly teclado: TecladoRaton;
  readonly mando = new Mando();
  readonly tactil: ControlesTactiles;
  private modoActual: ModoEntrada;
  private enJuego = false;
  private readonly oyentes = new Set<OyenteModo>();

  constructor(
    lienzo: HTMLCanvasElement,
    contenedorUI: HTMLElement,
    private readonly ajustes: GestorAjustes,
    esTactil: boolean,
  ) {
    this.modoActual = esTactil ? 'tactil' : 'teclado';
    this.teclado = new TecladoRaton(lienzo, () => this.fijarModo('teclado'));
    this.tactil = new ControlesTactiles(() => this.fijarModo('tactil'));
    contenedorUI.appendChild(this.tactil.elemento);

    // Si el jugador toca la pantalla en cualquier momento, paso a modo táctil.
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') this.fijarModo('tactil');
      },
      { capture: true, passive: true },
    );
    window.addEventListener('gamepadconnected', () => this.fijarModo('mando'));

    this.ajustes.suscribir((valores) => {
      document.documentElement.style.setProperty('--escala-controles', String(valores.tamanoControles));
    });
    document.documentElement.style.setProperty('--escala-controles', String(this.ajustes.valores.tamanoControles));
  }

  get modo(): ModoEntrada {
    return this.modoActual;
  }

  private fijarModo(modo: ModoEntrada): void {
    if (modo === this.modoActual) return;
    this.modoActual = modo;
    this.tactil.fijarVisible(this.enJuego && modo === 'tactil');
    document.documentElement.dataset.modoEntrada = modo;
    for (const oyente of this.oyentes) oyente(modo);
  }

  alCambiarModo(oyente: OyenteModo): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /** Activo o desactivo los controles de juego (en menús no quiero joystick ni ratón bloqueado). */
  fijarEnJuego(enJuego: boolean): void {
    this.enJuego = enJuego;
    document.documentElement.dataset.modoEntrada = this.modoActual;
    this.tactil.fijarVisible(enJuego && this.modoActual === 'tactil');
    if (enJuego && this.modoActual === 'teclado') this.teclado.pedirBloqueo();
    if (!enJuego) this.teclado.liberarBloqueo();
  }

  /** Olvido entradas acumuladas mientras estaba en un menú. */
  descartarPendientes(): void {
    this.teclado.descartar();
    this.tactil.soltarTodo();
  }

  /** Vuelvo al juego: capturo la entrada otra vez y descarto lo que se pulsó mientras no se leía. */
  volverAlJuego(): void {
    this.fijarEnJuego(true);
    this.descartarPendientes();
  }

  /** Leo todas las fuentes y dejo el resultado en this.estado. */
  actualizar(dt: number): void {
    limpiarEstado(this.estado);
    if (this.mando.sondear()) this.fijarModo('mando');
    const { sensibilidad, invertirY } = this.ajustes.valores;
    this.teclado.volcar(this.estado, sensibilidad, invertirY);
    this.mando.volcar(this.estado, sensibilidad, invertirY, dt);
    this.tactil.volcar(this.estado, sensibilidad, invertirY);
    // Si se suman varias fuentes, limito el movimiento a la unidad (diagonales incluidas).
    const magnitud = Math.hypot(this.estado.moverX, this.estado.moverY);
    if (magnitud > 1) {
      this.estado.moverX /= magnitud;
      this.estado.moverY /= magnitud;
    }
  }

  /** Para menús: devuelvo el botón de mando pulsado (si hay). */
  leerMando(dt: number): BotonMenu | null {
    this.mando.sondear();
    return this.mando.leerMenu(dt);
  }

  /** Vibración según el dispositivo que esté usando (respeto el ajuste del jugador). */
  vibrar(intensidad: number, milisegundos: number): void {
    if (!this.ajustes.valores.vibracion) return;
    if (this.modoActual === 'mando') {
      this.mando.vibrar(intensidad, intensidad * 0.6, milisegundos);
    } else if (this.modoActual === 'tactil' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(milisegundos);
      } catch {
        // iOS no soporta vibración web; lo ignoro.
      }
    }
  }
}
