// Aquí está el citófono de una portería (P1-guion: la regla nueva del Piso 1). Un panel en la pared con un botón por
// timbre del piso. Pulsar uno:
// - hace un clic bajito DONDE ESTOY: un ruido mío, pequeño (si ella está cerca, me oye; decisión del creador);
// - un momento después, su timbre suena lejos, tres veces: un ruido del entorno, fuerte, que ella oye desde los muros
//   y va a ver. Es un señuelo a distancia: como la grabadora, pero sin tener que dejarla en el piso;
// - y la línea queda ocupada un rato (decisión del creador): no se puede usar seguido, así no es un botón para
//   apagarla.
// Además, el guion puede hacerlo sonar SOLO: llaman desde una línea. Entonces el panel timbra aquí (eso no la atrae:
// la que llama es ella), la luz de esa línea parpadea y su botón dice "Contestar". Qué pasa al contestar o al dejarlo
// sonar lo decide el guion; contestar también es mi clic.
// Del mapa solo sé dónde suena cada timbre y qué dice su botón.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefInteractuable, DefTimbre } from '../../mundo/datos/TiposMapa';
import { GRADOS } from '../../utilidades/Matematicas';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';
import { ModeloCitofono, type VistaCitofono } from './ModeloCitofono';

/** Segundos que la línea queda ocupada después de timbrar. */
export const ESPERA_CITOFONO = 15;
/** Después de colgar una llamada contestada, la línea tarda un poco en liberarse. */
const ESPERA_TRAS_COLGAR = 3;
/** El clic del botón, donde estoy: menos que un paso caminando (0.38), un poco más que uno agachado (0.12). */
export const RUIDO_BOTON = 0.15;
/** El timbre, donde suena: fuerte, como la campanilla del ascensor; desde los muros se oye en casi todo el piso. */
export const RUIDO_TIMBRE = 0.8;
/** Cuántas veces suena el timbre por cada pulsación, y cada cuánto (s). */
export const TIMBRES_SEGUIDOS = 3;
const ENTRE_TIMBRES = 1.3;
/** Del clic al primer timbre (s): el tiempo que tarda la señal. */
const ANTES_DEL_TIMBRE = 0.5;
/** Una llamada que nadie contesta suena estas veces, cada tanto (s), y se calla. */
export const TIMBRES_ENTRANTES = 6;
const ENTRE_TIMBRES_ENTRANTES = 2.2;
/** Altura de un timbre si el mapa no la dice (m). */
const ALTURA_TIMBRE = 1.6;
/** Del tamaño del botón y un poco más (van a 10 cm uno de otro): con miedo, la mira tiembla. */
const RADIO_ZONA = 0.045;

export const TEXTO_OCUPADO = 'Línea ocupada';
export const TEXTO_CONTESTAR = 'Contestar';
export const SIGUE_OCUPADA = 'La línea sigue ocupada.';

/** Un botón del panel: su zona de toque. Lo que dice y lo que hace lo decide el panel. */
class BotonCitofono implements Interactuable {
  readonly objeto = new Group();

  constructor(
    readonly id: string,
    private readonly indice: number,
    private readonly panel: Citofono,
    posicion: { x: number; y: number; z: number },
  ) {
    this.objeto.add(crearZonaToque(RADIO_ZONA));
    this.objeto.position.set(posicion.x, posicion.y, posicion.z);
    vincular(this.objeto, this);
  }

  get activo(): boolean {
    return true;
  }

  texto(): string {
    return this.panel.textoBoton(this.indice);
  }

  interactuar(ctx: ContextoJuego): void {
    this.panel.pulsar(this.indice, ctx);
  }
}

/** Una llamada que entra: desde qué línea, cuántos timbres le quedan y qué hacer según lo que yo haga. */
interface Llamada {
  readonly boton: number;
  quedan: number;
  proximo: number;
  readonly alContestar: (ctx: ContextoJuego) => void;
  readonly alIgnorar: (ctx: ContextoJuego) => void;
}

