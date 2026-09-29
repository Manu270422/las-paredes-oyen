// Aquí está la "SEGUNDA REALIDAD" de la grabadora: lo que el micrófono captó
// DE VERDAD durante los 6 s de medición, no un guion fijo.
//
// Reglas (siempre las mismas, para que el jugador pueda aprenderlas):
// 1. El micrófono oye el mundo: cada sonido que sonó a menos de 12 m (golpes,
//    rasguños, pasos, puertas...) queda en la cinta, con su momento y su lugar.
//    Mis propios sonidos no: si hubiera hecho ruido, la medición se habría arruinado.
// 2. El micrófono oye lo que yo NO: si la criatura estuvo cerca y en silencio
//    (a menos de 6 m dentro del muro, o de 8 m con cuerpo), la cinta la capta
//    respirando. Al reproducir descubro que, mientras yo aguantaba el aire en
//    "silencio", ella estaba ahí, al otro lado de la pared.
// 3. La cinta dice DÓNDE: cada línea lleva la dirección respecto a como yo
//    miraba en ese momento y qué tan cerca del micrófono estaba.
// 4. La cinta es honesta: si no pasó nada, no inventa nada.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { IdSonido, OpcionesSonido } from '../audio/TiposAudio';
import type { LineaTranscripcion } from '../narrativa/Transcripciones';
import { distancia2D, normalizarAngulo } from '../utilidades/Matematicas';

/** Hasta dónde oye el micrófono los sonidos del mundo (m). */
const ALCANCE_MICROFONO = 12;
/** Hasta dónde capta la presencia silenciosa de la criatura (m). */
const PRESENCIA_EN_MURO = 6;
const PRESENCIA_CON_CUERPO = 8;
const CADA_PRESENCIA = 0.5;
/** Momento de la reproducción en que empieza "lo grabado" (después del bip y el siseo). */
const INICIO_CINTA = 1.2;
/** Sonidos iguales más juntos que esto son uno solo con repeticiones (tres golpes = una línea). */
const AGRUPAR = 1.2;
/** Si el guion ya tiene ese mismo sonido cerca de ese momento, no lo repito. */
const DISTANCIA_GUION = 2;
const MAXIMO_LINEAS = 4;

/** Qué escribe la transcripción para cada sonido del mundo. Lo que no está aquí, la cinta no lo nombra. */
const DESCRIPCION: Partial<Record<IdSonido, string>> = {
  golpe: 'Golpes en la pared',
  rasguno: 'Algo rasca dentro del muro',
  friccion_muro: 'Algo grande roza el muro por dentro',
  paso_entidad: 'Un paso pesado, húmedo',
  paso_granito: 'Pasos',
  paso_parque: 'Pasos',
  paso_azulejo: 'Pasos',
  paso_concreto: 'Pasos',
  arrastre: 'Algo se arrastra por el piso',
  chasquido: 'Un crujido, como de huesos',
  respira_entidad: 'Algo respira',
  respira_acecho: 'Algo respira, muy despacio',
  jadeo_entidad: 'Un jadeo ronco',
  crujido_madera: 'La madera cruje',
  tuberia: 'La tubería golpea',
  susurro: 'Un susurro',
  puerta_lenta: 'Una puerta se abre despacio',
  puerta_crujido: 'Una puerta cruje',
  puerta_cerrar: 'Una puerta se cierra',
  portazo: 'Un portazo',
  estatica: 'Estática de radio',
};

interface Huella {
  /** Segundos desde que empezó la medición. */
  t: number;
  id: IdSonido;
  descripcion: string;
  volumen: number;
  dentroPared: boolean;
  /** Dónde estaba respecto a mí ("a tu izquierda, junto al micrófono"). */
  lugar: string;
  /** Solo la presencia: algo que yo no pude oír. */
  inaudible: boolean;
}

export class CapturaGrabadora {
  private huellas: Huella[] = [];
  private grabando = false;
  private inicio = 0;
  private temporizadorPresencia = 0;
  private presenciaCaptada = false;
  private dejarDeObservar: (() => void) | null = null;

  get captoPresencia(): boolean {
    return this.presenciaCaptada;
  }

  get cantidad(): number {
    return this.huellas.length;
  }

  iniciar(ctx: ContextoJuego): void {
    this.cancelar();
    this.grabando = true;
    this.inicio = ctx.programador.ahora;
    this.temporizadorPresencia = CADA_PRESENCIA;
    this.dejarDeObservar = ctx.audio.observar((id, opciones) => this.alSonido(id, opciones, ctx));
  }

  /** La medición terminó bien: dejo de grabar pero conservo lo captado para reproducirlo. */
  cerrar(): void {
    this.grabando = false;
    this.dejarDeObservar?.();
    this.dejarDeObservar = null;
  }

