// Aquí está el GUION DEL PISO 3. Por ahora solo cierra la libreta de Andrés: cuando ya leí su cuaderno y las
// dos hojas que le arrancaron (en cualquier orden), marco 'imitacion:piso3' (la regla del paquete: desde ahí
// la criatura imita completo) y, de vuelta en el piso, digo lo que se nota al ponerlas juntas.
// Lo demás del guion (el golpe al llegar, el apagón al completar la libreta, la criatura en el pasillo) llega
// en la tanda siguiente. Todo se basa en banderas, así funciona igual al cargar partida.
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { GuionPiso } from '../TiposPiso';

/** Las tres partes de la libreta: el cuaderno del 302 y las dos hojas que le arrancaron. */
export const PARTES_LIBRETA = ['libreta_302', 'hoja_301', 'hoja_303'] as const;
/** La bandera que cierra la libreta. Con ella la criatura llega a la imitación completa. */
export const LIBRETA_COMPLETA = 'imitacion:piso3';
/** Lo que pienso al juntar las tres: la letra de la última página no es la de las otras. */
export const REFLEXION_LIBRETA = 'Las hojas son del mismo cuaderno. La última página no la escribió Andrés.';
/** Segundos de juego (no de lectura: leyendo no corre) entre cerrar la última parte y la reflexión. */
const PAUSA_REFLEXION = 1.2;

export class GuionPiso3 implements GuionPiso {
  private readonly cancelaciones: Array<() => void> = [];
  /** Cuenta atrás hasta la reflexión. Negativa: no hay nada que decir. */
  private reflexion = -1;

  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('bandera', ({ nombre }) => {
        if (nombre.startsWith('leyo:')) this.revisarLibreta(ctx, true);
      }),
    );
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones.splice(0)) cancelar();
  }

  reiniciar(ctx: ContextoJuego): void {
    this.reflexion = -1;
    // Leer la última parte puede crear un punto de control, y el juego guarda ANTES de que yo oiga la bandera:
    // esa partida llega con las tres leídas y sin 'imitacion:piso3'. La marco aquí, en silencio (al cargar no
    // hay nada nuevo que anunciar: el juego anuncia el objetivo después de reiniciarme).
    this.revisarLibreta(ctx, false);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    if (this.reflexion < 0) return;
    this.reflexion -= dt;
    if (this.reflexion < 0) ctx.bus.emit('subtitulo', { texto: REFLEXION_LIBRETA, duracion: 5 });
  }

  /** Si ya están leídas las tres partes y la libreta no está cerrada, la cierro. */
  private revisarLibreta(ctx: ContextoJuego, enVivo: boolean): void {
    const p = ctx.progreso;
    if (p.tiene(LIBRETA_COMPLETA) || !PARTES_LIBRETA.every((id) => p.tiene(`leyo:${id}`))) return;
    if (!enVivo) {
      p.marcarSilencioso(LIBRETA_COMPLETA);
      return;
    }
    p.marcar(LIBRETA_COMPLETA);
    this.reflexion = PAUSA_REFLEXION;
  }
}
