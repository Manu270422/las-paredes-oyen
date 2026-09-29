// Aquí está la MEMORIA DE TENSIÓN del director: cuánto miedo le he metido
// al jugador en los últimos segundos. Antes el director solo miraba el reloj:
// podía lanzar un golpe en la pared justo después de un encuentro a dos metros,
// y el segundo susto se comía al primero. Ahora cada susto "gasta" presupuesto
// y la carga se evapora con el tiempo (vida media). Si no cabe, espero.
//
// No solo cuentan mis eventos: también lo que hizo la criatura (encuentros,
// cazas, imitaciones) y los sustos directos. El miedo es uno solo.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { FaseDirector } from './TiposDirector';

/** Segundos en que la carga se reduce a la mitad. */
const VIDA_MEDIA = 40;

/** Lo que "pesa" un evento del director según su intensidad. */
const COSTO_INTENSIDAD: Record<1 | 2 | 3, number> = { 1: 1, 2: 2.5, 3: 4.5 };

/** Lo que pesan los golpes que no lanzo yo (la criatura, el guion). */
const COSTO_EXTERNO = {
  encuentro: 4,
  caza: 5,
  susto: 6,
  imitacion: 2,
  medicion: 2,
} as const;

/** Cuánta carga acepto en cada fase antes de un evento nuevo. */
const LIMITE_FASE: Record<FaseDirector, number> = {
  calma: 2.5,
  acumulacion: 6,
  pico: 9,
  relajacion: 0,
};

export class PresupuestoTension {
  carga = 0;
  /** Segundos que me quedan de "respiro" obligado después de un encuentro o una caza. */
  private respiro = 0;

  static costo(intensidad: 1 | 2 | 3): number {
    return COSTO_INTENSIDAD[intensidad];
  }

  /** Me engancho a lo que asusta y no lanzo yo. Lo hago una vez al construir el juego. */
  conectar(bus: BusEventos<MapaEventos>): void {
    bus.on('encuentro', (e) => {
      if (e.estado === 'inicio') this.sumar(COSTO_EXTERNO.encuentro);
      // Después de aguantar la respiración a dos metros, le debo unos segundos de nada.
      else this.respiro = Math.max(this.respiro, 8);
    });
    bus.on('entidad-estado', (e) => {
      if (e.estado === 'cazando') this.sumar(COSTO_EXTERNO.caza);
      if (e.estado === 'retirada') this.respiro = Math.max(this.respiro, 6);
    });
    bus.on('susto', () => this.sumar(COSTO_EXTERNO.susto));
    bus.on('imitacion', () => this.sumar(COSTO_EXTERNO.imitacion));
    bus.on('medicion', (m) => {
      if (m.estado === 'completa') this.sumar(COSTO_EXTERNO.medicion);
    });
  }

  sumar(cantidad: number): void {
    this.carga += cantidad;
  }

  /** El límite de la fase, reducido por el alivio (0..1) que decide el director. */
  limite(fase: FaseDirector, alivio: number): number {
    return LIMITE_FASE[fase] * (1 - alivio);
  }

  /** ¿Cabe un evento de este costo ahora mismo? */
  cabe(costo: number, fase: FaseDirector, alivio: number): boolean {
    if (this.respiro > 0) return false;
    // Un evento sutil (costo 1) siempre cabe si la carga ya se evaporó casi del todo.
    return this.carga + costo <= Math.max(this.limite(fase, alivio), this.carga < 0.3 ? costo : 0);
  }

  actualizar(dt: number): void {
    this.carga *= Math.pow(0.5, dt / VIDA_MEDIA);
    this.respiro = Math.max(0, this.respiro - dt);
  }

  reiniciar(): void {
    this.carga = 0;
    this.respiro = 0;
  }
}
