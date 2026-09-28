// Aquí vigilo si el jugador llegó a VER algo que el director cambió.
// La mayoría de cambios (una puerta, una silla) ocurren fuera de su vista a
// propósito. Lo que quiero saber es si después miró hacia allá: si nadie ve
// nunca la silla girada, ese evento no está haciendo su trabajo.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import { anguloDesdeMirada, mitadCampoHorizontal, puertasQueTapan } from '../director/Visibilidad';

/** Segundos que espero a que lo vea antes de darlo por "no visto". */
const LIMITE = 45;
/** Más lejos de esto, en la oscuridad, no cuenta como visto. */
const DISTANCIA_MAXIMA = 12;

export class VigilanciaEvento {
  private transcurrido = 0;

  constructor(
    readonly id: string,
    private readonly x: number,
    private readonly z: number,
  ) {}

  /**
   * Devuelvo 'visto' (con los segundos que tardó), 'no-visto' si se acabó el
   * tiempo, o null si sigo esperando.
   */
  revisar(dt: number, ctx: ContextoJuego): { resultado: 'visto' | 'no-visto'; tras: number } | null {
    this.transcurrido += dt;
    if (this.estaMirando(ctx)) return { resultado: 'visto', tras: this.transcurrido };
    if (this.transcurrido >= LIMITE) return { resultado: 'no-visto', tras: this.transcurrido };
    return null;
  }

  /** ¿Está mirando hacia el punto, cerca y sin muros en medio? */
  private estaMirando(ctx: ContextoJuego): boolean {
    const c = ctx.camara.position;
    const dx = this.x - c.x;
    const dz = this.z - c.z;
    const largo = Math.hypot(dx, dz);
    if (largo > DISTANCIA_MAXIMA) return false;
    if (anguloDesdeMirada(ctx, this.x, 1.1, this.z) > mitadCampoHorizontal(ctx) * 0.9) return false;
    if (largo < 0.8) return true;
    // Acorto el rayo: el punto puede estar DENTRO de un muro o en una puerta cerrada.
    const f = (largo - 0.7) / largo;
    return ctx.nivel.rejilla.hayLineaDeVision(c.x, c.z, c.x + dx * f, c.z + dz * f, puertasQueTapan(ctx, this.x, this.z));
  }
}
