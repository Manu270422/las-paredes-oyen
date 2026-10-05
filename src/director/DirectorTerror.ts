// Aquí está el DIRECTOR DE TERROR: el sistema que decide qué pasa y cuándo.
// No es aleatorio: sigue un ciclo de tensión y elige eventos según lo que
// el jugador ha hecho, dónde está, qué ha visto y qué no se ha repetido.
//
// Ciclo:
// - CALMA: sonidos sutiles del edificio. El jugador baja la guardia.
// - ACUMULACIÓN: cosas cambian, sonidos cercanos, la criatura se acerca por las paredes.
// - PICO: la criatura sale a buscarlo.
// - RELAJACIÓN: silencio. Parece seguro. No lo es del todo.
//
// Encima del ciclo tengo tres capas:
// - MEMORIA DE TENSIÓN (PresupuestoTension): no apilo sustos. Si acaba de
//   pasar un encuentro o una caza, espero a que el miedo "se asiente".
// - RESPETO: nunca piso una medición, un encuentro ni una persecución.
//   Esos momentos son del jugador; un golpe mío ahí solo ensucia la señal.
// - ADAPTACIÓN (PerfilJugador): el edificio responde a cómo juega. Y si muere
//   una y otra vez en el mismo tramo, aflojo (alivio): alguien que se rinde
//   de miedo no termina el juego, y un juego que nadie termina no asusta a nadie.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { EventoTerror, FaseDirector, RasgoJugador } from './TiposDirector';
import { CATALOGO_EVENTOS } from './eventos/Catalogo';
import { PresupuestoTension } from './PresupuestoTension';
import { PerfilJugador } from './PerfilJugador';
import { aleatorio, amortiguar, elegirPonderado } from '../utilidades/Matematicas';

const DURACION: Record<FaseDirector, [number, number]> = {
  calma: [40, 70],
  acumulacion: [60, 95],
  pico: [45, 75],
  relajacion: [28, 45],
};

/** Si acampa en un cuarto, la calma se corta a partir de estos segundos: el refugio no es refugio. */
const CALMA_MINIMA_SI_ACAMPA = 20;
/** Reintento corto cuando no hubo evento porque el presupuesto no alcanzaba. */
const REINTENTO: [number, number] = [4, 7];

export class DirectorTerror {
  activo = false;
  fase: FaseDirector = 'calma';
  tension = 0;
  readonly presupuesto = new PresupuestoTension();
  readonly perfil = new PerfilJugador();
  private tiempoFase = 0;
  private duracionFase = 50;
  private proximoEvento = 20;
  private bloqueo = 0;
  private entidadSalio = false;
  private alivio = 0;
  private dominanteAnterior: RasgoJugador | null = null;
  private readonly ultimoUso = new Map<string, number>();
  private readonly usos = new Map<string, number>();

  constructor(private readonly eventos: readonly EventoTerror[] = CATALOGO_EVENTOS) {}

  get permiteAcercarse(): boolean {
    return this.activo && (this.fase === 'acumulacion' || this.fase === 'pico');
  }

  get permitePresencia(): boolean {
    return this.activo && this.fase !== 'relajacion';
  }

  get permiteManifestacion(): boolean {
    return this.activo && (this.fase === 'pico' || (this.fase === 'acumulacion' && this.tiempoFase > 35));
  }

  /** Me engancho al bus una sola vez al construir el juego. */
  /** Me engancho al bus una sola vez al construir el juego. Empiezo a trabajar cuando se marca `desde`. */
  conectar(bus: BusEventos<MapaEventos>, desde: string): void {
    this.presupuesto.conectar(bus);
    bus.on('bandera', ({ nombre }) => {
      if (nombre === desde) this.activo = true;
    });
  }

