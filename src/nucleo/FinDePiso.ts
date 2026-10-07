// Aquí está el fin de un piso. Hay dos:
// - despertar: el piso queda completado pero la partida sigue. El Piso 4 termina así: el jugador despierta en
//   la escalera, con lo que el paquete le deja en la mano. La primera vez que baja de él, el viaje muestra su
//   resumen en una tarjeta breve, sobre el negro.
// - terminar la partida: la pantalla final, con una línea por cada piso completado; el juego deja de correr.
// Cada piso completado queda anotado (lo que tardé en él, las veces que me atrapó, lo que cambió) y viaja en la
// partida guardada. También lo registro en el perfil (las mejores marcas). Lo saqué de Juego.ts: del juego
// solo pido lo suyo.
import { siguienteDe } from '../pisos/catalogo';
import type { MarcasFinal, Perfil } from '../guardado/Perfil';
import type { SistemaGuardado } from '../guardado/SistemaGuardado';
import type { Telemetria } from '../telemetria/Telemetria';
import { vecesQueTeOyo, type EstadisticasFin } from '../ui/pantallas/PantallaFin';
import { reloj } from '../utilidades/Reloj';
import type { ContextoJuego } from './ContextoJuego';
import type { DificultadPartida } from './DificultadPartida';
import type { ViajeEscalera } from './ViajeEscalera';

/** Lo que dejó un piso al completarse, solo de ese piso (no de toda la partida). */
export interface PisoCompletado {
  piso: string;
  nombre: string;
  tiempo: number;
  muertes: number;
  cambiosMundo: number;
  /** Ya salió su tarjeta al bajar de él: no se repite. */
  tarjetaVista: boolean;
}

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
  private completados: PisoCompletado[] = [];

  constructor(
    private readonly piezas: PiezasFin,
    private readonly salida: SalidaFin,
  ) {}

  /** Los pisos completados, para guardarlos con la partida. */
  exportar(): PisoCompletado[] {
    return this.completados.map((p) => ({ ...p }));
  }

  /** Al cargar una partida (o empezar una nueva, sin ninguno). */
  importar(lista: readonly PisoCompletado[]): void {
    this.completados = lista.map((p) => ({ ...p }));
  }

  /** El piso queda completado y despierto en el punto que dice su paquete, sin pantalla de fin. */
  despertar(ctx: ContextoJuego): void {
    const cfg = ctx.piso.despertar;
    if (!cfg) return;
    this.completar(ctx);
    // La llave está en la mano: el jugador no la recogió conscientemente.
    ctx.progreso.agregarObjeto(cfg.objeto);
    ctx.bus.emit('subtitulo', { texto: 'Tienes una llave en la mano que no recuerdas haber tomado.', duracion: 5 });
    // Despierto a oscuras todavía (el viaje funde desde negro).
    this.piezas.viaje.viajar(ctx.piso, cfg.punto, ctx, true);
  }

  /**
   * Salgo de `desde`: si lo completé y todavía no vi su tarjeta, me la llevo para mostrarla sobre el negro del
   * viaje (y queda vista: el viaje guarda al llegar). Si no, null.
   */
  tomarResumen(desde: string): { titulo: string; subtitulo: string } | null {
    const p = this.completados.find((c) => c.piso === desde && !c.tarjetaVista);
    if (!p) return null;
    p.tarjetaVista = true;
    const cambios = p.cambiosMundo === 0 ? 'nada cambió' : p.cambiosMundo === 1 ? '1 cosa cambió' : `${p.cambiosMundo} cosas cambiaron`;
    return { titulo: `${p.nombre} superado`, subtitulo: `${reloj(p.tiempo)} · ${vecesQueTeOyo(p.muertes)} · ${cambios}` };
  }

  /** La pantalla final. Cierro la sesión de prueba ANTES de mostrarla, para poder exportarla desde ahí. */
  terminarPartida(ctx: ContextoJuego): void {
    const tiempo = this.salida.tiempoJugado();
    // Primero completo el piso: así la telemetría alcanza a anotarlo antes de cerrar la sesión.
    const marcas = this.completar(ctx);
    ctx.bus.emit('fin-partida', { tiempo });
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
      marcas,
      pisos: this.completados.map(({ nombre, tiempo: t, muertes }) => ({ nombre, tiempo: t, muertes })),
    });
    this.salida.fundir(false, 0.5);
  }

  /**
   * Anoto el piso en el perfil y, si es la primera vez que lo completo en esta partida, lo que dejó: lo de toda
   * la partida menos lo que ya se llevaron los pisos anteriores.
   */
  private completar(ctx: ContextoJuego): MarcasFinal {
    const tiempo = this.salida.tiempoJugado();
    const marcas = this.piezas.perfil.registrarFinal(ctx.piso.id, this.piezas.dificultad.masBaja, tiempo, ctx.memoria.muertes);
    if (!this.completados.some((c) => c.piso === ctx.piso.id)) {
      const antes = (campo: 'tiempo' | 'muertes' | 'cambiosMundo') => this.completados.reduce((suma, c) => suma + c[campo], 0);
      const p: PisoCompletado = {
        piso: ctx.piso.id,
        nombre: ctx.piso.nombre,
        tiempo: Math.max(0, tiempo - antes('tiempo')),
        muertes: Math.max(0, ctx.memoria.muertes - antes('muertes')),
        cambiosMundo: Math.max(0, ctx.memoria.cambiosMundo - antes('cambiosMundo')),
        tarjetaVista: false,
      };
      this.completados.push(p);
      ctx.bus.emit('piso-completado', { piso: p.piso, tiempo: p.tiempo, muertes: p.muertes });
    }
    return marcas;
  }
}
