// Aquí construyo la "cama" sonora permanente del edificio:
// - Tono de sala (el ruido grave de un edificio viejo, nunca hay silencio real).
// - Un dron casi inaudible cuya disonancia crece con la tensión.
// - Acúfeno (pitido en los oídos) cuando el estrés del jugador es alto.
// - Sonidos lejanos al azar: goteras, maderas que se asientan, tuberías.
// - Zumbido 3D de los tubos fluorescentes cuando hay luz.
import type { MotorAudio } from './MotorAudio';
import type { FuenteSonido } from './FuenteSonido';
import type { Rejilla } from '../mundo/Rejilla';
import type { Lampara } from '../mundo/Lampara';
import type { IdSonido } from './TiposAudio';
import { aleatorio, elegir } from '../utilidades/Matematicas';

interface SonidoLejano {
  id: IdSonido;
  volumen: number;
  peso: number;
  descripcion: string;
}

const LEJANOS: SonidoLejano[] = [
  { id: 'crujido_madera', volumen: 0.5, peso: 3, descripcion: 'madera crujiendo' },
  { id: 'goteo', volumen: 0.35, peso: 3, descripcion: 'gotera' },
  { id: 'tuberia', volumen: 0.25, peso: 1, descripcion: 'tubería' },
  { id: 'puerta_lenta', volumen: 0.2, peso: 1, descripcion: 'una puerta, lejos' },
];

export class AmbienteSonoro {
  private tonoSala: AudioBufferSourceNode | null = null;
  private readonly ganDron: GainNode;
  private readonly filtroDron: BiquadFilterNode;
  private readonly osciladores: OscillatorNode[] = [];
  private readonly ganAcufeno: GainNode;
  private acufeno: OscillatorNode | null = null;
  private viento: FuenteSonido | null = null;
  private iniciado = false;
  private temporizador = 8;
  private readonly zumbidos = new Map<string, FuenteSonido>();

  constructor(private readonly motor: MotorAudio) {
    const ctx = motor.contexto;
    this.ganDron = ctx.createGain();
    this.ganDron.gain.value = 0;
    this.filtroDron = ctx.createBiquadFilter();
    this.filtroDron.type = 'lowpass';
    this.filtroDron.frequency.value = 140;
    this.filtroDron.connect(this.ganDron);
    this.ganDron.connect(motor.bus('ambiente'));
    this.ganAcufeno = ctx.createGain();
    this.ganAcufeno.gain.value = 0;
    this.ganAcufeno.connect(motor.bus('voz'));
  }

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    const ctx = this.motor.contexto;

