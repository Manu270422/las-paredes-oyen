// Aquí junto las escaleras que se caminan de un piso: cada hueco con su lógica (EscaleraCaminable), qué tramo lleva
// a qué piso (las `escaleras` del paquete, según de qué lado de la boca arrancan) y si un tramo está cerrado (la reja
// con cadena mientras no se abra; las tablas y los escombros, siempre). El nivel me consulta para el jugador (lo que
// pisa, lo que lo frena, cuándo cruza a otro piso) y para la criatura (por qué celdas del pozo puede seguirlo).
import { CONFIG } from '../config/ConfiguracionJuego';
import type { DefEscaleraPiso, PaquetePiso } from '../pisos/TiposPiso';
import type { CajaColision } from './Colisiones';
import { EscaleraCaminable, type LadoTramo, type TramoPie } from './EscaleraCaminable';
import { encontrarHuecos, marcoDelHueco } from './HuecoEscalera';
import type { RejaEscalera } from './RejaEscalera';
import type { Rejilla } from './Rejilla';

/** Un tramo que sale de la boca: a qué piso lleva (si lleva a alguno) y qué lo cierra. */
interface Tramo {
  def: DefEscaleraPiso | null;
  /** La reja con cadena que tiene en la boca (se abre con su llave). */
  reja: RejaEscalera | null;
  /** Cerrado para siempre: tablas y escombros (el techo de arriba cedió) o una reja que no es de ningún tramo. */
  tapado: boolean;
}

interface Pozo {
  escalera: EscaleraCaminable;
  tramos: Record<LadoTramo, Tramo>;
}

/** Cruzar el descanso de un tramo que lleva a otro piso: adónde voy y dónde (en el marco del hueco) estaba. */
export interface CruceEscalera {
  def: DefEscaleraPiso;
  u: number;
  v: number;
  /** Hacia dónde miraba el hueco que dejo (para girarme igual si el del otro piso mira a otro lado). */
  angulo: number;
  /** Por dónde sigo en el otro piso: bajando del de arriba llego subiendo al de abajo, y al revés. */
  sigue: TramoPie;
}

export class PozosCaminables {
  private readonly pozos: Pozo[] = [];

  constructor(
    private readonly rejilla: Rejilla,
    piso: Pick<PaquetePiso, 'escaleras' | 'opcionesEscalera'>,
    rejas: readonly RejaEscalera[],
  ) {
    const C = CONFIG.celda;
    const rejaAbajo = piso.opcionesEscalera?.rejaAbajo !== false;
    const escombrosArriba = piso.opcionesEscalera?.escombrosArriba !== false;
    for (const hueco of encontrarHuecos(rejilla)) {
      const escalera = new EscaleraCaminable(marcoDelHueco(hueco, C), CONFIG.alturaTecho);
      const m = escalera.medidas;
      const defDe = (lado: LadoTramo) =>
        (piso.escaleras ?? []).find((d) => {
          const l = escalera.local(d.x * C, d.y * C);
          return l.v > -C && l.v <= 0.05 && l.u >= 0 && l.u <= m.ancho && escalera.ladoEn(l.u) === lado;
        }) ?? null;
      // La reja de un tramo es la que está en su boca (a menos de 1 m de la entrada del tramo de la izquierda).
      const entrada = escalera.aMundo(m.anchoTramo / 2, 0.09);
      const reja = rejas.find((r) => Math.hypot(r.posicion().x - entrada.x, r.posicion().z - entrada.z) < 1) ?? null;
      const baja = defDe('baja');
      this.pozos.push({
        escalera,
        tramos: {
          // Una reja que ningún tramo abre (abajo no hay piso todavía) queda cerrada para siempre.
          baja: { def: baja, reja: rejaAbajo ? reja : null, tapado: rejaAbajo && (!reja || !baja) },
          sube: { def: defDe('sube'), reja: null, tapado: escombrosArriba },
        },
      });
    }
  }

