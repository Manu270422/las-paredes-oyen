// Aquí está el GUION DEL PISO 1 (P1-guion). Lo que pasa siempre:
// - Al llegar en la cabina: cuando se abren las puertas, su tubo revienta y el ascensor se queda sin corriente. De
//   aquí no se vuelve a subir (la escalera también está tapada).
// - El citófono de la portería (tanda 2): la primera vez que me acerco, después de leer el libro de minuta, la pista
//   de cómo se usa. Y una sola vez, poco después de tomar las llaves, suena SOLO: llaman desde el ascensor. Si no
//   contesto, se calla (la nota de don Aurelio lo dice: "no conteste"). Si contesto, habla con la voz de Hernando y
//   se queda escuchando por la línea: es un encuentro con las reglas de siempre (quieto y sin aire, se corta; si me
//   oye, sale del muro y caza).
// - La puerta principal (tanda 3): la primera vez que suena una cerradura, la pista de su regla ("la puerta la llama").
// - El final: cuando la puerta principal termina de abrirse (sus tres cerraduras), salgo. Afuera llueve; a mi
//   espalda, en el cuarto piso, una ventana tiene luz: la del 401. "Sobreviviste".
// Todo se basa en banderas, así funciona igual al cargar partida.
import type { FuenteSonido } from '../../audio/FuenteSonido';
import { EncuentroSinCuerpo, type ResultadoEncuentro } from '../../ia/EncuentroSinCuerpo';
import type { Citofono } from '../../interaccion/objetos/Citofono';
import type { AccionesGuion } from '../../narrativa/AccionesGuion';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { GuionPiso } from '../TiposPiso';

/** La puerta principal se abrió del todo (la marca la puerta al abrir su última cerradura). */
export const PUERTA_ABIERTA = 'puerta:abierta';
/** El ascensor se quedó sin corriente al llegar (con esta bandera revienta su tubo, ver el paquete). */
export const SIN_CORRIENTE = 'ascensor:sin_corriente';
/** Lo que se oye al abrirse la puerta. BORRADOR: lo revisa el creador. */
export const AFUERA_LLUEVE = '[La puerta se abre. Afuera llueve]';
/** El título del final del juego. */
export const SOBREVIVISTE = 'Sobreviviste';
/** Lo último que se lee, sobre el negro. BORRADOR: lo revisa el creador. */
export const LA_VENTANA_DEL_401 = 'A tu espalda, en el cuarto piso, una ventana tiene luz: la del 401.';

/** Ya vi la pista del citófono. */
export const CITOFONO_VISTO = 'citofono:visto';
/** Ella ya llamó por el citófono (pasa una vez). */
export const LLAMO = 'citofono:llamo';
/** Contesté su llamada. */
export const CONTESTO = 'citofono:contesto';
/** Tomar las llaves: poco después, ella llama. */
const LLAVES = 'objeto:llaves_aurelio';
/** Leer el libro de minuta: desde ahí, la pista del citófono. */
const LEYO_MINUTA = 'leyo:minuta_aurelio';
/** La línea desde la que llama: el citófono de la cabina, la que me trajo con ella encima. */
export const LINEA_DE_ELLA = 'timbreAscensor';
/** Segundos desde que tomo las llaves hasta que suena. */
export const LLAMA_TRAS_LLAVES = 4;
/** A qué distancia del panel (m) sale la pista. */
const CERCA_DEL_PANEL = 2.6;
/** Del clic de contestar a la voz (s). */
const ANTES_DE_LA_VOZ = 1.3;
/** A esta distancia de la puerta abierta (m) cuento que salgo, si la salida quedó esperando. */
const EN_LA_PUERTA = 2.2;

