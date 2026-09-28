// Aquí está mi motor de audio sobre la Web Audio API (nativa del navegador,
// sin librerías). Maneja: contexto, buses de mezcla, oyente 3D, reverberación
// por habitación, oclusión por muros y el modo "escuchar".
import type { Object3D } from 'three';
import { Vector3 } from 'three';
import { BibliotecaSonidos } from './BibliotecaSonidos';
import { FuenteSonido } from './FuenteSonido';
import { Reverberacion } from './Reverberacion';
import type { IdSonido, NombreBus, OpcionesSonido } from './TiposAudio';
import type { TipoReverb } from '../mundo/datos/TiposMapa';
import type { AjustesJugador } from '../config/Ajustes';

/** Función que me dice cuántos obstáculos hay entre el oyente y un punto. */
export type ConsultaOclusion = (ax: number, az: number, bx: number, bz: number) => number;

const BUSES: NombreBus[] = ['ambiente', 'efectos', 'entidad', 'voz', 'interfaz'];

/** Cómo cambia cada bus al escuchar con atención. */
const MODO_ESCUCHA: Record<NombreBus, number> = { ambiente: 0.3, efectos: 1.15, entidad: 1.9, voz: 0.45, interfaz: 1 };

export class MotorAudio {
  readonly contexto: AudioContext;
  readonly biblioteca = new BibliotecaSonidos();
  consultaOclusion: ConsultaOclusion | null = null;

  private readonly maestro: GainNode;
  private readonly compresor: DynamicsCompressorNode;
  private readonly buses = {} as Record<NombreBus, GainNode>;
  private readonly volumenBus: Record<NombreBus, number> = { ambiente: 1, efectos: 1, entidad: 1, voz: 1, interfaz: 1 };
  private readonly reverb: Reverberacion;
  private readonly activas = new Set<FuenteSonido>();
  private readonly oyente = new Vector3();
  private readonly adelante = new Vector3();
  private readonly arriba = new Vector3();
  private escucha = 0;
  private silencioAmbiente = 1;
  private temporizadorOclusion = 0;

  constructor(private hrtf: boolean) {
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.contexto = new Contexto({ latencyHint: 'interactive' });

    // El compresor final evita que un susto fuerte sature y protege los oídos del jugador.
    this.compresor = this.contexto.createDynamicsCompressor();
    this.compresor.threshold.value = -14;
    this.compresor.knee.value = 12;
    this.compresor.ratio.value = 4;
    this.compresor.attack.value = 0.004;
    this.compresor.release.value = 0.25;
    this.maestro = this.contexto.createGain();
    this.maestro.connect(this.compresor);
    this.compresor.connect(this.contexto.destination);

    for (const nombre of BUSES) {
      const bus = this.contexto.createGain();
      bus.connect(this.maestro);
      this.buses[nombre] = bus;
    }
    this.reverb = new Reverberacion(this.contexto, this.maestro);
  }

  async generarSonidos(alProgreso: (p: number) => void): Promise<void> {
    await this.biblioteca.generar(this.contexto, alProgreso);
  }

  /** El navegador exige un gesto del jugador para arrancar el audio. */
  async reanudar(): Promise<void> {
    if (this.contexto.state !== 'running') {
      try {
        await this.contexto.resume();
      } catch {
        // Si falla, se reintentará en el siguiente toque.
      }
    }
  }

  async suspender(): Promise<void> {
    if (this.contexto.state === 'running') await this.contexto.suspend();
  }

  fijarHRTF(activo: boolean): void {
    this.hrtf = activo;
  }

  aplicarVolumenes(ajustes: Readonly<AjustesJugador>): void {
    const t = this.contexto.currentTime;
    this.maestro.gain.setTargetAtTime(ajustes.volumenMaestro, t, 0.05);
    this.volumenBus.ambiente = ajustes.volumenAmbiente;
    this.volumenBus.efectos = ajustes.volumenEfectos;
    this.volumenBus.entidad = ajustes.volumenEfectos;
    this.volumenBus.voz = ajustes.volumenEfectos;
    this.volumenBus.interfaz = ajustes.volumenEfectos;
    this.refrescarBuses(0.05);
  }

