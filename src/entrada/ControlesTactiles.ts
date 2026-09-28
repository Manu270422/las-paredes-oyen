// Aquí construyo los controles táctiles para celulares y tabletas:
// - Mitad izquierda: joystick dinámico (aparece donde pongo el pulgar).
// - Mitad derecha: arrastrar para mirar.
// - Botones grandes y separados para el pulgar derecho.
// Uso Pointer Events para soportar varios dedos a la vez sin conflictos.
import type { EstadoEntrada } from './AccionesEntrada';
import { ICONOS, type NombreIcono } from '../ui/Iconos';

/** Radianes por píxel arrastrado con sensibilidad 1 (en táctil se gira más). */
const RADIANES_POR_PIXEL = 0.0048;
/** Si empujo el joystick más allá de esto, corro. */
const UMBRAL_CORRER = 0.93;

type AccionBoton = 'interactuar' | 'linterna' | 'agacharse' | 'aguantar' | 'escuchar' | 'senuelo' | 'pausa';

interface DefBoton {
  accion: AccionBoton;
  icono: NombreIcono;
  etiqueta: string;
  mantener: boolean;
}

const BOTONES: DefBoton[] = [
  { accion: 'interactuar', icono: 'mano', etiqueta: 'Interactuar', mantener: false },
  { accion: 'aguantar', icono: 'respiracion', etiqueta: 'Contener la respiración', mantener: true },
  { accion: 'escuchar', icono: 'oido', etiqueta: 'Escuchar', mantener: true },
  { accion: 'linterna', icono: 'linterna', etiqueta: 'Linterna', mantener: false },
  { accion: 'agacharse', icono: 'agacharse', etiqueta: 'Agacharse', mantener: false },
  { accion: 'senuelo', icono: 'cinta', etiqueta: 'Señuelo', mantener: false },
  { accion: 'pausa', icono: 'pausa', etiqueta: 'Pausa', mantener: false },
];

export class ControlesTactiles {
  readonly elemento: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly palanca: HTMLDivElement;
  private readonly botones = new Map<AccionBoton, HTMLButtonElement>();

  // Estado del joystick.
  private punteroMover: number | null = null;
  private origenX = 0;
  private origenY = 0;
  private valorX = 0;
  private valorY = 0;
  private radio = 60;

  // Estado de la mirada.
  private punteroMirar: number | null = null;
  private ultimoX = 0;
  private ultimoY = 0;
  private deltaX = 0;
  private deltaY = 0;

  // Estado de botones.
  private readonly mantenidos = new Set<AccionBoton>();
  private readonly pulsados = new Set<AccionBoton>();

  constructor(private readonly alActividad: () => void) {
    this.elemento = document.createElement('div');
    this.elemento.className = 'tactil';

    const zonaMover = document.createElement('div');
    zonaMover.className = 'tactil__zona tactil__zona--mover';
    const zonaMirar = document.createElement('div');
    zonaMirar.className = 'tactil__zona tactil__zona--mirar';

    this.base = document.createElement('div');
    this.base.className = 'tactil__joystick';
    this.palanca = document.createElement('div');
    this.palanca.className = 'tactil__palanca';
    this.base.appendChild(this.palanca);
    zonaMover.appendChild(this.base);

    const grupo = document.createElement('div');
    grupo.className = 'tactil__botones';
    for (const def of BOTONES) grupo.appendChild(this.crearBoton(def));

    this.elemento.append(zonaMover, zonaMirar, grupo);
    this.configurarJoystick(zonaMover);
    this.configurarMirada(zonaMirar);
  }