/** Lo que se lee del citófono. BORRADOR (2026-10-14): lo revisa el creador. */
export const TEXTOS_CITOFONO = {
  pista: 'El citófono hace sonar un timbre lejos de aquí, y ella va hacia lo que suena. El botón también se oye, bajito, donde estás. Después, la línea queda ocupada un rato.',
  llamada: '[El citófono suena solo. La luz del ascensor parpadea]',
  estatica: '[Contestas. Solo estática]',
  voz: 'Por el citófono, la voz de Hernando: «Don Aurelio. Ábrame, que aquí adentro no se oye nada.»',
  escucha: 'alguien respira en la línea y escucha',
  pistaEscucha: 'Te está escuchando por el citófono. No te muevas y aguanta el aire ({aguantar}).',
  corta: '[La línea se corta]',
  sale: '[El citófono se queda mudo. Algo se desprende del muro]',
  ignorada: '[El citófono deja de sonar]',
} as const;

/** La regla de la puerta (tanda 3), la primera vez que suena una cerradura. BORRADOR: lo revisa el creador. */
export const PISTA_PUERTA =
  'Cada cerradura que suena la llama hacia la puerta. Aléjala antes con el citófono y abre una por vez. Si la oyes venir, apártate de la puerta: la cerradura se suelta.';

export class GuionPiso1 implements GuionPiso {
  private readonly cancelaciones: Array<() => void> = [];
  private enFinal = false;
  /** Segundos hasta que ella llame (null: no hay llamada pendiente). */
  private llamaEn: number | null = null;
  /** La línea abierta: ella escuchando por el citófono. */
  private escucha: EncuentroSinCuerpo | null = null;
  private estatica: FuenteSonido | null = null;
  /** Ya di la pista de la puerta en esta partida. */
  private pistaPuerta = false;
  /** La puerta quedó abierta mientras ella me cazaba: salgo cuando ya no me cace y vuelva a la puerta. */
  private salidaPendiente = false;

