// Aquí está el tramo de escalera que lleva a otro piso: lo que pulso al asomarme a un tramo para bajar o
// subir. No tiene modelo propio (la escalera ya la dibuja ConstructorEscalera): pongo una zona de toque
// invisible sobre los primeros escalones y, al pulsarla, le pido el viaje al juego. El piso de destino y
// dónde aparezco son datos del paquete del piso (sus `escaleras`); yo no conozco ningún piso.
//
// Un tramo puede estar cerrado (la reja con cadena): hasta que exista su bandera, suena la cerradura y lo
// digo con un subtítulo. Sacudir una reja hace ruido: la criatura lo oye como una puerta. Si tiene su reja
// enlazada, con la llave la primera vez la ABRO (candado, cadena, chirrido: ver RejaEscalera) y queda abierta
// para siempre (bandera "abierta:<id>"); desde ahí, E baja.
//
// Mientras ella caza, la escalera tampoco me deja pasar: la cadena se traba. El viaje de hoy es un fundido
// instantáneo, y pulsar E a la carrera sería una huida gratis que nadie diseñó. Cuando la escalera se camine,
// la huida tendrá su costo (unos segundos expuesto) y esto se podrá quitar.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { RejaEscalera } from '../../mundo/RejaEscalera';
import type { DefEscaleraPiso } from '../../pisos/TiposPiso';
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
const PREFIJO_OBJETO = 'objeto:';

/**
 * ¿Se cumple lo que pide el tramo? Si pide un objeto, miro el bolsillo: la bandera "objeto:" se queda en el piso
 * donde lo tomé, pero el objeto viaja conmigo.
 */
function cumple(ctx: ContextoJuego, requiere: string): boolean {
  if (ctx.progreso.tiene(requiere)) return true;
  return requiere.startsWith(PREFIJO_OBJETO) && ctx.progreso.tieneObjeto(requiere.slice(PREFIJO_OBJETO.length));
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
    ctx.viaje.cambiarDePiso(hacia, llegada);
  }

  /** Al cargar o al armar el piso: mi reja, abierta si ya la abrí. */
  restablecer(ctx: ContextoJuego): void {
    this.reja?.fijar(ctx.progreso.tiene(this.banderaAbierta));
  }

  /** Suena la cadena, lo digo con un subtítulo y hace ruido (la criatura lo oye como una puerta). No viajo. */
  private trabarse(ctx: ContextoJuego, texto: string, tipo?: 'efecto'): void {
    const p = this.objeto.position;
    ctx.audio.reproducir('cerradura', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.8 });
    ctx.bus.emit('subtitulo', { texto, duracion: 2.5, tipo });
    ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.25, origen: 'puerta', causa: 'puerta' });
  }
}