    // Tono de sala: ruido marrón (muy grave) en bucle.
    const segundos = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < datos.length; i++) {
      ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      datos[i] = ultimo * 3.5;
    }
    this.tonoSala = ctx.createBufferSource();
    this.tonoSala.buffer = buffer;
    this.tonoSala.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const gan = ctx.createGain();
    gan.gain.value = 0.22;
    this.tonoSala.connect(lp).connect(gan).connect(this.motor.bus('ambiente'));
    this.tonoSala.start();

    // Dron: dos notas a medio tono de distancia (segunda menor), la disonancia más incómoda.
    for (const [frecuencia, tipo] of [[41.2, 'sine'], [43.65, 'sine'], [82.4, 'triangle']] as const) {
      const osc = ctx.createOscillator();
      osc.type = tipo;
      osc.frequency.value = frecuencia;
      osc.connect(this.filtroDron);
      osc.start();
      this.osciladores.push(osc);
    }
    // LFO lento sobre el filtro: el dron "respira".
    const lfo = ctx.createOscillator();
    const lfoGan = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGan.gain.value = 60;
    lfo.connect(lfoGan).connect(this.filtroDron.frequency);
    lfo.start();
    this.osciladores.push(lfo);

    this.acufeno = ctx.createOscillator();
    this.acufeno.frequency.value = 3150;
    this.acufeno.connect(this.ganAcufeno);
    this.acufeno.start();
  }

  /** La tensión del director controla la disonancia y la presencia del dron. */
  fijarTension(tension: number): void {
    const t = this.motor.contexto.currentTime;
    this.ganDron.gain.setTargetAtTime(0.05 + tension * 0.22, t, 1.5);
    this.filtroDron.frequency.setTargetAtTime(110 + tension * 160, t, 2);
    if (this.osciladores[1]) this.osciladores[1].detune.setTargetAtTime(tension * 40, t, 3);
  }

  /** Pitido en los oídos con estrés muy alto (casi imperceptible, pero se siente). */
  fijarEstres(estres: number): void {
    const nivel = Math.max(0, estres - 0.6) / 0.4;
    this.ganAcufeno.gain.setTargetAtTime(nivel * 0.012, this.motor.contexto.currentTime, 0.8);
  }

  /** Viento del hueco de la escalera (solo suena cerca de la escalera). */
  iniciarViento(x: number, z: number): void {
    if (this.viento) return;
    this.viento = this.motor.reproducir('viento', { bus: 'ambiente', posicion: { x, y: 1.5, z }, bucle: true, volumen: 0.35, distanciaReferencia: 2, caida: 1.4, variacion: 0 });
  }

  /** Enciendo o apago los zumbidos 3D según el estado de cada tubo fluorescente. */
  sincronizarLamparas(lamparas: readonly Lampara[]): void {
    for (const lampara of lamparas) {
      if (lampara.tipo !== 'tubo' && lampara.tipo !== 'bombillo') continue;
      const suena = lampara.factor > 0.3;
      const actual = this.zumbidos.get(lampara.id);
      if (suena && !actual) {
        const fuente = this.motor.reproducir('zumbido', {
          bus: 'ambiente',
          posicion: { x: lampara.posicion.x, y: lampara.posicion.y, z: lampara.posicion.z },
          bucle: true,
          volumen: lampara.tipo === 'tubo' ? 0.1 : 0.04,
          distanciaReferencia: 0.8,
          caida: 1.6,
          variacion: 0.01,
          reverb: 0.2,
        });
        if (fuente) this.zumbidos.set(lampara.id, fuente);
      } else if (!suena && actual) {
        actual.detener(0.05);
        this.zumbidos.delete(lampara.id);
      }
    }
  }

  /** Cada cierto tiempo suena algo lejano en una parte transitable del edificio. */
  actualizar(dt: number, jugadorX: number, jugadorZ: number, rejilla: Rejilla): void {
    if (!this.iniciado) return;
    this.temporizador -= dt;
    if (this.temporizador > 0) return;
    this.temporizador = aleatorio(9, 24);
    const pesos = LEJANOS.flatMap((s) => Array<SonidoLejano>(s.peso).fill(s));
    const sonido = elegir(pesos);
    if (!sonido) return;
    // Busco una celda transitable a 7-16 m del jugador.
    for (let intento = 0; intento < 12; intento++) {
      const angulo = Math.random() * Math.PI * 2;
      const distancia = aleatorio(7, 16);
      const x = jugadorX + Math.cos(angulo) * distancia;
      const z = jugadorZ + Math.sin(angulo) * distancia;
      if (!rejilla.esTransitable(rejilla.aCelda(x), rejilla.aCelda(z))) continue;
      this.motor.reproducir(sonido.id, { bus: 'ambiente', posicion: { x, y: aleatorio(0.5, 2.4), z }, volumen: sonido.volumen, variacion: 0.12, reverb: 0.7 });
      return;
    }
  }

  detenerZumbidos(): void {
    for (const fuente of this.zumbidos.values()) fuente.detener(0.05);
    this.zumbidos.clear();
  }

  /** Cuando el motor detiene todo (reinicio), olvido mis referencias para recrearlas. */
  olvidarFuentes(): void {
    this.zumbidos.clear();
    this.viento = null;
  }
}
