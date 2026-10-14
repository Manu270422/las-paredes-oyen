// Aquí está el tramo de escalera que lleva a otro piso: lo que pulso al asomarme a un tramo para bajar o
// subir. No tiene modelo propio (la escalera ya la dibuja ConstructorEscalera): pongo una zona de toque
// invisible sobre los primeros escalones y, al pulsarla, le pido el viaje al juego. El piso de destino y
// dónde aparezco son datos del paquete del piso (sus `escaleras`); yo no conozco ningún piso.
//
// Un tramo puede estar cerrado (la reja con cadena): hasta que exista su bandera, suena la cerradura y lo
// digo con un subtítulo. Sacudir una reja hace ruido: la criatura lo oye como una puerta. Si tiene su reja
// enlazada, con la llave la primera vez la ABRO (candado, cadena, chirrido: ver RejaEscalera) y queda abierta
// para siempre (bandera "abierta:<id>"); desde ahí, E baja. Si el paquete dice `seAbreCon`, mi reja también se
// abre sola cuando se marca esa bandera (el final del Piso 3: alguien abrió desde abajo).
//
// Lo normal es que la escalera se camine (EscaleraCaminable): entonces no viajo con E. Solo respondo mientras mi
// reja esté cerrada (revisarla, o abrirla con la llave); abierta, se baja caminando. Con el ajuste "Escaleras con
// fundido" (accesibilidad), E me lleva con un fundido, como antes, y mientras ella caza la cadena se traba: ese
// viaje es instantáneo, y pulsar E a la carrera sería una huida gratis. Caminando, huir tiene su costo: unos
// segundos expuesto en el tramo, y ella puede seguirme hasta el descanso.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { RejaEscalera } from '../../mundo/RejaEscalera';
import type { DefEscaleraPiso } from '../../pisos/TiposPiso';
import { cumpleRequisito } from '../../narrativa/Requisito';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';

/** La zona queda a la altura de la cintura: ahí cae la mirada al asomarse a un tramo. */
const ALTURA_ZONA = 0.9;
/** Generosa (como la de las pilas): apuntar a "la escalera" no debería costar. */
const RADIO_ZONA = 0.5;
const TEXTO_CERRADA = 'Por aquí no se puede pasar.';
const TEXTO_EN_CAZA = '[La cadena se traba]';
const TEXTO_ABRIR = 'Abrir el candado';
/** Con la reja cerrada y sin la llave, "Bajar al Piso 3" prometía algo que no pasa (lo dijo el creador al jugarlo). */
const TEXTO_REVISAR = 'Revisar la reja';

/** ¿Se cumple lo que pide el tramo? (Si pide un objeto, lo que cuenta es tenerlo en el bolsillo.) */
function cumple(ctx: ContextoJuego, requiere: string): boolean {
  return cumpleRequisito(ctx.progreso, requiere);
}

export class TramoEscalera implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  /** La reja que tengo delante (la que se abre con mi llave), si hay una. */
  private reja: RejaEscalera | null = null;

  constructor(private readonly def: DefEscaleraPiso) {
    this.id = def.id;
    this.objeto.add(crearZonaToque(RADIO_ZONA));
    this.objeto.position.set(def.x * CONFIG.celda, ALTURA_ZONA, def.y * CONFIG.celda);
    vincular(this.objeto, this);
  }

  /** Mientras la reja se abre no respondo (el momento se ve hasta el final). */
  get activo(): boolean {
    return !this.reja?.abriendo;
  }

  /** Caminando, solo respondo con la reja cerrada (no hay viaje con E); con fundido, siempre. */
  enfocable(ctx: ContextoJuego): boolean {
    return ctx.ajustes.valores.escalerasConFundido || (!!this.reja && !this.reja.abierta);
  }

  enlazarReja(reja: RejaEscalera): void {
    this.reja = reja;
  }

  /** La bandera que dice que abrí mi reja (es del piso: la reja de este piso). */
  private get banderaAbierta(): string {
    return `abierta:${this.id}`;
  }

  /** Con la llave y la reja todavía cerrada, lo que hago es abrirla; sin la llave, revisarla; si no, lo que dice el paquete. */
  texto(ctx: ContextoJuego): string {
    if (this.porAbrir(ctx)) return TEXTO_ABRIR;
    const { requiere } = this.def;
    if (this.reja && !this.reja.abierta && requiere && !cumple(ctx, requiere)) return TEXTO_REVISAR;
    return this.def.texto;
  }

  private porAbrir(ctx: ContextoJuego): boolean {
    const { requiere } = this.def;
    return !!this.reja && !this.reja.abierta && !!requiere && cumple(ctx, requiere);
  }

  interactuar(ctx: ContextoJuego): void {
    const { requiere, cerrada, hacia, llegada } = this.def;
    if (ctx.entidad.estado === 'cazando') {
      this.trabarse(ctx, TEXTO_EN_CAZA, 'efecto');
      return;
    }
    if (requiere && !cumple(ctx, requiere)) {
      this.trabarse(ctx, cerrada ?? TEXTO_CERRADA);
      return;
    }
    if (this.porAbrir(ctx)) {
      this.reja!.abrir(() => ctx.progreso.marcar(this.banderaAbierta));
      return;
    }
    if (ctx.ajustes.valores.escalerasConFundido) ctx.viaje.cambiarDePiso(hacia, llegada);
  }

  /** Al cargar o al armar el piso: mi reja, abierta si ya la abrí (o si ya pasó lo que la abre sola). */
  restablecer(ctx: ContextoJuego): void {
    const { seAbreCon } = this.def;
    this.reja?.fijar(ctx.progreso.tiene(this.banderaAbierta) || (!!seAbreCon && ctx.progreso.tiene(seAbreCon)));
  }

  /** Si mi reja se abre sola con esta bandera, la abro: sin llave, el candado cede y la cadena cae. */
  alBandera(nombre: string, ctx: ContextoJuego): void {
    if (!this.reja || nombre !== this.def.seAbreCon) return;
    this.reja.abrir(() => ctx.progreso.marcar(this.banderaAbierta), true);
  }

  /** Suena la cadena, lo digo con un subtítulo y hace ruido (la criatura lo oye como una puerta). No viajo. */
  private trabarse(ctx: ContextoJuego, texto: string, tipo?: 'efecto'): void {
    const p = this.objeto.position;
    ctx.audio.reproducir('cerradura', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.8 });
    ctx.bus.emit('subtitulo', { texto, duracion: 2.5, tipo });
    ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.25, origen: 'puerta', causa: 'puerta' });
  }
}