  private refrescarBuses(transicion: number): void {
    const t = this.contexto.currentTime;
    for (const nombre of BUSES) {
      const escucha = 1 + (MODO_ESCUCHA[nombre] - 1) * this.escucha;
      const silencio = nombre === 'ambiente' ? this.silencioAmbiente : 1;
      this.buses[nombre].gain.setTargetAtTime(this.volumenBus[nombre] * escucha * silencio, t, transicion);
    }
  }

  /** Nodo de un bus (para el ambiente, que crea sus propios osciladores). */
  bus(nombre: NombreBus): GainNode {
    return this.buses[nombre];
  }

  get envioReverb(): AudioNode {
    return this.reverb.entrada;
  }

  reproducir(id: IdSonido, opciones: OpcionesSonido = {}): FuenteSonido | null {
    if (this.contexto.state === 'closed') return null;
    const buffer = this.biblioteca.obtener(id);
    if (!buffer) return null;
    const destino = this.buses[opciones.bus ?? 'efectos'];
    const fuente = new FuenteSonido(this.contexto, buffer, destino, this.reverb.entrada, opciones, this.hrtf);
    this.activas.add(fuente);
    this.aplicarOclusion(fuente);
    return fuente;
  }

  private aplicarOclusion(fuente: FuenteSonido): void {
    if (!fuente.posicion || !this.consultaOclusion) return;
    const obstaculos = this.consultaOclusion(this.oyente.x, this.oyente.z, fuente.posicion.x, fuente.posicion.z);
    fuente.aplicarOclusion(obstaculos, this.escucha * 0.5);
  }

  /** Copio la posición y orientación de la cámara al oyente de Web Audio. */
  actualizarOyente(camara: Object3D): void {
    camara.getWorldPosition(this.oyente);
    camara.getWorldDirection(this.adelante);
    this.arriba.set(0, 1, 0).applyQuaternion(camara.quaternion);
    const l = this.contexto.listener;
    const t = this.contexto.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(this.oyente.x, t, 0.01);
      l.positionY.setTargetAtTime(this.oyente.y, t, 0.01);
      l.positionZ.setTargetAtTime(this.oyente.z, t, 0.01);
      l.forwardX.setTargetAtTime(this.adelante.x, t, 0.01);
      l.forwardY.setTargetAtTime(this.adelante.y, t, 0.01);
      l.forwardZ.setTargetAtTime(this.adelante.z, t, 0.01);
      l.upX.setTargetAtTime(this.arriba.x, t, 0.01);
      l.upY.setTargetAtTime(this.arriba.y, t, 0.01);
      l.upZ.setTargetAtTime(this.arriba.z, t, 0.01);
    } else {
      // Firefox todavía usa la API antigua del oyente.
      const antigua = l as AudioListener & {
        setPosition(x: number, y: number, z: number): void;
        setOrientation(x: number, y: number, z: number, ux: number, uy: number, uz: number): void;
      };
      antigua.setPosition(this.oyente.x, this.oyente.y, this.oyente.z);
      antigua.setOrientation(this.adelante.x, this.adelante.y, this.adelante.z, this.arriba.x, this.arriba.y, this.arriba.z);
    }
  }

  /** Cada 0.1 s recalculo la oclusión de los sonidos 3D activos. */
  actualizar(dt: number): void {
    this.temporizadorOclusion -= dt;
    const recalcular = this.temporizadorOclusion <= 0;
    if (recalcular) this.temporizadorOclusion = 0.1;
    for (const fuente of this.activas) {
      if (fuente.terminada) {
        this.activas.delete(fuente);
        continue;
      }
      if (recalcular) this.aplicarOclusion(fuente);
    }
  }

  fijarReverb(tipo: TipoReverb): void {
    this.reverb.fijar(tipo);
  }

  /** Modo escuchar: 0 = normal, 1 = concentrado. Acepto valores intermedios para transiciones suaves. */
  fijarEscucha(nivel: number): void {
    if (Math.abs(nivel - this.escucha) < 0.01) return;
    this.escucha = nivel;
    this.refrescarBuses(0.15);
  }

  /** Silencio dinámico: bajo el ambiente casi a cero. El silencio también asusta. */
  fijarSilencioAmbiente(factor: number): void {
    this.silencioAmbiente = factor;
    this.refrescarBuses(0.6);
  }

  get posicionOyente(): Vector3 {
    return this.oyente;
  }

  detenerTodo(): void {
    for (const fuente of this.activas) fuente.detener(0.05);
    this.activas.clear();
  }
}
