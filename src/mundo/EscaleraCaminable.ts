// Aquí está la escalera que se camina (propuesta C2 §1). El motor no tiene alturas: todo pasa en un plano, y el
// pozo de una escalera es el único lugar donde el suelo sube y baja. Esto es pura lógica (sin three.js), en el
// marco local del hueco (u a lo largo de la boca, v hacia el fondo), con las MISMAS medidas con que
// ConstructorEscalera dibuja los escalones: lo que se ve y lo que se pisa coinciden.
//
// Desde la boca, el tramo de la izquierda baja al descanso de abajo y el de la derecha sube al de arriba. En
// cada piso solo se caminan esos dos tramos y sus descansos: el resto del camino es del piso vecino. Al cruzar el
// descanso de lado a lado (hacia el otro tramo), cambio de piso: el pozo es idéntico en los dos, así que aparezco
// en el mismo punto del descanso del otro piso y sigo caminando (el descanso de abajo de un piso es el de arriba
// del piso de abajo).
//
// Mientras camino por un tramo, sé por cuál voy ("bajando" o "subiendo"): en el mismo punto del plano hay dos
// descansos, uno encima del otro, y lo que piso depende de por dónde llegué.
import type { CajaColision } from './Colisiones';
import { aMundo, type MarcoHueco } from './HuecoEscalera';

/** Contrahuellas por medio piso: 8 de ~17 cm, como en un edificio de verdad. */
export const ESCALONES = 8;
/** El borde del piso de la escalera, 2.5 cm antes del hueco: ahí va la baranda de la boca (apoyada, no flotando). */
export const BORDE_BOCA = -0.025;
/**
 * Cuánto tengo que pasar la mitad del descanso para cambiar de piso: medio metro entre ir y volver, así un paso
 * de duda en la mitad no me cambia de piso dos veces.
 */
const HISTERESIS = 0.25;

/** Por dónde voy: en el piso, por el tramo que baja (y su descanso) o por el que sube (y el suyo). */
export type TramoPie = 'piso' | 'bajando' | 'subiendo';
/** Los dos tramos que salen de la boca. */
export type LadoTramo = 'baja' | 'sube';

/** Las medidas de la escalera de un hueco, en metros. */
export interface MedidasEscalera {
  /** A lo ancho de la boca y hacia el fondo. */
  ancho: number;
  fondo: number;
  /** Altura de un piso entero (el descanso queda a la mitad). */
  alto: number;
  contrahuella: number;
  huella: number;
  /** Dónde empieza el descanso, desde la boca. */
  inicioDescanso: number;
  /** Ancho de cada tramo (el ojo queda entre los dos). */
  anchoTramo: number;
}

/** Las medidas de un hueco: dos tramos de 1.3 m (o lo que quepa) con el ojo en medio, huellas de ~24 cm. */
export function medidasEscalera(marco: MarcoHueco, alturaTecho: number): MedidasEscalera {
  const huella = Math.min(0.27, (marco.fondo - 0.9) / (ESCALONES - 1));
  return {
    ancho: marco.ancho,
    fondo: marco.fondo,
    alto: alturaTecho,
    contrahuella: alturaTecho / 2 / ESCALONES,
    huella,
    inicioDescanso: (ESCALONES - 1) * huella,
    anchoTramo: Math.min(1.3, (marco.ancho - 0.6) / 2),
  };
}

/** Un rectángulo del marco local: u de u0 a u1, v de v0 a v1. */
interface RectLocal {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export class EscaleraCaminable {
  readonly medidas: MedidasEscalera;

  constructor(readonly marco: MarcoHueco, alturaTecho: number) {
    this.medidas = medidasEscalera(marco, alturaTecho);
  }

  /** Paso un punto del mundo al marco local del hueco (lo contrario de `aMundo`). */
  local(x: number, z: number): { u: number; v: number } {
    const c = Math.cos(this.marco.angulo);
    const s = Math.sin(this.marco.angulo);
    const dx = x - this.marco.origenX;
    const dz = z - this.marco.origenZ;
    return { u: dx * c - dz * s, v: dx * s + dz * c };
  }

  /** ¿El punto está dentro del pozo (entre la boca y el fondo, de muro a muro)? */
  private dentro(u: number, v: number): boolean {
    const m = this.medidas;
    return v >= 0 && v <= m.fondo + 0.05 && u >= -0.05 && u <= m.ancho + 0.05;
  }

