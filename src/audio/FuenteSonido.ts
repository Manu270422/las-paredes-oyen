// Aquí está una instancia de sonido sonando. Su cadena de nodos es:
//   buffer → filtro (oclusión) → ganancia → panner 3D → bus
//                                      └→ envío a reverberación
// La oclusión es clave: un golpe detrás de dos muros suena apagado y grave,
// así el jugador aprende a "leer" dónde está la criatura sin verla.
import type { OpcionesSonido, Posicion3D } from './TiposAudio';

export class FuenteSonido {
  readonly posicion: Posicion3D | null;
  readonly dentroPared: boolean;
  terminada = false;

  private readonly fuente: AudioBufferSourceNode;
  private readonly filtro: BiquadFilterNode;
  private readonly ganancia: GainNode;
  private readonly panner: PannerNode | null;
  private readonly envio: GainNode;
  private readonly volumenBase: number;
  private readonly envioBase: number;

  constructor(
    private readonly contexto: AudioContext,
    buffer: AudioBuffer,
    destino: AudioNode,
    envioReverb: AudioNode,
    opciones: OpcionesSonido,
    hrtf: boolean,
  ) {
    this.posicion = opciones.posicion ? { ...opciones.posicion } : null;
    this.dentroPared = opciones.dentroPared ?? false;
    this.volumenBase = opciones.volumen ?? 1;
    this.envioBase = opciones.reverb ?? (this.posicion ? 0.5 : 0.15);

    this.fuente = contexto.createBufferSource();
    this.fuente.buffer = buffer;
    this.fuente.loop = opciones.bucle ?? false;
    const variacion = opciones.variacion ?? 0.04;
    this.fuente.playbackRate.value = (opciones.tono ?? 1) * (1 + (Math.random() * 2 - 1) * variacion);

    this.filtro = contexto.createBiquadFilter();
    this.filtro.type = 'lowpass';
    this.filtro.frequency.value = this.dentroPared ? 520 : 20000;
    this.filtro.Q.value = 0.7;

    this.ganancia = contexto.createGain();
    this.ganancia.gain.value = this.volumenBase * (this.dentroPared ? 0.8 : 1);

    this.envio = contexto.createGain();
    this.envio.gain.value = this.envioBase;

    this.fuente.connect(this.filtro);
    this.filtro.connect(this.ganancia);

    if (this.posicion) {
      this.panner = contexto.createPanner();
      this.panner.panningModel = hrtf ? 'HRTF' : 'equalpower';
      this.panner.distanceModel = 'inverse';
      this.panner.refDistance = opciones.distanciaReferencia ?? 1.2;
      this.panner.maxDistance = 60;
      this.panner.rolloffFactor = opciones.caida ?? 1.1;
      this.moverA(this.posicion.x, this.posicion.y, this.posicion.z);
      this.ganancia.connect(this.panner);
      this.panner.connect(destino);
    } else {
      this.panner = null;
      this.ganancia.connect(destino);
    }
    this.ganancia.connect(this.envio);
    this.envio.connect(envioReverb);

    this.fuente.onended = () => this.liberar();
    this.fuente.start(contexto.currentTime + (opciones.retraso ?? 0));
  }

  moverA(x: number, y: number, z: number): void {
    if (!this.panner || !this.posicion) return;
    this.posicion.x = x;
    this.posicion.y = y;
    this.posicion.z = z;
    const t = this.contexto.currentTime;
    if (this.panner.positionX) {
      this.panner.positionX.setTargetAtTime(x, t, 0.02);
      this.panner.positionY.setTargetAtTime(y, t, 0.02);
      this.panner.positionZ.setTargetAtTime(z, t, 0.02);
    } else {
      // Navegadores antiguos.
      (this.panner as PannerNode & { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, z);
    }
  }

  /**
   * Aplico la oclusión según cuántos obstáculos hay entre el oyente y la fuente.
   * "reduccion" (0..1) la uso al escuchar con atención: oigo mejor a través de muros.
   */
  aplicarOclusion(obstaculos: number, reduccion: number): void {
    if (!this.posicion) return;
    const n = obstaculos * (1 - reduccion) + (this.dentroPared ? 1.2 * (1 - reduccion * 0.6) : 0);
    const corte = Math.max(220, 18000 / (1 + n * 6));
    const atenuacion = Math.pow(0.6, n);
    const t = this.contexto.currentTime;
    this.filtro.frequency.setTargetAtTime(corte, t, 0.08);
    this.ganancia.gain.setTargetAtTime(this.volumenBase * atenuacion, t, 0.08);
    // Detrás de muros, el sonido llega más "reverberado" que directo.
    this.envio.gain.setTargetAtTime(this.envioBase * (1 + Math.min(n, 2) * 0.3), t, 0.1);
  }

  fijarVolumen(volumen: number, transicion = 0.1): void {
    this.ganancia.gain.setTargetAtTime(volumen, this.contexto.currentTime, transicion / 3);
  }

  detener(fundido = 0.08): void {
    if (this.terminada) return;
    const t = this.contexto.currentTime;
    this.ganancia.gain.cancelScheduledValues(t);
    this.ganancia.gain.setValueAtTime(this.ganancia.gain.value, t);
    this.ganancia.gain.linearRampToValueAtTime(0, t + fundido);
    try {
      this.fuente.stop(t + fundido + 0.02);
    } catch {
      // Ya estaba detenida.
    }
  }

  private liberar(): void {
    if (this.terminada) return;
    this.terminada = true;
    this.fuente.disconnect();
    this.filtro.disconnect();
    this.ganancia.disconnect();
    this.envio.disconnect();
    this.panner?.disconnect();
  }
}