  /** La medición se arruinó (o reinicio): lo captado no sirve. */
  cancelar(): void {
    this.cerrar();
    this.huellas = [];
    this.presenciaCaptada = false;
  }

  /** Regla 2: la presencia silenciosa. La reviso cada medio segundo mientras grabo. */
  actualizar(dt: number, ctx: ContextoJuego): void {
    if (!this.grabando || this.presenciaCaptada) return;
    this.temporizadorPresencia -= dt;
    if (this.temporizadorPresencia > 0) return;
    this.temporizadorPresencia = CADA_PRESENCIA;
    const e = ctx.entidad;
    const distancia = e.distanciaAlJugador(ctx);
    if (distancia > (e.fisica ? PRESENCIA_CON_CUERPO : PRESENCIA_EN_MURO)) return;
    this.presenciaCaptada = true;
    this.huellas.push({
      t: ctx.programador.ahora - this.inicio,
      id: e.fisica ? 'respira_acecho' : 'respira_entidad',
      descripcion: e.fisica ? 'Algo respira de pie, sin moverse' : 'Algo respira dentro del muro',
      volumen: Math.max(0.25, 0.6 - distancia * 0.05),
      dentroPared: !e.fisica,
      lugar: this.lugar(ctx, e.posicion.x, e.posicion.z),
      inaudible: true,
    });
  }

  /** Regla 1: cada sonido del mundo que suena mientras grabo, si llega al micrófono. */
  private alSonido(id: IdSonido, o: OpcionesSonido, ctx: ContextoJuego): void {
    const descripcion = DESCRIPCION[id];
    if (!this.grabando || !o.posicion || !descripcion) return;
    // Mis sonidos y los de la interfaz no son "el mundo".
    if (o.bus === 'voz' || o.bus === 'interfaz') return;
    const j = ctx.jugador.posicion;
    if (distancia2D(o.posicion.x, o.posicion.z, j.x, j.z) > ALCANCE_MICROFONO) return;
    this.huellas.push({
      t: ctx.programador.ahora - this.inicio + (o.retraso ?? 0),
      id,
      descripcion,
      volumen: o.volumen ?? 0.5,
      dentroPared: o.dentroPared ?? false,
      lugar: this.lugar(ctx, o.posicion.x, o.posicion.z),
      inaudible: false,
    });
  }

  /**
   * Convierto lo captado en líneas de transcripción, respetando las líneas del
   * guion (la historia manda: si el guion ya tiene ese sonido ahí, no lo duplico).
   */
  lineas(guion: readonly LineaTranscripcion[]): LineaTranscripcion[] {
    const ordenadas = [...this.huellas].sort((a, b) => a.t - b.t);
    const grupos: Huella[][] = [];
    for (const h of ordenadas) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo[0].id === h.id && h.t - ultimo[ultimo.length - 1].t < AGRUPAR) ultimo.push(h);
      else grupos.push([h]);
    }
    const salida: LineaTranscripcion[] = [];
    let lineasConTexto = 0;
    for (const grupo of grupos) {
      const primero = grupo[0];
      const momento = INICIO_CINTA + primero.t;
      const repetido = guion.some((l) => l.sonido === primero.id && Math.abs(l.t - momento) < DISTANCIA_GUION);
      // Lo inaudible nunca lo descarto: es la razón de ser de esta cinta.
      if (!primero.inaudible && (repetido || lineasConTexto >= MAXIMO_LINEAS)) continue;
      lineasConTexto++;
      const texto = primero.inaudible
        ? `[${primero.descripcion}, ${primero.lugar}. Tú no oíste nada.]`
        : `[${primero.descripcion}, ${primero.lugar}]`;
      grupo.forEach((h, i) => {
        salida.push({
          t: INICIO_CINTA + h.t,
          texto: i === 0 ? texto : '',
          sonido: h.id,
          volumen: Math.min(0.7, Math.max(0.15, h.volumen * 0.8)),
          dentroPared: h.dentroPared,
        });
      });
    }
    return salida;
  }

  /** "a tu izquierda, junto al micrófono": relativo a como yo miraba en ese momento. */
  private lugar(ctx: ContextoJuego, x: number, z: number): string {
    const j = ctx.jugador;
    const d = distancia2D(x, z, j.posicion.x, j.posicion.z);
    const relativo = normalizarAngulo(Math.atan2(-(x - j.posicion.x), -(z - j.posicion.z)) - j.yaw);
    const abs = Math.abs(relativo);
    const direccion = abs < Math.PI / 4 ? 'delante de ti' : abs > (3 * Math.PI) / 4 ? 'detrás de ti' : relativo > 0 ? 'a tu izquierda' : 'a tu derecha';
    const cerca = d < 1.6 ? 'junto al micrófono' : d < 4 ? 'muy cerca' : `a unos ${Math.round(d)} metros`;
    return `${direccion}, ${cerca}`;
  }
}
