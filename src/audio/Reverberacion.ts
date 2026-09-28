// Aquí simulo la acústica de cada espacio con convolución. Genero respuestas
// al impulso por código: un baño de azulejo suena brillante y resonante, la
// escalera tiene eco largo, el cuarto de servicio suena metálico.
// Al cambiar de habitación hago un fundido cruzado entre dos convolvers
// para que el cambio nunca se note como un corte.
import type { TipoReverb } from '../mundo/datos/TiposMapa';

interface PresetReverb {
  duracion: number;
  /** 0 = brillante, 1 = muy apagado (absorción de muebles y telas). */
  amortiguacion: number;
  /** Nivel de la señal reverberada. */
  mezcla: number;
  metalico?: boolean;
}

const PRESETS: Record<TipoReverb, PresetReverb> = {
  pasillo: { duracion: 1.8, amortiguacion: 0.5, mezcla: 0.42 },
  sala: { duracion: 1.1, amortiguacion: 0.65, mezcla: 0.3 },
  habitacion: { duracion: 0.6, amortiguacion: 0.75, mezcla: 0.22 },
  bano: { duracion: 1.4, amortiguacion: 0.2, mezcla: 0.48 },
  escalera: { duracion: 3.4, amortiguacion: 0.45, mezcla: 0.55 },
  ducto: { duracion: 2.3, amortiguacion: 0.3, mezcla: 0.5, metalico: true },
};

function crearImpulso(contexto: BaseAudioContext, preset: PresetReverb): AudioBuffer {
  const tasa = contexto.sampleRate;
  const largo = Math.floor(preset.duracion * tasa);
  const buffer = contexto.createBuffer(2, largo, tasa);
  const predelay = Math.floor(0.012 * tasa);
  // Primeras reflexiones: rebotes discretos en las paredes cercanas.
  const reflexiones = Array.from({ length: 6 }, () => ({ i: Math.floor((0.008 + Math.random() * 0.04) * tasa), a: 0.3 + Math.random() * 0.4 }));
  for (let canal = 0; canal < 2; canal++) {
    const datos = buffer.getChannelData(canal);
    let filtrado = 0;
    for (let i = 0; i < largo; i++) {
      const t = i / tasa;
      if (i < predelay) continue;
      const caida = Math.exp((-6.9 * t) / preset.duracion);
      // Con el tiempo la cola pierde agudos: filtro cada vez más cerrado.
      const coef = Math.min(0.97, preset.amortiguacion * 0.6 + (t / preset.duracion) * 0.5 * preset.amortiguacion);
      filtrado = (1 - coef) * (Math.random() * 2 - 1) + coef * filtrado;
      datos[i] = filtrado * caida;
    }
    for (const r of reflexiones) {
      const i = r.i + (canal === 0 ? 0 : Math.floor(Math.random() * 60));
      if (i < largo) datos[i] += r.a * (Math.random() < 0.5 ? -1 : 1);
    }
    if (preset.metalico) {
      // Filtro peine: resonancias cortas que suenan a lámina y tubería.
      const retardo = Math.floor(0.0047 * tasa);
      for (let i = retardo; i < largo; i++) datos[i] += datos[i - retardo] * 0.55;
    }
  }
  return buffer;
}

export class Reverberacion {
  readonly entrada: GainNode;
  private readonly salidas: GainNode[];
  private readonly convolvers: ConvolverNode[];
  private readonly impulsos = new Map<TipoReverb, AudioBuffer>();
  private activo = 0;
  private presetActual: TipoReverb | null = null;

  constructor(private readonly contexto: AudioContext, destino: AudioNode) {
    this.entrada = contexto.createGain();
    this.convolvers = [contexto.createConvolver(), contexto.createConvolver()];
    this.salidas = [contexto.createGain(), contexto.createGain()];
    for (let i = 0; i < 2; i++) {
      this.entrada.connect(this.convolvers[i]);
      this.convolvers[i].connect(this.salidas[i]);
      this.salidas[i].connect(destino);
      this.salidas[i].gain.value = 0;
    }
    for (const [tipo, preset] of Object.entries(PRESETS) as [TipoReverb, PresetReverb][]) {
      this.impulsos.set(tipo, crearImpulso(contexto, preset));
    }
  }

  fijar(tipo: TipoReverb, transicion = 1.2): void {
    if (tipo === this.presetActual) return;
    this.presetActual = tipo;
    const siguiente = 1 - this.activo;
    const ahora = this.contexto.currentTime;
    this.convolvers[siguiente].buffer = this.impulsos.get(tipo) ?? null;
    const mezcla = PRESETS[tipo].mezcla;
    this.salidas[siguiente].gain.cancelScheduledValues(ahora);
    this.salidas[siguiente].gain.setValueAtTime(this.salidas[siguiente].gain.value, ahora);
    this.salidas[siguiente].gain.linearRampToValueAtTime(mezcla, ahora + transicion);
    this.salidas[this.activo].gain.cancelScheduledValues(ahora);
    this.salidas[this.activo].gain.setValueAtTime(this.salidas[this.activo].gain.value, ahora);
    this.salidas[this.activo].gain.linearRampToValueAtTime(0, ahora + transicion);
    this.activo = siguiente;
  }
}
