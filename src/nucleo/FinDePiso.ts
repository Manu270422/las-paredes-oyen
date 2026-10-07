// Aquí está el fin de un piso. Hay dos:
// - despertar: el piso queda completado pero la partida sigue. El Piso 4 termina así: el jugador despierta en
//   la escalera, con lo que el paquete le deja en la mano.
// - terminar la demo: la pantalla final con las estadísticas; el juego deja de correr.
// Los dos registran el piso en el perfil (las mejores marcas). Lo saqué de Juego.ts: del juego solo pido lo suyo.
import { siguienteDe } from '../pisos/catalogo';
import type { MarcasFinal, Perfil } from '../guardado/Perfil';
import type { SistemaGuardado } from '../guardado/SistemaGuardado';
import type { Telemetria } from '../telemetria/Telemetria';
import type { EstadisticasFin } from '../ui/pantallas/PantallaFin';
import type { ContextoJuego } from './ContextoJuego';
import type { DificultadPartida } from './DificultadPartida';
import type { ViajeEscalera } from './ViajeEscalera';

/** Lo que el fin de un piso le pide al juego sin conocerlo. */
export interface SalidaFin {
  /** Los segundos jugados en la partida. */
  tiempoJugado(): number;
  /** Paso a la pantalla final: el juego deja de correr. */
  terminar(): void;
  mostrarFin(datos: EstadisticasFin): void;
  fundir(aNegro: boolean, segundos: number): void;
}

/** Con qué trabajo: lo que sobrevive a las partidas, la dificultad jugada, el guardado, la telemetría y el viaje. */
export interface PiezasFin {
  readonly perfil: Perfil;
  readonly dificultad: DificultadPartida;
  readonly guardado: SistemaGuardado;
  readonly telemetria: Telemetria;
  readonly viaje: ViajeEscalera;
}

export class FinDePiso {
  constructor(
    private readonly piezas: PiezasFin,
    private readonly salida: SalidaFin,
  ) {}

  /** El piso queda completado y despierto en el punto que dice su paquete, sin pantalla de fin. */
  despertar(ctx: ContextoJuego): void {
    const cfg = ctx.piso.despertar;
    if (!cfg) return;
    this.registrar(ctx);
    // La llave está en la mano: el jugador no la recogió conscientemente.
    ctx.progreso.agregarObjeto(cfg.objeto);
    ctx.bus.emit('subtitulo', { texto: 'Tienes una llave en la mano que no recuerdas haber tomado.', duracion: 5 });
    // Despierto a oscuras todavía (el viaje funde desde negro).
    this.piezas.viaje.viajar(ctx.piso, cfg.punto, ctx, true);
  }

  /** La pantalla final. Cierro la sesión de prueba ANTES de mostrarla, para poder exportarla desde ahí. */
  terminarDemo(ctx: ContextoJuego): void {
    const tiempo = this.salida.tiempoJugado();
    ctx.bus.emit('fin-demo', { tiempo });
    this.piezas.telemetria.cerrarSesion('fin');
    this.salida.terminar();
    ctx.entrada.fijarEnJuego(false);
    ctx.audio.detenerTodo();
    ctx.ambiente.olvidarFuentes();
    this.piezas.guardado.borrar();
    this.salida.mostrarFin({
      piso: ctx.piso.nombre,
      dificultad: this.piezas.dificultad.texto,
      siguiente: siguienteDe(ctx.piso),
      tiempo,
      cambiosMundo: ctx.memoria.cambiosMundo,
      persecuciones: ctx.memoria.persecuciones,
      muertes: ctx.memoria.muertes,
      marcas: this.registrar(ctx),
    });
    this.salida.fundir(false, 0.5);
  }

  /** Anoto el piso en el perfil con la dificultad más baja que se jugó. */
  private registrar(ctx: ContextoJuego): MarcasFinal {
    return this.piezas.perfil.registrarFinal(ctx.piso.id, this.piezas.dificultad.masBaja, this.salida.tiempoJugado(), ctx.memoria.muertes);
  }
}