  private crearBoton(def: DefBoton): HTMLButtonElement {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `tactil__boton tactil__boton--${def.accion}`;
    boton.setAttribute('aria-label', def.etiqueta);
    boton.innerHTML = ICONOS[def.icono];
    const soltar = (e: PointerEvent) => {
      e.preventDefault();
      this.mantenidos.delete(def.accion);
      boton.classList.remove('tactil__boton--activo');
    };
    boton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      boton.setPointerCapture(e.pointerId);
      boton.classList.add('tactil__boton--activo');
      if (def.mantener) this.mantenidos.add(def.accion);
      else this.pulsados.add(def.accion);
      this.alActividad();
    });
    boton.addEventListener('pointerup', soltar);
    boton.addEventListener('pointercancel', soltar);
    this.botones.set(def.accion, boton);
    return boton;
  }

  private configurarJoystick(zona: HTMLDivElement): void {
    zona.addEventListener('pointerdown', (e) => {
      if (this.punteroMover !== null) return;
      e.preventDefault();
      zona.setPointerCapture(e.pointerId);
      this.punteroMover = e.pointerId;
      // El joystick aparece exactamente donde apoyo el pulgar: más cómodo que uno fijo.
      const caja = zona.getBoundingClientRect();
      this.radio = this.base.offsetWidth / 2 || 60;
      this.origenX = e.clientX;
      this.origenY = e.clientY;
      this.base.style.left = `${e.clientX - caja.left}px`;
      this.base.style.top = `${e.clientY - caja.top}px`;
      this.base.classList.add('tactil__joystick--visible');
      this.alActividad();
    });
    zona.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.punteroMover) return;
      const dx = e.clientX - this.origenX;
      const dy = e.clientY - this.origenY;
      const distancia = Math.hypot(dx, dy);
      const limite = Math.min(distancia, this.radio);
      const angulo = Math.atan2(dy, dx);
      const px = Math.cos(angulo) * limite;
      const py = Math.sin(angulo) * limite;
      this.valorX = px / this.radio;
      this.valorY = -py / this.radio;
      this.palanca.style.transform = `translate(${px}px, ${py}px)`;
      this.base.classList.toggle('tactil__joystick--correr', Math.hypot(this.valorX, this.valorY) > UMBRAL_CORRER);
    });
    const terminar = (e: PointerEvent) => {
      if (e.pointerId !== this.punteroMover) return;
      this.punteroMover = null;
      this.valorX = 0;
      this.valorY = 0;
      this.palanca.style.transform = 'translate(0px, 0px)';
      this.base.classList.remove('tactil__joystick--visible', 'tactil__joystick--correr');
    };
    zona.addEventListener('pointerup', terminar);
    zona.addEventListener('pointercancel', terminar);
  }

  private configurarMirada(zona: HTMLDivElement): void {
    zona.addEventListener('pointerdown', (e) => {
      if (this.punteroMirar !== null) return;
      e.preventDefault();
      zona.setPointerCapture(e.pointerId);
      this.punteroMirar = e.pointerId;
      this.ultimoX = e.clientX;
      this.ultimoY = e.clientY;
      this.alActividad();
    });
    zona.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.punteroMirar) return;
      this.deltaX += e.clientX - this.ultimoX;
      this.deltaY += e.clientY - this.ultimoY;
      this.ultimoX = e.clientX;
      this.ultimoY = e.clientY;
    });
    const terminar = (e: PointerEvent) => {
      if (e.pointerId === this.punteroMirar) this.punteroMirar = null;
    };
    zona.addEventListener('pointerup', terminar);
    zona.addEventListener('pointercancel', terminar);
  }

  /** Muestro u oculto todo el control táctil. */
  fijarVisible(visible: boolean): void {
    this.elemento.classList.toggle('tactil--visible', visible);
    if (!visible) this.soltarTodo();
  }

  /** El botón de interactuar solo aparece cuando hay algo con qué interactuar. */
  fijarInteraccionDisponible(disponible: boolean, texto: string): void {
    const boton = this.botones.get('interactuar');
    if (!boton) return;
    boton.classList.toggle('tactil__boton--oculto', !disponible);
    boton.setAttribute('aria-label', texto || 'Interactuar');
  }

  /** Marco visualmente botones de estado (agachado, linterna encendida). */
  fijarEstadoBoton(accion: 'agacharse' | 'linterna', encendido: boolean): void {
    this.botones.get(accion)?.classList.toggle('tactil__boton--encendido', encendido);
  }

  soltarTodo(): void {
    this.mantenidos.clear();
    this.pulsados.clear();
    this.punteroMover = null;
    this.punteroMirar = null;
    this.valorX = 0;
    this.valorY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.palanca.style.transform = 'translate(0px, 0px)';
    this.base.classList.remove('tactil__joystick--visible', 'tactil__joystick--correr');
    for (const boton of this.botones.values()) boton.classList.remove('tactil__boton--activo');
  }

  volcar(estado: EstadoEntrada, sensibilidad: number, invertirY: boolean): void {
    estado.moverX += this.valorX;
    estado.moverY += this.valorY;
    estado.correr ||= Math.hypot(this.valorX, this.valorY) > UMBRAL_CORRER;
    estado.mirarX += this.deltaX * RADIANES_POR_PIXEL * sensibilidad;
    estado.mirarY += this.deltaY * RADIANES_POR_PIXEL * sensibilidad * (invertirY ? -1 : 1);
    this.deltaX = 0;
    this.deltaY = 0;

    estado.aguantar ||= this.mantenidos.has('aguantar');
    estado.escuchar ||= this.mantenidos.has('escuchar');
    estado.interactuar ||= this.pulsados.has('interactuar');
    estado.linterna ||= this.pulsados.has('linterna');
    estado.agacharse ||= this.pulsados.has('agacharse');
    estado.senuelo ||= this.pulsados.has('senuelo');
    estado.pausa ||= this.pulsados.has('pausa');
    this.pulsados.clear();
  }
}
