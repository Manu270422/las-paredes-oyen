// Aquí está el GUION DEL PISO 1 (P1-guion). Lo que pasa siempre:
// - Al llegar en la cabina: cuando se abren las puertas, su tubo revienta y el ascensor se queda sin corriente. De
//   aquí no se vuelve a subir (la escalera también está tapada).
// - El final: cuando la puerta principal termina de abrirse (sus tres cerraduras), salgo. Afuera llueve; a mi
//   espalda, en el cuarto piso, una ventana tiene luz: la del 401. "Sobreviviste".
// Lo que falta del P1-guion (tandas siguientes): el citófono (el señuelo, y ella llamando con voces).
// Todo se basa en banderas, así funciona igual al cargar partida.
import type { AccionesGuion } from '../../narrativa/AccionesGuion';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { GuionPiso } from '../TiposPiso';

/** La puerta principal se abrió del todo (la marca la puerta al abrir su última cerradura). */
export const PUERTA_ABIERTA = 'puerta:abierta';
/** El ascensor se quedó sin corriente al llegar (con esta bandera revienta su tubo, ver el paquete). */
export const SIN_CORRIENTE = 'ascensor:sin_corriente';
/** Lo que se oye al abrirse la puerta. BORRADOR: lo revisa el creador. */
export const AFUERA_LLUEVE = '[La puerta se abre. Afuera llueve]';
/** El título del final del juego. */
export const SOBREVIVISTE = 'Sobreviviste';
/** Lo último que se lee, sobre el negro. BORRADOR: lo revisa el creador. */
export const LA_VENTANA_DEL_401 = 'A tu espalda, en el cuarto piso, una ventana tiene luz: la del 401.';

export class GuionPiso1 implements GuionPiso {
  private readonly cancelaciones: Array<() => void> = [];
  private enFinal = false;

  constructor(private readonly acciones: AccionesGuion) {}

  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('bandera', ({ nombre }) => {
        if (nombre === PUERTA_ABIERTA) this.salir(ctx);
      }),
    );
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones.splice(0)) cancelar();
  }

  reiniciar(): void {
    this.enFinal = false;
  }

  actualizar(_dt: number, ctx: ContextoJuego): void {
    // Las puertas de la cabina se abrieron al llegar: el tubo revienta y el ascensor muere.
    const ascensor = ctx.nivel.ascensor;
    if (!ascensor || ctx.progreso.tiene(SIN_CORRIENTE) || ascensor.fase !== 'abierto') return;
    const luz = ctx.nivel.lamparas.find((l) => l.id === 'luzAscensor');
    if (luz) {
      const p = luz.posicion;
      luz.interferir(0.3);
      ctx.audio.reproducir('chispa', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.8 });
      ctx.bus.emit('sonido-relevante', { descripcion: 'el tubo de la cabina revienta', x: p.x, z: p.z });
    }
    ctx.progreso.marcar(SIN_CORRIENTE);
    // Las luces de una bandera se aplican solas al cargar; en vivo, las pide el guion (como el apagón del Piso 3).
    ctx.programador.despues(0.3, () => ctx.nivel.aplicarLuzDe(SIN_CORRIENTE));
  }

  /** La puerta se abrió del todo: afuera llueve, la ventana del 401 y la pantalla final. */
  private salir(ctx: ContextoJuego): void {
    if (this.enFinal) return;
    this.enFinal = true;
    ctx.director.bloquear(60);
    ctx.director.activo = false;
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
    this.acciones.fijarSoloMirar(true);
    const puerta = ctx.nivel.salidas[0]?.objeto.position;
    ctx.programador.secuencia(
      [
        [0.4, () => {
          if (puerta) {
            ctx.audio.reproducir('viento', { posicion: { x: puerta.x, y: 1.4, z: puerta.z }, volumen: 0.8 });
            ctx.audio.reproducir('goteo', { posicion: { x: puerta.x, y: 0.2, z: puerta.z }, volumen: 0.7 });
          }
          ctx.bus.emit('subtitulo', { texto: AFUERA_LLUEVE, duracion: 3, tipo: 'efecto' });
        }],
        [2.6, () => this.acciones.fundido(true, 2)],
        // Sobre el negro (la tarjeta de capítulo vive dentro del fundido, como la de un piso superado).
        [4.6, () => ctx.bus.emit('tarjeta', { titulo: SOBREVIVISTE, subtitulo: LA_VENTANA_DEL_401, estilo: 'capitulo' })],
        [9.2, () => {
          this.acciones.fijarSoloMirar(false);
          this.acciones.terminarPartida();
        }],
      ],
      'final',
    );
  }
}
