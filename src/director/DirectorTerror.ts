// Aquí está el DIRECTOR DE TERROR: el sistema que decide qué pasa y cuándo.
// No es aleatorio: sigue un ciclo de tensión y elige eventos según lo que
// el jugador ha hecho, dónde está, qué ha visto y qué no se ha repetido.
//
// Ciclo:
// - CALMA: sonidos sutiles del edificio. El jugador baja la guardia.
// - ACUMULACIÓN: cosas cambian, sonidos cercanos, la criatura se acerca por las paredes.
// - PICO: la criatura sale a buscarlo.
// - RELAJACIÓN: silencio. Parece seguro. No lo es del todo.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { EventoTerror, FaseDirector } from './TiposDirector';
import { CATALOGO_EVENTOS } from './eventos/Catalogo';
import { aleatorio, amortiguar, elegirPonderado } from '../utilidades/Matematicas';

const DURACION: Record<FaseDirector, [number, number]> = {
  calma: [40, 70],
  acumulacion: [60, 95],
  pico: [45, 75],
  relajacion: [28, 45],
};

export class DirectorTerror {
  activo = false;
  fase: FaseDirector = 'calma';
  tension = 0;
  private tiempoFase = 0;
  private duracionFase = 50;
  private proximoEvento = 20;
  private bloqueo = 0;
  private entidadSalio = false;
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

  reiniciar(): void {
    this.fase = 'calma';
    this.tiempoFase = 0;
    this.duracionFase = aleatorio(...DURACION.calma);
    this.proximoEvento = aleatorio(15, 25);
    this.bloqueo = 0;
    this.tension = 0;
    this.entidadSalio = false;
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
    this.duracionFase = aleatorio(...DURACION[fase]);
    this.entidadSalio = false;
    if (fase === 'pico' && ctx.entidad.puedeManifestarse && ctx.entidad.estado === 'paredes') ctx.entidad.solicitudAcecho = true;
    if (fase === 'relajacion') ctx.entidad.solicitudAcecho = false;
    this.proximoEvento = fase === 'calma' ? aleatorio(12, 20) : aleatorio(6, 12);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.calcularTension(dt, ctx);
    if (!this.activo) return;
    this.tiempoFase += dt;
    this.bloqueo = Math.max(0, this.bloqueo - dt);

    // Transiciones de fase.
    if (this.fase === 'pico') {
      if (ctx.entidad.fisica) this.entidadSalio = true;
      const volvio = this.entidadSalio && ctx.entidad.estado === 'paredes';
      if (volvio || this.tiempoFase > this.duracionFase) this.cambiarFase('relajacion', ctx);
    } else if (this.tiempoFase > this.duracionFase) {
      if (this.fase === 'calma') this.cambiarFase('acumulacion', ctx);
      else if (this.fase === 'acumulacion') this.cambiarFase(ctx.entidad.puedeManifestarse ? 'pico' : 'relajacion', ctx);
      else this.cambiarFase('calma', ctx);
    }

    // Selección de eventos.
    if (this.bloqueo > 0 || this.fase === 'relajacion') return;
    this.proximoEvento -= dt;
    if (this.proximoEvento > 0) return;
    const evento = this.elegirEvento(ctx);
    if (evento) {
      const punto = evento.ejecutar(ctx);
      ctx.bus.emit('evento-director', { id: evento.id, intensidad: evento.intensidad, fase: this.fase, x: punto?.x, z: punto?.z });
      const ahora = ctx.programador.ahora;
      this.ultimoUso.set(evento.id, ahora);
      this.usos.set(evento.id, (this.usos.get(evento.id) ?? 0) + 1);
      this.bloqueo = evento.duracion ?? 3;
      if (evento.intensidad >= 2) ctx.memoria.sustos++;
    }
    this.proximoEvento = this.fase === 'calma' ? aleatorio(20, 34) : this.fase === 'pico' ? aleatorio(14, 24) : aleatorio(9, 17);
  }

  private elegirEvento(ctx: ContextoJuego): EventoTerror | null {
    const ahora = ctx.programador.ahora;
    // En acumulación, la intensidad permitida crece con el tiempo: de lo sutil a lo evidente.
    const tope = this.fase === 'calma' ? 1 : this.fase === 'acumulacion' ? Math.min(3, 1 + Math.floor(this.tiempoFase / 22)) : 3;
    const validos = this.eventos.filter((e) => {
      if (!e.fases.includes(this.fase) || e.intensidad > tope) return false;
      if (e.maxUsos !== undefined && (this.usos.get(e.id) ?? 0) >= e.maxUsos) return false;
      if (ahora - (this.ultimoUso.get(e.id) ?? -Infinity) < e.enfriamiento) return false;
      if (e.requiere && !e.requiere.every((b) => ctx.progreso.tiene(b))) return false;
      return e.puedeOcurrir(ctx);
    });
    // Novedad: lo que no ha pasado hace rato pesa más. Nada debe sentirse repetido.
    return elegirPonderado(validos, (e) => {
      const desde = ahora - (this.ultimoUso.get(e.id) ?? -600);
      const nunca = this.usos.has(e.id) ? 1 : 1.6;
      return e.peso * nunca * (1 + Math.min(2, desde / 120));
    });
  }

  private calcularTension(dt: number, ctx: ContextoJuego): void {
    const base: Record<FaseDirector, number> = { calma: 0.12, acumulacion: 0.2 + Math.min(0.45, this.tiempoFase / 150), pico: 0.8, relajacion: 0.18 };
    let objetivo = this.activo ? base[this.fase] : 0.08;
    if (ctx.entidad.fisica) objetivo = Math.max(objetivo, 1 - ctx.entidad.distanciaAlJugador(ctx) / 16);
    this.tension = amortiguar(this.tension, objetivo, 0.5, dt);
  }
}