  constructor(private readonly acciones: AccionesGuion) {}

  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('bandera', ({ nombre }) => {
        if (nombre === PUERTA_ABIERTA) this.salir(ctx);
        if (nombre === LLAVES && !ctx.progreso.tiene(LLAMO)) this.llamaEn = LLAMA_TRAS_LLAVES;
      }),
      // La primera cerradura que suena: la regla de la puerta, antes de que ella llegue.
      ctx.bus.on('ruido', ({ causa }) => {
        if (causa !== 'cerradura' || this.pistaPuerta) return;
        this.pistaPuerta = true;
        ctx.bus.emit('pista', { id: 'puertaPrincipal', texto: PISTA_PUERTA });
      }),
    );
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones.splice(0)) cancelar();
    this.cortarLinea();
  }

  reiniciar(ctx: ContextoJuego): void {
    this.enFinal = false;
    this.salidaPendiente = false;
    this.llamaEn = null;
    this.cortarLinea();
    // Su llamada pasa una vez: si cargo con las llaves (su punto de control es de antes de que llamara), ya no llama.
    if (ctx.progreso.tiene(LLAVES)) ctx.progreso.marcarSilencioso(LLAMO);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.sinCorriente(ctx);
    this.pistaDelCitofono(ctx);
    this.escucha?.actualizar(dt, ctx);
    this.salidaQueEspera(ctx);
    if (this.llamaEn === null) return;
    this.llamaEn -= dt;
    // Si el citófono está ocupado (acabo de timbrar) o ella me está cazando, espera y vuelve a intentar.
    const citofono = this.citofono(ctx);
    if (this.llamaEn > 0 || !citofono || !citofono.libre || ctx.entidad.estado === 'cazando' || this.enFinal) return;
    this.llamaEn = null;
    if (citofono.llamarDesde(LINEA_DE_ELLA, ctx, (c) => this.contestar(c), (c) => c.bus.emit('subtitulo', { texto: TEXTOS_CITOFONO.ignorada, duracion: 2.5, tipo: 'efecto' }))) {
      ctx.progreso.marcar(LLAMO);
      ctx.bus.emit('subtitulo', { texto: TEXTOS_CITOFONO.llamada, duracion: 3, tipo: 'efecto' });
    }
  }

  /** Las puertas de la cabina se abrieron al llegar: el tubo revienta y el ascensor muere. */
  private sinCorriente(ctx: ContextoJuego): void {
    const ascensor = ctx.nivel.ascensor;
    if (!ascensor || ctx.progreso.tiene(SIN_CORRIENTE) || ascensor.fase !== 'abierto') return;
    const luz = ctx.nivel.lamparas.find((l) => l.id === 'luzAscensor');
    if (luz) {
      const p = luz.posicion;
      luz.interferir(0.3);
      ctx.audio.reproducir('chispa', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.8 });
      ctx.bus.emit('sonido-relevante', { descripcion: 'el tubo de la cabina revienta', x: p.x, z: p.z });
    }
    ctx.progreso.marcar(SIN_CORRIENTE);
    // Las luces de una bandera se aplican solas al cargar; en vivo, las pide el guion (como el apagón del Piso 3).
    ctx.programador.despues(0.3, () => ctx.nivel.aplicarLuzDe(SIN_CORRIENTE));
  }

  /** La puerta quedó abierta mientras me cazaba: salgo cuando ya no me caza y estoy otra vez en la puerta. */
  private salidaQueEspera(ctx: ContextoJuego): void {
    if (!this.salidaPendiente || ctx.entidad.estado === 'cazando') return;
    const puerta = ctx.nivel.salidas[0]?.objeto.position;
    const j = ctx.jugador.posicion;
    if (puerta && Math.hypot(j.x - puerta.x, j.z - puerta.z) < EN_LA_PUERTA) this.salir(ctx);
  }

  /** La primera vez que me acerco al citófono sabiendo de él (leí el libro), cómo se usa. */
  private pistaDelCitofono(ctx: ContextoJuego): void {
    if (ctx.progreso.tiene(CITOFONO_VISTO) || !ctx.progreso.tiene(LEYO_MINUTA)) return;
    const citofono = this.citofono(ctx);
    const j = ctx.jugador.posicion;
    if (!citofono || Math.hypot(j.x - citofono.posicion.x, j.z - citofono.posicion.z) > CERCA_DEL_PANEL) return;
    ctx.progreso.marcarSilencioso(CITOFONO_VISTO);
    ctx.bus.emit('pista', { id: 'citofono', texto: TEXTOS_CITOFONO.pista });
  }

  /**
   * Contesté: estática, la voz de Hernando y, debajo, ella escuchando por la línea. Mientras habla, solo lo fuerte me
   * delata; cuando se calla a escuchar, cualquier ruido mío (las reglas de cualquier encuentro, con la justicia del
   * aire). Durante la llamada ella es de este momento, no del director.
   */
  private contestar(ctx: ContextoJuego): void {
    const citofono = this.citofono(ctx);
    if (!citofono) return;
    ctx.progreso.marcar(CONTESTO);
    ctx.director.activo = false;
    ctx.director.bloquear(40);
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
    const p = citofono.objeto.position;
    const panel = { x: p.x, y: p.y, z: p.z };
    this.estatica = ctx.audio.reproducir('estatica', { posicion: panel, bucle: true, volumen: 0.3, reverb: 0.2 });
    ctx.bus.emit('subtitulo', { texto: TEXTOS_CITOFONO.estatica, duracion: 2, tipo: 'efecto' });
    ctx.programador.despues(ANTES_DE_LA_VOZ, () => {
      if (!this.escucha) return;
      ctx.audio.reproducir('susurro', { posicion: panel, volumen: 0.6, tono: 0.85, reverb: 0.2 });
      ctx.bus.emit('subtitulo', { texto: TEXTOS_CITOFONO.voz, duracion: 5, tipo: 'voz' });
    });
    this.escucha = new EncuentroSinCuerpo(
      citofono.posicion,
      (r) => this.terminoLaLlamada(r, ctx),
      () => {
        ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: panel, volumen: 0.35, tono: 0.85, distanciaReferencia: 0.8 });
        ctx.bus.emit('sonido-relevante', { descripcion: TEXTOS_CITOFONO.escucha, x: p.x, z: p.z });
        ctx.bus.emit('pista', { id: 'citofonoEscucha', texto: TEXTOS_CITOFONO.pistaEscucha });
      },
    );
    this.escucha.empezar(ctx);
  }

  /** Se cortó la línea: o no me oyó (se calla), o me oyó (sale del muro más cercano y caza, con su aviso). */
  private terminoLaLlamada(r: ResultadoEncuentro, ctx: ContextoJuego): void {
    this.escucha = null;
    this.estatica?.detener(0.1);
    this.estatica = null;
    const citofono = this.citofono(ctx);
    if (citofono) citofono.colgar(ctx);
    ctx.director.activo = true;
    ctx.entidad.puedeManifestarse = true;
    if (r.superado) {
      ctx.bus.emit('subtitulo', { texto: TEXTOS_CITOFONO.corta, duracion: 2.5, tipo: 'efecto' });
      return;
    }
    ctx.bus.emit('subtitulo', { texto: TEXTOS_CITOFONO.sale, duracion: 3, tipo: 'efecto' });
    const j = ctx.jugador.posicion;
    const salida = ctx.entidad.buscarPuntoSalida(j.x, j.z, ctx, 4, 8);
    if (!salida) return;
    ctx.entidad.manifestar(salida.x, salida.z, ctx);
    ctx.entidad.cazar(r.causa, ctx, r.pared);
  }

  /** Corto la línea sin avisar nada (al cargar, al morir o al salir del piso). */
  private cortarLinea(): void {
    this.escucha?.detener();
    this.escucha = null;
    this.estatica?.detener(0.05);
    this.estatica = null;
  }

  private citofono(ctx: ContextoJuego): Citofono | undefined {
    return ctx.nivel.citofonos[0];
  }

  /** La puerta se abrió del todo: afuera llueve, la ventana del 401 y la pantalla final. */
  private salir(ctx: ContextoJuego): void {
    if (this.enFinal) return;
    // Si la última cerradura cedió con ella escuchándome, su ruido me delató: me está cazando y la puerta abierta no
    // me salva. Salgo cuando vuelva a la puerta sin que me cace (o muero en la caza, como en cualquier encuentro).
    // Medido con el robot (tanda 3): antes, la puerta abierta mandaba a la criatura a las paredes en el mismo instante
    // en que el ruido la lanzaba a cazar, y abrir las tres sin cuidado ganaba igual.
    if (ctx.entidad.estado === 'cazando') {
      this.salidaPendiente = true;
      return;
    }
    this.salidaPendiente = false;
    this.enFinal = true;
    this.llamaEn = null;
    this.cortarLinea();
    ctx.director.bloquear(60);
    ctx.director.activo = false;
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
    this.acciones.fijarSoloMirar(true);
    const puerta = ctx.nivel.salidas[0]?.objeto.position;
    ctx.programador.secuencia(
      [
        [0.4, () => {
          if (puerta) {
            ctx.audio.reproducir('viento', { posicion: { x: puerta.x, y: 1.4, z: puerta.z }, volumen: 0.8 });
            ctx.audio.reproducir('goteo', { posicion: { x: puerta.x, y: 0.2, z: puerta.z }, volumen: 0.7 });
          }
          ctx.bus.emit('subtitulo', { texto: AFUERA_LLUEVE, duracion: 3, tipo: 'efecto' });
        }],
        [2.6, () => this.acciones.fundido(true, 2)],
        // Sobre el negro (la tarjeta de capítulo vive dentro del fundido, como la de un piso superado).
        [4.6, () => ctx.bus.emit('tarjeta', { titulo: SOBREVIVISTE, subtitulo: LA_VENTANA_DEL_401, estilo: 'capitulo' })],
        [9.2, () => {
          this.acciones.fijarSoloMirar(false);
          this.acciones.terminarPartida();
        }],
      ],
      'final',
    );
  }
}
