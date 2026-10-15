// Aquí está el GUION DEL PISO 2 (P2-guion). Lo que pasa siempre:
// - La primera vez que entro a un cuarto acolchado: lo que noto (no se oye nada de afuera) y, si la dificultad da
//   pistas, la regla entera (ella tampoco me oye; si entra, solo la delatan las luces). La regla vive en el motor
//   (mundo/Aislamiento.ts y el estado de ella en las paredes); aquí solo se cuenta.
// - Grabar el cuarto sordo (medido:202) y su cinta: silencio, la voz de Hernando desde los colchones y algo de metal
//   que cae. Al terminar la cinta (cinta:202) aparece la llave de servicio en el rincón de la sala.
// - El final: con la llave, el botón del 1 lleva la cabina hacia abajo. Bajando, se detiene entre pisos con ella
//   encima (cabinaDetenida.ts): quieto y sin aire. Si aguanto, el piso queda completado y la cabina sigue al Piso 1.
// Todo se basa en banderas, así funciona igual al cargar partida.
import type { AccionesGuion } from '../../narrativa/AccionesGuion';
import { reproducirCinta } from '../../narrativa/Cinta';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { GuionPiso } from '../TiposPiso';
import { CabinaDetenida } from './cabinaDetenida';

/** Terminó de sonar la cinta del cuarto sordo: con ella aparece la llave de servicio. */
export const CINTA_202 = 'cinta:202';
/** Superé la cabina detenida: el piso queda completado y la cabina sigue bajando al 1. */
export const FINAL_PISO_2 = 'final:piso2';
/** Ya entré una vez a un cuarto acolchado (no se repite lo que noto). */
export const SORDO_VISTO = 'sordo:visto';
/** Lo que noto la primera vez. Solo la mitad de la regla: la otra mitad la dice el cuaderno de Hernando. */
export const PRIMER_CUARTO_SORDO = 'Colchones clavados en todas las paredes. Aquí adentro no se oye nada de afuera.';
/** La regla entera, para quien juega con pistas. */
export const PISTA_CUARTO_SORDO = 'En un cuarto acolchado no la oyes, y ella tampoco a ti. Si entra, solo la delatan la linterna y las lámparas.';

export class GuionPiso2 implements GuionPiso {
  private readonly cancelaciones: Array<() => void> = [];
  /** El clímax: la cabina que se detiene entre el 2 y el 1 con ella encima. Superarla completa el piso. */
  private readonly cabina = new CabinaDetenida((ctx) => {
    ctx.progreso.marcar(FINAL_PISO_2);
    this.acciones.completarPiso();
  });

  constructor(private readonly acciones: AccionesGuion) {}

  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('bandera', ({ nombre }) => {
        if (nombre === 'medido:202') reproducirCinta('202', ctx, () => ctx.progreso.marcar(CINTA_202));
      }),
    );
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones.splice(0)) cancelar();
    this.cabina.reiniciar();
  }

  reiniciar(ctx: ContextoJuego): void {
    this.cabina.reiniciar();
    // Medir guarda antes de que suene la cinta: si cargo ahí, la cinta ya "sonó" (y la llave ya está en el rincón).
    if (ctx.progreso.tiene('medido:202') && !ctx.progreso.tiene(CINTA_202)) ctx.progreso.marcarSilencioso(CINTA_202);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.cabina.actualizar(dt, ctx);
    const j = ctx.jugador.posicion;
    if (ctx.progreso.tiene(SORDO_VISTO) || !ctx.nivel.acolchadoEn(j.x, j.z)) return;
    ctx.progreso.marcarSilencioso(SORDO_VISTO);
    ctx.bus.emit('subtitulo', { texto: PRIMER_CUARTO_SORDO, duracion: 5 });
    ctx.bus.emit('pista', { id: 'cuartoSordo', texto: PISTA_CUARTO_SORDO });
  }
}