  /**
   * Empiezo (o retomo) desde un punto de control.
   * "muertesSinProgreso": cuántas veces murió seguidas sin avanzar la historia.
   */
  reiniciar(muertesSinProgreso = 0): void {
    // 1 muerte: nada. 2: 15 %. 3: 30 %. Tope 45 %. Nunca lo vuelvo inofensivo.
    this.alivio = Math.min(0.45, Math.max(0, muertesSinProgreso - 1) * 0.15);
    this.fase = 'calma';
    this.tiempoFase = 0;
    this.duracionFase = aleatorio(...DURACION.calma) * (1 + this.alivio);
    this.proximoEvento = aleatorio(15, 25);
    this.bloqueo = 0;
    this.tension = 0;
    this.entidadSalio = false;
    this.presupuesto.reiniciar();
  }

  /** Partida nueva: olvido cómo jugaba. */
  olvidarPerfil(): void {
    this.perfil.olvidar();
    this.dominanteAnterior = null;
  }

  /** El guion puede silenciar al director durante sus secuencias. */
  bloquear(segundos: number): void {
    this.bloqueo = Math.max(this.bloqueo, segundos);
  }

  forzarFase(fase: FaseDirector, ctx: ContextoJuego): void {
    this.cambiarFase(fase, ctx);
  }

  private cambiarFase(fase: FaseDirector, ctx: ContextoJuego): void {
    this.fase = fase;
    ctx.bus.emit('director-fase', { fase });
    this.tiempoFase = 0;
    this.duracionFase = aleatorio(...DURACION[fase]) * (fase === 'calma' || fase === 'relajacion' ? 1 + this.alivio : 1);
    this.entidadSalio = false;
    if (fase === 'pico' && ctx.entidad.puedeManifestarse && ctx.entidad.estado === 'paredes') ctx.entidad.solicitudAcecho = true;
    if (fase === 'relajacion') ctx.entidad.solicitudAcecho = false;
    this.proximoEvento = fase === 'calma' ? aleatorio(12, 20) : aleatorio(6, 12);
  }

  /** ¿Hay un momento del jugador en curso que no debo pisar? */
  private momentoAjeno(ctx: ContextoJuego): boolean {
    return ctx.grabadora.midiendo !== null || ctx.entidad.enEncuentro || ctx.entidad.estado === 'cazando';
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.presupuesto.actualizar(dt);
    this.perfil.actualizar(dt, ctx);
    this.avisarAdaptacion(ctx);
    this.calcularTension(dt, ctx);
    if (!this.activo) return;
    this.tiempoFase += dt;
    this.bloqueo = Math.max(0, this.bloqueo - dt);

    // Transiciones de fase.
    if (this.fase === 'pico') {
      if (ctx.entidad.fisica) this.entidadSalio = true;
      const volvio = this.entidadSalio && ctx.entidad.estado === 'paredes';
      if (volvio || this.tiempoFase > this.duracionFase) this.cambiarFase('relajacion', ctx);
    } else if (this.fase === 'calma' && this.perfil.rasgos.acampa > 0.6 && this.tiempoFase > CALMA_MINIMA_SI_ACAMPA) {
      this.cambiarFase('acumulacion', ctx);
    } else if (this.tiempoFase > this.duracionFase) {
      if (this.fase === 'calma') this.cambiarFase('acumulacion', ctx);
      else if (this.fase === 'acumulacion') this.cambiarFase(ctx.entidad.puedeManifestarse ? 'pico' : 'relajacion', ctx);
      else this.cambiarFase('calma', ctx);
    }

    // Selección de eventos.
    if (this.bloqueo > 0 || this.fase === 'relajacion') return;
    this.proximoEvento -= dt;
    if (this.proximoEvento > 0) return;
    if (this.momentoAjeno(ctx)) {
      this.proximoEvento = aleatorio(...REINTENTO);
      return;
    }
    const { evento, porPresupuesto } = this.elegirEvento(ctx);
    if (evento) {
      const punto = evento.ejecutar(ctx);
      this.presupuesto.sumar(PresupuestoTension.costo(evento.intensidad));
      ctx.bus.emit('evento-director', {
        id: evento.id,
        intensidad: evento.intensidad,
        fase: this.fase,
        x: punto?.x,
        z: punto?.z,
        carga: Math.round(this.presupuesto.carga * 100) / 100,
      });
      const ahora = ctx.programador.ahora;
      this.ultimoUso.set(evento.id, ahora);
      this.usos.set(evento.id, (this.usos.get(evento.id) ?? 0) + 1);
      this.bloqueo = evento.duracion ?? 3;
      if (evento.intensidad >= 2) ctx.memoria.sustos++;
    } else if (porPresupuesto) {
      // Había algo que lanzar, pero el jugador todavía está digiriendo el último susto.
      this.proximoEvento = aleatorio(...REINTENTO);
      return;
    }
    this.proximoEvento = this.fase === 'calma' ? aleatorio(20, 34) : this.fase === 'pico' ? aleatorio(14, 24) : aleatorio(9, 17);
  }

