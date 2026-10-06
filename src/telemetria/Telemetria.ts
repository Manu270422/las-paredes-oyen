// Aquí está mi recolector de telemetría para las pruebas con jugadores.
// Mi creador probó el juego y lo cerró de miedo antes de terminar: eso es
// una anécdota. Esto la convierte en datos: cuándo llegó el primer susto,
// qué lo mató, qué eventos nunca vio, en qué cuarto se sintió seguro,
// cuándo reaccionó de verdad y cómo se movía (¿corre? ¿se pega a la pared?).
//
// Cómo está hecho:
// - Escucho el BUS: no toco la lógica de ningún sistema para medirlo.
// - Cada 5 s tomo una muestra (estrés, tensión, fase, distancia a la criatura)
//   para dibujar la "curva del miedo" de la sesión.
// - Todo queda en este dispositivo. Solo sale si alguien lo exporta a .json.
// - Viene APAGADA. Se enciende en Ajustes → Pruebas o abriendo el juego con ?telemetria=1.
// - F9 deja una "marca del observador": si el probador salta en la silla,
//   el que observa pulsa F9 y queda anotado en el momento exacto.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { GestorAjustes } from '../config/Ajustes';
import type { PuenteTelemetria } from '../ui/PuenteTelemetria';
import { COMPILACION } from '../config/Compilacion';
import { AlmacenTelemetria } from './AlmacenTelemetria';
import { ReaccionPendiente } from './ReaccionJugador';
import { VigilanciaEvento } from './VigilanciaEvento';
import { resumirSesion } from './ResumenSesion';
import type { EntornoSesion, FinSesion, SesionTelemetria, ValorDato } from './TiposTelemetria';

/** Tope de eventos por sesión: protege el almacenamiento si alguien juega horas. */
const MAXIMO_EVENTOS = 4000;
const CADA_MUESTRA = 5;
const CADA_GUARDADO = 20;
const CADA_VIGILANCIA = 0.25;
/** Reacciones que observo a la vez como máximo. */
const MAXIMO_REACCIONES = 6;
/** Un ruido mío a partir de esto ya lo puede oír la criatura (la respiración tranquila no cuenta). */
const RUIDO_SIGNIFICATIVO = 0.1;

const r2 = (n: number) => Math.round(n * 100) / 100;

export class Telemetria {
  private sesion: SesionTelemetria | null = null;
  private ctx: ContextoJuego | null = null;
  private inicioReal = 0;
  private tiempo = 0;
  private muestreo = 0;
  private guardado = 0;
  private vigilancia = 0;
  private fpsSuma = 0;
  private fpsCuadros = 0;
  private primerMovimiento = false;
  private primerRuido = false;
  private readonly visitadas = new Set<string>();
  /** Contadores sin redondear: redondear en cada fotograma inflaba los tiempos ~20 %. */
  private readonly contadores = new Map<string, number>();
  private reacciones: ReaccionPendiente[] = [];
  private vigilancias: VigilanciaEvento[] = [];

