// Aquí está el GUION DEL PISO 2 (P2-guion). Lo que pasa siempre:
// - Grabar el cuarto sordo (medido:202) y su cinta: silencio, la voz de Hernando desde los colchones y algo de metal
//   que cae. Al terminar la cinta (cinta:202) aparece la llave de servicio en el rincón de la sala.
// - El final: con la llave, el botón del 1 lleva la cabina hacia abajo. El Piso 1 todavía no existe: cuando la
//   cabina llega ('ascensor-fin-recorrido'), la imagen se va a negro, las puertas se abren a la portería a oscuras
//   y la partida termina ("Próximamente: Piso 1").
// Lo que falta del P2-guion (tandas siguientes): el cuarto sordo de verdad (el sonido no pasa por los colchones) y
// la cabina que se detiene entre pisos con ella encima.
// Todo se basa en banderas, así funciona igual al cargar partida.
import type { AccionesGuion } from '../../narrativa/AccionesGuion';
import { reproducirCinta } from '../../narrativa/Cinta';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { GuionPiso } from '../TiposPiso';

/** Terminó de sonar la cinta del cuarto sordo: con ella aparece la llave de servicio. */
export const CINTA_202 = 'cinta:202';
/** Empezó el final, en la cabina: la partida termina. */
export const FINAL_PISO_2 = 'final:piso2';
/** Lo que se oye al llegar abajo, ya a oscuras. */
export const PUERTAS_ABAJO = '[Las puertas se abren. Abajo, la portería está a oscuras]';

export class GuionPiso2 implements GuionPiso {
  private readonly cancelaciones: Array<() => void> = [];
  private enFinal = false;

  constructor(private readonly acciones: AccionesGuion) {}

  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('bandera', ({ nombre }) => {
        if (nombre === 'medido:202') reproducirCinta('202', ctx, () => ctx.progreso.marcar(CINTA_202));
      }),
      ctx.bus.on('ascensor-fin-recorrido', () => this.final(ctx)),
    );
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones.splice(0)) cancelar();
  }

  reiniciar(ctx: ContextoJuego): void {
    this.enFinal = false;
    // Medir guarda antes de que suene la cinta: si cargo ahí, la cinta ya "sonó" (y la llave ya está en el rincón).
    if (ctx.progreso.tiene('medido:202') && !ctx.progreso.tiene(CINTA_202)) ctx.progreso.marcarSilencioso(CINTA_202);
  }

  actualizar(): void {}

  /** La cabina llegó abajo: a negro, las puertas se abren a la portería y la partida termina. */
  private final(ctx: ContextoJuego): void {
    if (this.enFinal) return;
    this.enFinal = true;
    ctx.progreso.marcar(FINAL_PISO_2);
    ctx.director.bloquear(60);
    ctx.director.activo = false;
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
    this.acciones.fijarSoloMirar(true);
    const puerta = ctx.nivel.ascensor?.marco;
    ctx.programador.secuencia(
      [
        [0.6, () => this.acciones.fundido(true, 1.4)],
        [2.2, () => {
          if (puerta) ctx.audio.reproducir('puertas_ascensor', { posicion: { x: puerta.cx, y: 1.2, z: puerta.cz }, volumen: 0.8 });
          ctx.bus.emit('subtitulo', { texto: PUERTAS_ABAJO, duracion: 4, tipo: 'efecto' });
        }],
        [6.0, () => {
          this.acciones.fijarSoloMirar(false);
          this.acciones.terminarPartida();
        }],
      ],
      'final',
    );
  }
}
