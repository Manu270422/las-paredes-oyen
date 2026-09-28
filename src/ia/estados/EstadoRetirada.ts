// Estado "RETIRADA": vuelve a las paredes... o eso parece.
// A veces es una FALSA retirada: se oyen sus pasos alejándose, pero el cuerpo
// se queda quieto en la oscuridad unos segundos. Si el jugador ilumina ese
// rincón, lo encuentra ahí, de pie, esperando. Y si camina junto a ella en
// la oscuridad creyendo que se fue, lo siente.
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Ruido } from '../../nucleo/Eventos';
import type { Entidad } from '../Entidad';
import type { EstadoIA } from '../TiposIA';
import { aleatorio } from '../../utilidades/Matematicas';
import { puntoEnVista } from '../../director/Visibilidad';

export class EstadoRetirada implements EstadoIA {
  readonly nombre = 'retirada' as const;
  private falsa = false;
  private esperando = 0;
  private limite = 12;

  entrar(entidad: Entidad, ctx: ContextoJuego): void {
    this.falsa = Math.random() < 0.35;
    this.esperando = 0;
    this.limite = 12;
    entidad.pose = 'caminar';
    // Busco un rincón lejos del jugador y fuera de su vista.
    const j = ctx.jugador.posicion;
    const dx = entidad.posicion.x - j.x;
    const dz = entidad.posicion.z - j.z;
    const largo = Math.hypot(dx, dz) || 1;
    const salida = entidad.buscarPuntoSalida(entidad.posicion.x + (dx / largo) * 4, entidad.posicion.z + (dz / largo) * 4, ctx, 5, 6);
    if (salida) entidad.irHacia(salida.x, salida.z, ctx);
  }

  actualizar(entidad: Entidad, ctx: ContextoJuego, dt: number): void {
    this.limite -= dt;
    if (this.esperando > 0) {
      // Falsa retirada: quieto, de pie en la oscuridad.
      if (entidad.distanciaAlJugador(ctx) < CONFIG.entidad.radioPresencia && ctx.jugador.rapidez > 0.12) {
        entidad.cazar('presencia', ctx);
        return;
      }
      this.esperando -= dt;
      entidad.pose = 'quieto';
      entidad.velocidadActual = 0;
      if (this.esperando <= 0) this.hundirse(entidad, ctx);
      return;
    }
    const resultado = entidad.avanzar(dt, CONFIG.entidad.velocidadRetirada, ctx);
    const p = entidad.posicion;
    const oculto = !puntoEnVista(ctx, p.x, 1.2, p.z);
    if (((resultado === 'llego' || resultado === 'sin-camino') && oculto) || (this.limite <= 0 && oculto)) {
      if (this.falsa) {
        this.esperando = aleatorio(10, 18);
        // Pasos que se alejan... pero no es ella la que se aleja.
        const j = ctx.jugador.posicion;
        const dx = p.x - j.x;
        const dz = p.z - j.z;
        const largo = Math.hypot(dx, dz) || 1;
        for (let i = 0; i < 5; i++) {
          const d = 3 + i * 1.6;
          ctx.audio.reproducir('paso_entidad', {
            bus: 'entidad',
            posicion: { x: p.x + (dx / largo) * d, y: 0.1, z: p.z + (dz / largo) * d },
            volumen: 0.5 - i * 0.08,
            retraso: 0.4 + i * 0.75,
          });
        }
      } else {
        this.hundirse(entidad, ctx);
      }
    }
  }

  private hundirse(entidad: Entidad, ctx: ContextoJuego): void {
    const p = entidad.posicion;
    ctx.audio.reproducir('crujido_madera', { bus: 'entidad', posicion: { x: p.x, y: 1.2, z: p.z }, volumen: 0.4, dentroPared: true });
    entidad.memoria.sospecha = 0.2;
    entidad.cambiarEstado('paredes', ctx);
  }

  alOir(entidad: Entidad, ctx: ContextoJuego, percibido: number, ruido: Ruido): void {
    if (ruido.origen === 'jugador' && percibido >= CONFIG.entidad.umbralCaza) entidad.cazar(ruido.causa, ctx, ruido.pared);
  }
}