  constructor(
    bus: BusEventos<MapaEventos>,
    private readonly ajustes: GestorAjustes,
    private readonly almacen = new AlmacenTelemetria(),
  ) {
    this.conectar(bus);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'F9' || !this.sesion) return;
      e.preventDefault();
      this.registrar('marca-observador');
    });
    // Si cierran la pestaña o la app a media partida, guardo lo que haya.
    window.addEventListener('pagehide', () => this.cerrarSesion('cierre'));
  }

  /** Lo que la interfaz puede pedirle a la telemetría (Ajustes y la pantalla final). */
  readonly puente: PuenteTelemetria = {
    activa: () => this.activa,
    contarSesiones: () => this.contarSesiones(),
    exportarTodo: () => this.exportarTodo(),
    exportarUltima: () => this.exportarUltima(),
    borrarTodo: () => this.borrarTodo(),
  };

  /** ¿El jugador aceptó registrar sesiones? */
  get activa(): boolean {
    return this.ajustes.valores.telemetria;
  }

  get enCurso(): boolean {
    return this.sesion !== null;
  }

  contarSesiones(): number {
    return this.almacen.contar();
  }

  exportarTodo(): boolean {
    return this.almacen.exportar();
  }

  /** Exporto solo la sesión más reciente (la que se acaba de jugar). */
  exportarUltima(): boolean {
    const sesiones = this.almacen.cargar();
    const ultima = sesiones[sesiones.length - 1];
    return ultima ? this.almacen.exportar([ultima], 'sesion') : false;
  }

  borrarTodo(): void {
    this.almacen.borrarTodo();
  }

  // ---------------------------------------------------------------------------
  // CICLO DE LA SESIÓN
  // ---------------------------------------------------------------------------
  /** Empieza (o retoma) una partida: reintentar tras morir es la MISMA sesión de prueba; empezar o continuar abre una nueva. */
  empezarPartida(reintento: boolean, ctx: ContextoJuego, punto: string, entorno: Omit<EntornoSesion, 'compilacion'>): void {
    if (reintento && this.enCurso) {
      this.registrarReintento(punto);
      return;
    }
    // La versión de la compilación la pongo yo: es la misma para toda la sesión.
    this.iniciarSesion(ctx, { ...entorno, compilacion: COMPILACION }, punto);
  }

  iniciarSesion(ctx: ContextoJuego, entorno: EntornoSesion, punto: string): void {
    if (!this.activa) return;
    if (this.sesion) this.cerrarSesion('menu');
    this.ctx = ctx;
    this.inicioReal = Date.now();
    this.tiempo = 0;
    this.muestreo = 0;
    this.guardado = 0;
    this.primerMovimiento = false;
    this.primerRuido = false;
    this.visitadas.clear();
    this.contadores.clear();
    this.reacciones = [];
    this.vigilancias = [];
    this.sesion = {
      version: 2,
      id: `${this.inicioReal.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      inicio: new Date(this.inicioReal).toISOString(),
      duracion: 0,
      duracionReal: 0,
      terminada: 'en-curso',
      puntoInicio: punto,
      entorno,
      eventos: [],
      curva: [],
      contadores: {},
      resumen: null,
    };
    this.registrar('inicio', { punto, habitacion: this.habitacionJugador(), bateria: r2(ctx.linterna.bateria) });
  }

  /** Morí y reintento: es la MISMA sesión de juego, solo lo anoto. */
  registrarReintento(punto: string): void {
    if (!this.sesion) return;
    this.reacciones = [];
    this.registrar('reintento', { punto, habitacion: this.habitacionJugador() });
  }

  registrarPausa(pausado: boolean): void {
    this.registrar(pausado ? 'pausa' : 'reanudar');
  }

  cerrarSesion(fin: FinSesion): void {
    const sesion = this.sesion;
    if (!sesion) return;
    this.registrar('fin', { motivo: fin });
    sesion.terminada = fin;
    sesion.duracion = r2(this.tiempo);
    sesion.duracionReal = r2((Date.now() - this.inicioReal) / 1000);
    this.volcarContadores(sesion);
    sesion.resumen = resumirSesion(sesion);
    this.almacen.guardar(sesion);
    this.sesion = null;
    this.reacciones = [];
    this.vigilancias = [];
  }

  // ---------------------------------------------------------------------------
  // CADA FOTOGRAMA (solo mientras se juega: las pausas no cuentan)
  // ---------------------------------------------------------------------------
  actualizar(dt: number, dtReal: number): void {
    const sesion = this.sesion;
    const ctx = this.ctx;
    if (!sesion || !ctx) return;
    this.tiempo += dt;
    sesion.duracion = r2(this.tiempo);
    const j = ctx.jugador;

    if (!this.primerMovimiento && j.rapidez > 0.12) {
      this.primerMovimiento = true;
      this.registrar('primer-movimiento');
    }

    // Estilo de juego: cuánto tiempo pasa de cada forma.
    if (j.corriendo && j.rapidez > 0.5) this.sumar('segundos-corriendo', dt);
    if (j.agachado) this.sumar('segundos-agachado', dt);
    if (j.escuchando) this.sumar('segundos-escuchando', dt);
    if (j.respiracion.aguantando) this.sumar('segundos-aguantando', dt);
    if (ctx.linterna.encendida) this.sumar('segundos-linterna', dt);
    if (j.rapidez < 0.1) this.sumar('segundos-quieto', dt);

    // Reacciones en curso.
    this.reacciones = this.reacciones.filter((reaccion) => {
      const resultado = reaccion.actualizar(dt, j);
      if (!resultado) return true;
      this.registrar('reaccion', { estimulo: reaccion.estimulo, ...resultado });
      return false;
    });

    // ¿Vio lo que cambió?
    this.vigilancia += dt;
    if (this.vigilancia >= CADA_VIGILANCIA) {
      const paso = this.vigilancia;
      this.vigilancia = 0;
      this.vigilancias = this.vigilancias.filter((v) => {
        const r = v.revisar(paso, ctx);
        if (!r) return true;
        this.registrar(r.resultado === 'visto' ? 'evento-visto' : 'evento-no-visto', { id: v.id, tras: r2(r.tras) });
        return false;
      });
    }

    // Curva del miedo y rendimiento.
    if (dtReal > 0 && dtReal < 0.5) {
      this.fpsSuma += 1 / dtReal;
      this.fpsCuadros++;
    }
    this.muestreo += dt;
    if (this.muestreo >= CADA_MUESTRA) {
      this.muestreo = 0;
      const fisica = ctx.entidad.fisica;
      sesion.curva.push({
        t: r2(this.tiempo),
        estres: r2(j.estres),
        tension: r2(ctx.director.tension),
        carga: r2(ctx.director.presupuesto.carga),
        rasgo: ctx.director.perfil.dominante,
        fase: ctx.director.activo ? ctx.director.fase : 'inactivo',
        habitacion: this.habitacionJugador(),
        entidad: ctx.entidad.estado,
        distancia: fisica ? r2(ctx.entidad.distanciaAlJugador(ctx)) : null,
        fps: this.fpsCuadros ? Math.round(this.fpsSuma / this.fpsCuadros) : 0,
      });
      this.fpsSuma = 0;
      this.fpsCuadros = 0;
    }

    // Autoguardado: si el navegador se cierra de golpe, no pierdo la sesión.
    this.guardado += dt;
    if (this.guardado >= CADA_GUARDADO) {
      this.guardado = 0;
      this.volcarContadores(sesion);
      this.almacen.guardar(sesion);
    }
  }

  // ---------------------------------------------------------------------------
  // LO QUE ESCUCHO DEL BUS
  // ---------------------------------------------------------------------------
  private conectar(bus: BusEventos<MapaEventos>): void {
    bus.on('ruido', (r) => {
      if (!this.sesion || (r.origen !== 'jugador' && r.origen !== 'puerta')) return;
      if (r.intensidad < RUIDO_SIGNIFICATIVO) return;
      this.sumar(`ruido:${r.causa}${r.pared ? '-pared' : ''}`, 1);
      if (!this.primerRuido) {
        this.primerRuido = true;
        this.registrar('primer-ruido', { causa: r.causa, intensidad: r2(r.intensidad) });
      }
    });
    bus.on('habitacion-cambiada', ({ anterior, actual }) => {
      const regreso = this.visitadas.has(actual);
      this.visitadas.add(actual);
      this.registrar('habitacion', { desde: anterior, hacia: actual, regreso });
    });
    bus.on('medicion', (m) => {
      if (m.estado === 'progreso') return;
      this.registrar('medicion', {
        estado: m.estado,
        apartamento: m.apartamento,
        motivo: m.motivo ?? null,
        progreso: r2(m.progreso),
        ...this.estadoPeligro(),
      });
    });
    bus.on('entidad-estado', (e) => {
      const motivo = e.estado === 'cazando' ? (this.ctx?.entidad.motivoCaza ?? null) : null;
      this.registrar('entidad', { estado: e.estado, fisica: e.fisica, motivo, ...this.estadoPeligro() });
      if (e.estado === 'cazando') this.observarReaccion('caza');
    });
    bus.on('evento-director', (ev) => {
      this.registrar('evento-director', { id: ev.id, intensidad: ev.intensidad, fase: ev.fase, tension: r2(this.ctx?.director.tension ?? 0), carga: ev.carga ?? null });
      this.observarReaccion(ev.id);
      if (ev.x !== undefined && ev.z !== undefined && this.sesion) this.vigilancias.push(new VigilanciaEvento(ev.id, ev.x, ev.z));
    });
    bus.on('director-fase', ({ fase }) => this.registrar('fase', { fase }));
    bus.on('director-adaptacion', ({ rasgo, alivio }) => this.registrar('adaptacion', { rasgo, alivio: r2(alivio) }));
    bus.on('grabacion-captada', (g) => this.registrar('cinta', { apartamento: g.apartamento, huellas: g.huellas, presencia: g.presencia }));
    bus.on('encuentro', (e) => {
      const r = this.ctx?.jugador.respiracion;
      this.registrar('encuentro', { estado: e.estado, distancia: r2(e.distancia), aire: r ? r2(r.aire) : null, aguantando: r?.aguantando ?? null });
      if (e.estado === 'inicio') this.observarReaccion('encuentro');
    });
    bus.on('imitacion', (i) => {
      this.registrar('imitacion', { etapa: i.etapa, conCuerpo: i.conCuerpo });
      this.observarReaccion(`imitacion-${i.etapa}`);
    });
    bus.on('jugador-atrapado', (a) => this.registrar('muerte', { motivo: a.motivo, enPared: a.enPared, ...this.estadoPeligro() }));
    bus.on('susto', (s) => this.registrar('susto', { origen: s.origen }));
    bus.on('bandera', ({ nombre }) => {
      // Las pistas y lo recogido tienen su propio registro; aquí solo el progreso de la historia.
      if (nombre.startsWith('pista:') || nombre.startsWith('recogido:') || nombre.startsWith('lugar:')) return;
      this.registrar('bandera', { nombre, bateria: r2(this.ctx?.linterna.bateria ?? 0) });
    });
    bus.on('momento-guion', ({ id }) => {
      this.registrar('momento', { id });
      this.observarReaccion(id);
    });
    bus.on('documento', ({ id }) => this.registrar('documento', { id }));
    bus.on('pista', ({ id }) => this.registrar('pista', { id }));
    bus.on('dificultad-cambiada', ({ de, a, motivo }) => this.registrar('dificultad', { de, a, motivo }));
    bus.on('grabadora', ({ accion }) => this.registrar('grabadora', { accion, bateria: r2(this.ctx?.linterna.bateria ?? 0) }));
  }

  // ---------------------------------------------------------------------------
  // AYUDAS
  // ---------------------------------------------------------------------------
  private registrar(tipo: string, datos?: Record<string, ValorDato>): void {
    const sesion = this.sesion;
    if (!sesion || sesion.eventos.length >= MAXIMO_EVENTOS) return;
    sesion.eventos.push(datos ? { t: r2(this.tiempo), tipo, datos } : { t: r2(this.tiempo), tipo });
  }

  private sumar(clave: string, cantidad: number): void {
    if (!this.sesion) return;
    this.contadores.set(clave, (this.contadores.get(clave) ?? 0) + cantidad);
  }

  /** Paso los contadores (redondeados una sola vez) a la sesión que se guarda. */
  private volcarContadores(sesion: SesionTelemetria): void {
    for (const [clave, valor] of this.contadores) sesion.contadores[clave] = r2(valor);
  }

  private observarReaccion(estimulo: string): void {
    if (!this.sesion || !this.ctx || this.reacciones.length >= MAXIMO_REACCIONES) return;
    this.reacciones.push(new ReaccionPendiente(estimulo, this.ctx.jugador));
  }

  private habitacionJugador(): string | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const j = ctx.jugador.posicion;
    return ctx.nivel.habitacionEn(j.x, j.z)?.id ?? null;
  }

  /** Lo que quiero saber en cada momento crítico: dónde estaba, con cuánta pila y qué hacía ella. */
  private estadoPeligro(): Record<string, ValorDato> {
    const ctx = this.ctx;
    if (!ctx) return {};
    return {
      habitacion: this.habitacionJugador(),
      bateria: r2(ctx.linterna.bateria),
      entidadEstado: ctx.entidad.estado,
      distancia: ctx.entidad.fisica ? r2(ctx.entidad.distanciaAlJugador(ctx)) : null,
    };
  }
}