  /** El tramo que sale de la boca en esa u (a la izquierda baja, a la derecha sube). */
  ladoEn(u: number): LadoTramo {
    return u < this.medidas.ancho / 2 ? 'baja' : 'sube';
  }

  /** Por dónde voy ahora: en el piso hasta que entro a un tramo; dentro, sigo en el mismo hasta que salgo por la boca. */
  siguiente(tramo: TramoPie, x: number, z: number): TramoPie {
    const { u, v } = this.local(x, z);
    if (!this.dentro(u, v)) return 'piso';
    if (tramo !== 'piso') return tramo;
    return this.ladoEn(u) === 'baja' ? 'bajando' : 'subiendo';
  }

  /**
   * A qué altura están mis pies (0 = el piso de este nivel). En un escalón, su huella; en el descanso, medio piso
   * abajo o arriba según el tramo por el que llegué.
   */
  altura(tramo: TramoPie, x: number, z: number): number {
    if (tramo === 'piso') return 0;
    const { v } = this.local(x, z);
    const m = this.medidas;
    const sentido = tramo === 'bajando' ? -1 : 1;
    if (v < 0) return 0;
    if (v >= m.inicioDescanso) return (sentido * m.alto) / 2;
    const escalon = Math.min(ESCALONES - 1, Math.floor(v / m.huella) + 1);
    return sentido * escalon * m.contrahuella;
  }

  /**
   * ¿Crucé el descanso hacia el otro tramo? Bajando, al pasar a la mitad de la derecha sigo hacia el piso de abajo;
   * subiendo, al pasar a la de la izquierda, hacia el de arriba.
   */
  cruce(tramo: TramoPie, x: number, z: number): 'abajo' | 'arriba' | null {
    const { u, v } = this.local(x, z);
    const m = this.medidas;
    if (!this.dentro(u, v) || v < m.inicioDescanso) return null;
    if (tramo === 'bajando' && u > m.ancho / 2 + HISTERESIS) return 'abajo';
    if (tramo === 'subiendo' && u < m.ancho / 2 - HISTERESIS) return 'arriba';
    return null;
  }

  /**
   * Lo que no me deja pasar dentro del pozo, en cajas del mundo:
   * - el ojo entre los dos tramos, con sus barandas (la de la boca y la del descanso);
   * - la entrada de un tramo cerrado (la reja con cadena, o las tablas y los escombros);
   * - el tramo del piso vecino: bajando, el que sigue hacia abajo desde el descanso; subiendo, el que sigue hacia
   *   arriba. A esos se llega solo cruzando el descanso, y cruzarlo es cambiar de piso.
   */
  cajas(tramo: TramoPie, cerrado: Readonly<Record<LadoTramo, boolean>>): CajaColision[] {
    const m = this.medidas;
    const izquierda = { u0: 0, u1: m.anchoTramo };
    const derecha = { u0: m.ancho - m.anchoTramo, u1: m.ancho };
    const rects: RectLocal[] = [
      { u0: m.anchoTramo - 0.06, u1: m.ancho - m.anchoTramo + 0.06, v0: BORDE_BOCA - 0.02, v1: m.inicioDescanso + 0.05 },
    ];
    // La reja va a 9 cm de la boca y las tablas a 7: con una franja de 4 a 14 cm tapo las dos.
    if (cerrado.baja) rects.push({ ...izquierda, v0: 0.04, v1: 0.14 });
    if (cerrado.sube) rects.push({ ...derecha, v0: 0.04, v1: 0.14 });
    if (tramo === 'bajando') rects.push({ ...derecha, v0: 0, v1: m.inicioDescanso });
    if (tramo === 'subiendo') rects.push({ ...izquierda, v0: 0, v1: m.inicioDescanso });
    return rects.map((r) => this.aCaja(r));
  }

  /** Un punto del marco local en el mundo, mirando hacia donde mira el hueco (para colocarme al cambiar de piso). */
  aMundo(u: number, v: number): { x: number; z: number } {
    return aMundo(this.marco, u, v);
  }

  private aCaja(r: RectLocal): CajaColision {
    const esquinas = [
      aMundo(this.marco, r.u0, r.v0),
      aMundo(this.marco, r.u1, r.v0),
      aMundo(this.marco, r.u0, r.v1),
      aMundo(this.marco, r.u1, r.v1),
    ];
    return {
      minX: Math.min(...esquinas.map((p) => p.x)),
      maxX: Math.max(...esquinas.map((p) => p.x)),
      minZ: Math.min(...esquinas.map((p) => p.z)),
      maxZ: Math.max(...esquinas.map((p) => p.z)),
    };
  }
}
