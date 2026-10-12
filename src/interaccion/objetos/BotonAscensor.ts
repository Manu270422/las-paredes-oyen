// Aquí están los botones del ascensor: el de llamarlo (afuera, junto a las puertas) y los del panel (adentro, uno
// por piso al que lleva). No tienen modelo propio (lo dibuja ModeloAscensor): pongo una zona de toque pequeña sobre
// cada uno y, al pulsarla, le aviso al ascensor. Lo que pasa después (si viene, si cierra, si viaja) lo decide él.
import { Group } from 'three';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';

/** Lo que un botón le pide al ascensor sin conocerlo. */
export interface MandoAscensor {
  /** ¿Se puede pulsar este botón ahora? */
  disponible(boton: BotonAscensor, ctx: ContextoJuego): boolean;
  pulsar(boton: BotonAscensor, ctx: ContextoJuego): void;
}

/** Pequeña: los botones están pegados, y el cono de asistencia ya ayuda en táctil. */
const RADIO_ZONA = 0.07;

export class BotonAscensor implements Interactuable {
  readonly objeto = new Group();

  /**
   * `hacia`: el piso al que lleva (un botón del panel) o null (el de llamar). La posición va en metros; `celda`, la
   * de la cabina si el botón está adentro (sus puertas cerradas no deben taparlo).
   */
  constructor(
    readonly id: string,
    readonly hacia: string | null,
    private readonly rotulo: string,
    posicion: { x: number; y: number; z: number },
    private readonly mando: MandoAscensor,
    readonly celdaPropia?: { readonly gx: number; readonly gy: number },
  ) {
    this.objeto.add(crearZonaToque(RADIO_ZONA));
    this.objeto.position.set(posicion.x, posicion.y, posicion.z);
    vincular(this.objeto, this);
  }

  get activo(): boolean {
    return true;
  }

  enfocable(ctx: ContextoJuego): boolean {
    return this.mando.disponible(this, ctx);
  }

  texto(): string {
    return this.rotulo;
  }

  interactuar(ctx: ContextoJuego): void {
    this.mando.pulsar(this, ctx);
  }
}