export class Citofono {
  readonly id: string;
  /** La raíz del panel (no se enfoca: se enfocan sus botones). */
  readonly objeto = new Group();
  readonly botones: Interactuable[] = [];
  private readonly timbres: readonly DefTimbre[];
  private readonly vista: VistaCitofono;
  private espera = 0;
  private timbrando: { boton: number; quedan: number; proximo: number } | null = null;
  private entrante: Llamada | null = null;
  /** La línea que contesté (su botón), hasta que el guion cuelgue. */
  private enLinea: number | null = null;

  constructor(def: DefInteractuable, vista?: VistaCitofono) {
    this.id = def.id;
    this.timbres = def.timbres ?? [];
    if (this.timbres.length === 0) throw new Error(`El citófono "${def.id}" no tiene timbres.`);
    this.vista = vista ?? new ModeloCitofono(this.timbres.map((t) => t.rotulo));
    this.objeto.add(this.vista.grupo);
    this.objeto.position.set(def.x * CONFIG.celda, def.altura ?? 1.35, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    this.timbres.forEach((t, i) => {
      const boton = new BotonCitofono(`${def.id}:${t.id}`, i, this, this.vista.posicionBoton(i));
      this.botones.push(boton);
      this.objeto.add(boton.objeto);
    });
  }

  /** Nadie está timbrando, ni llamando, ni en la línea, y ya pasó la espera. */
  get libre(): boolean {
    return this.espera <= 0 && !this.timbrando && !this.entrante && this.enLinea === null;
  }

  /** ¿Está sonando una llamada que nadie contestó todavía? */
  get llamando(): boolean {
    return this.entrante !== null;
  }

  /** Dónde está el panel (m): de ahí escucha la línea cuando contesto. */
  get posicion(): { x: number; z: number } {
    return { x: this.objeto.position.x, z: this.objeto.position.z };
  }

  textoBoton(i: number): string {
    if (this.entrante) return i === this.entrante.boton ? TEXTO_CONTESTAR : TEXTO_OCUPADO;
    return this.libre ? this.timbres[i].texto : TEXTO_OCUPADO;
  }

  pulsar(i: number, ctx: ContextoJuego): void {
    const timbre = this.timbres[i];
    if (this.entrante && i === this.entrante.boton) {
      this.contestar(ctx);
      return;
    }
    if (!this.libre) {
      // Ocupado no hace nada (ni ruido): el indicador ya lo decía.
      ctx.bus.emit('subtitulo', { texto: SIGUE_OCUPADA, duracion: 2 });
      ctx.bus.emit('citofono', { accion: 'ocupado', timbre: timbre.id });
      return;
    }
    this.clic(ctx);
    this.timbrando = { boton: i, quedan: TIMBRES_SEGUIDOS, proximo: ANTES_DEL_TIMBRE };
    this.espera = ESPERA_CITOFONO;
    this.vista.fijarLuz(i, true);
    ctx.bus.emit('citofono', { accion: 'timbre', timbre: timbre.id });
  }

  /**
   * Suena SOLO: llaman desde la línea `idTimbre`. Devuelve false si esa línea no existe o el citófono no está libre
   * (quien llama puede volver a intentarlo).
   */
  llamarDesde(idTimbre: string, ctx: ContextoJuego, alContestar: (ctx: ContextoJuego) => void, alIgnorar: (ctx: ContextoJuego) => void): boolean {
    const boton = this.timbres.findIndex((t) => t.id === idTimbre);
    if (boton < 0 || !this.libre) return false;
    this.entrante = { boton, quedan: TIMBRES_ENTRANTES, proximo: 0, alContestar, alIgnorar };
    ctx.bus.emit('citofono', { accion: 'llamada', timbre: idTimbre });
    return true;
  }

  /** Cuelgo la línea que contesté (lo decide el guion): queda ocupada un momento. */
  colgar(ctx: ContextoJuego): void {
    if (this.enLinea === null) return;
    const id = this.timbres[this.enLinea].id;
    this.vista.fijarLuz(this.enLinea, false);
    this.enLinea = null;
    this.espera = Math.max(this.espera, ESPERA_TRAS_COLGAR);
    ctx.bus.emit('citofono', { accion: 'colgada', timbre: id });
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    if (this.espera > 0) this.espera = Math.max(0, this.espera - dt);
    const t = this.timbrando;
    if (t) {
      t.proximo -= dt;
      if (t.proximo <= 0) {
        this.sonarTimbre(t.boton, ctx, t.quedan === TIMBRES_SEGUIDOS);
        t.quedan--;
        t.proximo = ENTRE_TIMBRES;
        if (t.quedan <= 0) {
          this.timbrando = null;
          this.vista.fijarLuz(t.boton, false);
        }
      }
    }
    const e = this.entrante;
    if (e) {
      e.proximo -= dt;
      if (e.proximo <= 0 && e.quedan <= 0) {
        // Nadie contestó: se calla.
        this.entrante = null;
        this.vista.fijarLuz(e.boton, false);
        ctx.bus.emit('citofono', { accion: 'ignorada', timbre: this.timbres[e.boton].id });
        e.alIgnorar(ctx);
      } else {
        if (e.proximo <= 0) {
          this.timbrarAqui(ctx, e.quedan === TIMBRES_ENTRANTES);
          e.quedan--;
          e.proximo = ENTRE_TIMBRES_ENTRANTES;
        }
        // La luz de la línea que llama parpadea al ritmo del timbre.
        this.vista.fijarLuz(e.boton, e.proximo > ENTRE_TIMBRES_ENTRANTES / 2);
      }
    }
    this.vista.fijarOcupado(!this.libre);
  }

  /** Al cargar: todo apagado y libre. Una llamada a medias se pierde (el guion decide si vuelve). */
  restablecer(): void {
    this.espera = 0;
    this.timbrando = null;
    this.entrante = null;
    this.enLinea = null;
    this.timbres.forEach((_, i) => this.vista.fijarLuz(i, false));
    this.vista.fijarOcupado(false);
  }

  private contestar(ctx: ContextoJuego): void {
    const llamada = this.entrante;
    if (!llamada) return;
    this.entrante = null;
    this.enLinea = llamada.boton;
    this.clic(ctx);
    this.vista.fijarLuz(llamada.boton, true);
    ctx.bus.emit('citofono', { accion: 'contestada', timbre: this.timbres[llamada.boton].id });
    llamada.alContestar(ctx);
  }

  /** El clic del botón: se oye en el panel y es un ruido mío, pequeño, donde estoy. */
  private clic(ctx: ContextoJuego): void {
    const p = this.objeto.position;
    const j = ctx.jugador.posicion;
    ctx.audio.reproducir('clic', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.5, tono: 0.8 });
    ctx.bus.emit('ruido', { x: j.x, z: j.z, intensidad: RUIDO_BOTON, origen: 'jugador', causa: 'citofono' });
  }

  /** El timbre de una línea, donde está: fuerte, y ella lo oye. */
  private sonarTimbre(i: number, ctx: ContextoJuego, primero: boolean): void {
    const t = this.timbres[i];
    const x = t.x * CONFIG.celda;
    const z = t.y * CONFIG.celda;
    ctx.audio.reproducir('timbre', { posicion: { x, y: t.altura ?? ALTURA_TIMBRE, z }, volumen: 0.9 });
    ctx.bus.emit('ruido', { x, z, intensidad: RUIDO_TIMBRE, origen: 'entorno', causa: 'citofono' });
    if (primero) ctx.bus.emit('sonido-relevante', { descripcion: t.suena, x, z });
  }

  /** Una llamada que entra: el panel timbra aquí. No es un ruido para ella (la que llama es ella). */
  private timbrarAqui(ctx: ContextoJuego, primero: boolean): void {
    const p = this.objeto.position;
    ctx.audio.reproducir('timbre', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.75, tono: 1.12 });
    if (primero) ctx.bus.emit('sonido-relevante', { descripcion: 'el citófono suena', x: p.x, z: p.z });
  }
}