  private elegirEvento(ctx: ContextoJuego): { evento: EventoTerror | null; porPresupuesto: boolean } {
    const ahora = ctx.programador.ahora;
    // En acumulación, la intensidad permitida crece con el tiempo: de lo sutil a lo evidente.
    const tope = this.fase === 'calma' ? 1 : this.fase === 'acumulacion' ? Math.min(3, 1 + Math.floor(this.tiempoFase / 22)) : 3;
    const posibles = this.eventos.filter((e) => {
      if (!e.fases.includes(this.fase) || e.intensidad > tope) return false;
      if (e.maxUsos !== undefined && (this.usos.get(e.id) ?? 0) >= e.maxUsos) return false;
      if (ahora - (this.ultimoUso.get(e.id) ?? -Infinity) < e.enfriamiento) return false;
      if (e.requiere && !e.requiere.every((b) => ctx.progreso.tiene(b))) return false;
      if (e.requiereDespierta && !ctx.progreso.criaturaDespierta) return false;
      return e.puedeOcurrir(ctx);
    });
    const validos = posibles.filter((e) => this.presupuesto.cabe(PresupuestoTension.costo(e.intensidad), this.fase, this.alivio));
    // Novedad: lo que no ha pasado hace rato pesa más. Nada debe sentirse repetido.
    // Adaptación: lo que responde a su forma de jugar pesa más.
    const evento = elegirPonderado(validos, (e) => {
      const desde = ahora - (this.ultimoUso.get(e.id) ?? -600);
      const nunca = this.usos.has(e.id) ? 1 : 1.6;
      return e.peso * nunca * (1 + Math.min(2, desde / 120)) * this.perfil.multiplicador(e.afinidad);
    });
    return { evento, porPresupuesto: !evento && posibles.length > 0 };
  }

  /** Aviso (a la telemetría) cuando cambia el estilo dominante del jugador. */
  private avisarAdaptacion(ctx: ContextoJuego): void {
    const dominante = this.perfil.dominante;
    if (dominante === this.dominanteAnterior) return;
    this.dominanteAnterior = dominante;
    ctx.bus.emit('director-adaptacion', { rasgo: dominante, alivio: this.alivio });
  }

  private calcularTension(dt: number, ctx: ContextoJuego): void {
    const base: Record<FaseDirector, number> = { calma: 0.12, acumulacion: 0.2 + Math.min(0.45, this.tiempoFase / 150), pico: 0.8, relajacion: 0.18 };
    let objetivo = this.activo ? base[this.fase] : 0.08;
    // Lo que acaba de pasar sigue en el aire: el ambiente tarda en soltarlo.
    objetivo = Math.max(objetivo, Math.min(0.7, this.presupuesto.carga / 12));
    if (ctx.entidad.fisica) objetivo = Math.max(objetivo, 1 - ctx.entidad.distanciaAlJugador(ctx) / 16);
    this.tension = amortiguar(this.tension, objetivo, 0.5, dt);
  }
}