  /** El pozo junto al que estoy (dentro, o en su boca), o null. */
  private pozoEn(x: number, z: number): Pozo | null {
    for (const p of this.pozos) {
      const { u, v } = p.escalera.local(x, z);
      const m = p.escalera.medidas;
      if (u > -0.8 && u < m.ancho + 0.8 && v > -1.4 && v < m.fondo + 0.4) return p;
    }
    return null;
  }

  /** ¿Ese tramo está cerrado ahora? La reja, hasta que termina de abrirse; las tablas, siempre. */
  private cerrado(t: Tramo): boolean {
    return t.tapado || (t.reja !== null && !t.reja.abierta);
  }

  /** Por dónde voy después de moverme (ver EscaleraCaminable.siguiente). */
  siguiente(pie: TramoPie, x: number, z: number): TramoPie {
    return this.pozoEn(x, z)?.escalera.siguiente(pie, x, z) ?? 'piso';
  }

  /** A qué altura están mis pies (0 fuera de una escalera). */
  altura(pie: TramoPie, x: number, z: number): number {
    return this.pozoEn(x, z)?.escalera.altura(pie, x, z) ?? 0;
  }

  /** Lo que me frena dentro del pozo que tengo cerca (el ojo, un tramo cerrado, el tramo del piso vecino). */
  cajas(pie: TramoPie, x: number, z: number): readonly CajaColision[] {
    const p = this.pozoEn(x, z);
    if (!p) return [];
    return p.escalera.cajas(pie, { baja: this.cerrado(p.tramos.baja), sube: this.cerrado(p.tramos.sube) });
  }

  /** ¿Crucé el descanso hacia un tramo que lleva a otro piso? */
  cruce(pie: TramoPie, x: number, z: number): CruceEscalera | null {
    const p = this.pozoEn(x, z);
    const sentido = p?.escalera.cruce(pie, x, z);
    if (!p || !sentido) return null;
    const tramo = sentido === 'abajo' ? p.tramos.baja : p.tramos.sube;
    if (!tramo.def) return null;
    const { u, v } = p.escalera.local(x, z);
    return { def: tramo.def, u, v, angulo: p.escalera.marco.angulo, sigue: sentido === 'abajo' ? 'subiendo' : 'bajando' };
  }

  /** En el piso al que acabo de llegar: la escalera por la que se vuelve a `pisoId` (la que me trajo). */
  llegadaDesde(pisoId: string): EscaleraCaminable | null {
    const conTramo = this.pozos.find((p) => p.tramos.baja.def?.hacia === pisoId || p.tramos.sube.def?.hacia === pisoId);
    return (conTramo ?? this.pozos[0])?.escalera ?? null;
  }

  /**
   * ¿La criatura puede pisar esta celda del pozo siguiendo el tramo `lado`? Solo el tramo (si está abierto) y su
   * descanso: nunca cruza al otro tramo, que es el camino a otro piso. Fuera de un pozo, la rejilla decide.
   */
  pisableCriatura(gx: number, gy: number, lado: LadoTramo): boolean {
    if (!this.rejilla.esHueco(gx, gy)) return false;
    const C = CONFIG.celda;
    const x = this.rejilla.centro(gx);
    const z = this.rejilla.centro(gy);
    const p = this.pozoEn(x, z);
    if (!p || this.cerrado(p.tramos[lado])) return false;
    const { u, v } = p.escalera.local(x, z);
    const m = p.escalera.medidas;
    const enTramo = lado === 'baja' ? u < m.anchoTramo : u > m.ancho - m.anchoTramo;
    // Una celda cuyo centro cae en el descanso (o a menos de media celda de él) es del descanso.
    return enTramo || v >= m.inicioDescanso - C / 2;
  }

  /** El tramo por el que va quien camina con ese pie (para que la criatura siga al jugador por el mismo). */
  static ladoDe(pie: TramoPie): LadoTramo | null {
    return pie === 'bajando' ? 'baja' : pie === 'subiendo' ? 'sube' : null;
  }
}
