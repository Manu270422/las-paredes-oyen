// Aquí está el tramo de escalera que lleva a otro piso: lo que pulso al asomarme a un tramo para bajar o
// subir. No tiene modelo propio (la escalera ya la dibuja ConstructorEscalera): pongo una zona de toque
// invisible sobre los primeros escalones y, al pulsarla, le pido el viaje al juego. El piso de destino y
// dónde aparezco son datos del paquete del piso (sus `escaleras`); yo no conozco ningún piso.
//
// Un tramo puede estar cerrado (la reja con cadena): hasta que exista su bandera, suena la cerradura y lo
// digo con un subtítulo. Sacudir una reja hace ruido: la criatura lo oye como una puerta.
import { Group } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { DefEscaleraPiso } from '../../pisos/TiposPiso';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';

/** La zona queda a la altura de la cintura: ahí cae la mirada al asomarse a un tramo. */
const ALTURA_ZONA = 0.9;
/** Generosa (como la de las pilas): apuntar a "la escalera" no debería costar. */
const RADIO_ZONA = 0.5;
const TEXTO_CERRADA = 'Por aquí no se puede pasar.';

export class TramoEscalera implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  readonly activo = true;

  constructor(private readonly def: DefEscaleraPiso) {
    this.id = def.id;
    this.objeto.add(crearZonaToque(RADIO_ZONA));
    this.objeto.position.set(def.x * CONFIG.celda, ALTURA_ZONA, def.y * CONFIG.celda);
    vincular(this.objeto, this);
  }

  texto(): string {
    return this.def.texto;
  }

  interactuar(ctx: ContextoJuego): void {
    const { requiere, cerrada, hacia, llegada } = this.def;
    if (requiere && !ctx.progreso.tiene(requiere)) {
      const p = this.objeto.position;
      ctx.audio.reproducir('cerradura', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.8 });
      ctx.bus.emit('subtitulo', { texto: cerrada ?? TEXTO_CERRADA, duracion: 2.5 });
      ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.25, origen: 'puerta', causa: 'puerta' });
      return;
    }
    ctx.viaje.cambiarDePiso(hacia, llegada);
  }
}
