// Aquí está el ascensor: una cabina de una celda con puertas de metal hacia el pasillo. Es la otra forma de cambiar
// de piso, y es lo contrario de la escalera: rápido, pero se oye en todo el edificio.
//
// Cómo funciona, paso a paso:
// - Afuera hay un botón para llamarlo. Si la cabina está en otro piso (lo normal, salvo que haya llegado en ella),
//   tarda unos segundos en venir y todo ese rato el motor zumba por los muros: ella lo oye. Al llegar suena la
//   campanilla (fuerte: también la oye) y las puertas se abren.
// - Adentro, el panel tiene un botón por piso. Al pulsarlo, las puertas se cierran (si algo está en la puerta, se
//   vuelven a abrir, como en todo ascensor: también si es ella) y la cabina arranca con un sacudón. Se vibra, el
//   motor zumba y la luz parpadea; puedo mirar alrededor y moverme en la cabina.
// - A la mitad del viaje el piso cambia con las puertas cerradas. La cabina es idéntica en todos los pisos, así
//   que no hay negro: un sacudón y la luz que titila. El piso nuevo oye el motor y, al llegar, la campanilla.
// - Ella no viaja: si estaba afuera con cuerpo cuando se cerraron las puertas, golpea el metal y vuelve a las
//   paredes. Con las puertas cerradas no me ve, no me alcanza y no puede entrar.
// - La regla de justicia: al llegar conmigo adentro, las puertas no se abren si ella está a menos de 4 m. La luz
//   parpadea (la señal de siempre: está cerca). Si no se va en unos segundos, la mando a las paredes.
// - Con las puertas abiertas, la cabina es un cuarto más: ella puede entrar. No es un refugio.
// - Un botón del panel puede pedir algo (la llave de servicio, haber estado en ese piso): sin eso no se enciende.
// - Un guion puede detener la cabina entre pisos y soltarla después (detener / reanudar): el Piso 2 lo hace.
// - Un botón puede llevar a un piso que todavía no existe: la cabina baja hasta el último que existe y, al llegar,
//   no abre; avisa ('ascensor-fin-recorrido') y lo que pasa ahí es del guion de ese piso (el final de lo que hay).
//
// Por qué este archivo pasa de 250 líneas (anotado el 2026-10-12, a pedido del creador): es UNA máquina de estados de
// 9 fases y sus reglas de justicia se leen juntas. El sensor de la puerta, que ella no viaje, la retención al llegar y
// que abierta no sea refugio dependen de lo mismo (la apertura, el piso elegido, el motor), y repartirlas en varios
// archivos obligaría a saltar entre ellos para entender una muerte. Lo que no es la máquina ya vive aparte:
// MarcoCabina (geometría), ModeloAscensor (lo que se ve), BotonAscensor (los botones), EnlacesAscensor (validar los
// paquetes) y, desde el 2026-10-14, SonidoAscensor (motor, puertas, campanilla y golpes: no decide nada). Casi un
// cuarto son comentarios y líneas en blanco.
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { DefAscensor, ParadaAscensor } from '../pisos/TiposPiso';
import { pisoAntesDe, pisoPorId } from '../pisos/catalogo';
import { cumpleRequisito } from '../narrativa/Requisito';
import { BotonAscensor, type MandoAscensor } from '../interaccion/objetos/BotonAscensor';
import type { CajaColision } from './Colisiones';
import { MEDIO_GROSOR_VANO_CABINA } from './ConstructorGeometria';
import type { Lampara } from './Lampara';
import { DISPOSICION_CABINA, type MarcoCabina } from './MarcoCabina';
import { alturaBoton, U_BOTONES, type VistaAscensor } from './ModeloAscensor';
import { CADA_RUIDO_MOTOR, SonidoAscensor } from './SonidoAscensor';

/** Los tiempos del ascensor, en segundos. */
export const TIEMPOS_ASCENSOR = {
  /** Desde que lo llamo hasta que llega, si estaba en otro piso. Zumba por los muros todo ese rato. */
  llamada: 7,
  /** Abrir o cerrar las puertas. */
  puertas: 1.4,
  /** Abiertas sin nadie adentro, hasta que se cierran solas. */
  abiertas: 8,
  /** Si volvieron a abrirse por algo en la puerta y yo sigo adentro con un piso elegido: cuándo lo intentan otra vez. */
  reintento: 1.5,
  /** El viaje entre dos pisos. El piso cambia a la mitad. */
  viaje: 6,
  /** Cada cuánto el motor hace ruido para ella mientras viene o viaja. */
  ruidoMotor: CADA_RUIDO_MOTOR,
  /** Lo más que retengo las puertas por ella antes de mandarla a las paredes. */
  retencionMaxima: 6,
} as const;

/** La regla de justicia: con ella a menos de esto (metros) de las puertas, no abro con el jugador adentro. */
export const DISTANCIA_JUSTICIA = 4;
/** Ella a menos de esto (metros) del centro del vano no deja cerrar las puertas. */
const DISTANCIA_SENSOR = 1.1;
/** Si estaba con cuerpo a menos de esto cuando se cerraron, golpea las puertas. */
const DISTANCIA_GOLPE = 3;
/** Abiertas al menos esto (de 0 a 1), las puertas ya no tapan: se ve, se oye y se pasa. */
const ABIERTAS_DEL_TODO = 0.6;
/** El temblor de la cabina (trauma mínimo mientras viaja: la sacudida es su cuadrado). */
const VIBRACION = 0.34;

export type FaseAscensor = 'muerto' | 'lejos' | 'viniendo' | 'aqui' | 'abriendo' | 'abierto' | 'cerrando' | 'viajando' | 'detenido' | 'reteniendo';

/**
 * Lo que marca el botón de un piso en el panel: el `numero` de su ascensor; si el piso todavía no existe, el que
 * declara su parada en `paradas` ("?" si ninguno lo dice).
 */
function numeroDe(piso: string, paradas: readonly ParadaAscensor[] = []): string {
  return pisoPorId(piso)?.ascensor?.numero ?? paradas.find((p) => p.hacia === piso)?.numero ?? '?';
}

/** Los números del panel, del más alto al más bajo: el de este piso y los de sus paradas (iguales en todos los pisos). */
export function numerosDelPanel(def: DefAscensor): string[] {
  const todos = new Set([def.numero, ...def.paradas.map((p) => numeroDe(p.hacia, def.paradas))]);
  return [...todos].sort((a, b) => Number(b) - Number(a));
}

export class Ascensor implements MandoAscensor {
  /** El de llamar (afuera) y uno por cada piso al que lleva (adentro). */
  readonly botones: BotonAscensor[] = [];
  fase: FaseAscensor = 'lejos';
  /** 0 cerradas, 1 abiertas del todo. */
  apertura = 0;
  private tiempo = 0;
  /** El piso que elegí en el panel (mientras cierra y viaja). */
  private destino: string | null = null;
  private cambiado = false;
  /** 1 sube, -1 baja, 0 quieto. */
  private flecha = 0;
  /** Cuánto llevaba de viaje cuando un guion me detuvo entre pisos (para seguir desde ahí). */
  private tiempoAlDetener = 0;
  /** Lo que suena (motor, puertas, campanilla, golpes): la máquina decide cuándo. */
  private readonly sonido: SonidoAscensor;

  constructor(
    private readonly def: DefAscensor,
    readonly marco: MarcoCabina,
    private readonly vista: VistaAscensor,
    private readonly numeros: readonly string[],
    private readonly lampara: Lampara | null,
  ) {
    this.sonido = new SonidoAscensor(marco);
    const { llamar, panel } = DISPOSICION_CABINA;
    // La zona del botón de llamar va un poco hacia el pasillo: si asomara al otro lado del muro, se enfocaría desde adentro.
    const p = marco.aMundo(llamar.u + 0.065, llamar.v);
    this.botones.push(new BotonAscensor(`ascensor:${def.numero}:llamar`, null, 'Llamar al ascensor', { x: p.x, y: llamar.y, z: p.z }, this));
    const q = marco.aMundo(U_BOTONES, panel.v - 0.03);
    const celda = { gx: marco.gx, gy: marco.gy };
    for (const parada of def.paradas) {
      const y = alturaBoton(this.numeros.indexOf(this.numeroDe(parada.hacia)), this.numeros.length);
      this.botones.push(new BotonAscensor(`ascensor:${def.numero}:${parada.hacia}`, parada.hacia, parada.texto, { x: q.x, y, z: q.z }, this, celda));
    }
  }

  /** El piso al que viaja la cabina ahora (solo mientras viaja), o null. Un guion lo mira para su momento. */
  get viajandoHacia(): string | null {
    return this.fase === 'viajando' ? this.destino : null;
  }

  /** Cuánto lleva del viaje (0 al partir, 1 al llegar). */
  get avanceViaje(): number {
    if (this.fase === 'detenido') return this.tiempoAlDetener / TIEMPOS_ASCENSOR.viaje;
    return this.fase === 'viajando' ? this.tiempo / TIEMPOS_ASCENSOR.viaje : 0;
  }

  /** El número del botón de ese piso en mi panel. */
  private numeroDe(piso: string): string {
    return numeroDe(piso, this.def.paradas);
  }

  /** ¿Estoy dentro de la cabina? */
  adentro(ctx: ContextoJuego): boolean {
    const j = ctx.jugador.posicion;
    return this.marco.dentro(j.x, j.z);
  }

  /** ¿La cabina tapa la celda (gx, gy)? Con las puertas casi cerradas, para la vista, el sonido y para ella. */
  tapa(gx: number, gy: number): boolean {
    return gx === this.marco.gx && gy === this.marco.gy && this.apertura < ABIERTAS_DEL_TODO;
  }

  /** Las puertas como obstáculo para el jugador, mientras no estén abiertas del todo. */
  cajaColision(): CajaColision | null {
    if (this.apertura >= ABIERTAS_DEL_TODO) return null;
    const m = this.marco.medio;
    const a = this.marco.aMundo(m, -CONFIG.anchoVano / 2);
    const b = this.marco.aMundo(m, CONFIG.anchoVano / 2);
    const g = MEDIO_GROSOR_VANO_CABINA;
    return { minX: Math.min(a.x, b.x) - g, maxX: Math.max(a.x, b.x) + g, minZ: Math.min(a.z, b.z) - g, maxZ: Math.max(a.z, b.z) + g };
  }

  /** El centro del vano, en metros (de ahí suenan la campanilla y las puertas, y de ahí mido a qué distancia está ella). */
  private puerta(): { x: number; z: number } {
    return this.marco.aMundo(this.marco.medio, 0);
  }

  /**
   * Dónde "oye" ella el ascensor: frente a las puertas, ya en el pasillo. Si el ruido saliera de la cabina y la cabina
   * estuviera cerrada, al ir a investigarlo no tendría camino.
   */
  private frente(): { x: number; z: number } {
    return this.marco.aMundo(this.marco.medio + 0.4, 0);
  }

  // --- Los botones ---------------------------------------------------------------------------------------------

  disponible(boton: BotonAscensor, ctx: ContextoJuego): boolean {
    if (boton.hacia === null) return !this.adentro(ctx);
    return this.adentro(ctx) && (this.fase === 'abierto' || this.fase === 'abriendo');
  }

  pulsar(boton: BotonAscensor, ctx: ContextoJuego): void {
    const p = boton.objeto.position;
    ctx.audio.reproducir('clic', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.7 });
    if (boton.hacia === null) this.llamar(ctx);
    else this.elegir(boton.hacia, ctx);
  }

  private llamar(ctx: ContextoJuego): void {
    // La telemetría de las pruebas quiere saber cuándo y cómo se llama el ascensor (y si ella estaba cerca).
    const avisar = (respuesta: 'muerto' | 'viene' | 'abre' | 'nada') => ctx.bus.emit('ascensor-llamado', { piso: ctx.piso.id, respuesta });
    switch (this.fase) {
      case 'muerto':
        avisar('muerto');
        ctx.bus.emit('subtitulo', { texto: this.def.muerto ?? 'No responde.', duracion: 3 });
        return;
      case 'lejos':
        avisar('viene');
        this.venir(ctx);
        return;
      case 'aqui':
      case 'cerrando':
        // Como en todo ascensor: si está aquí (o cerrando), el botón abre.
        avisar('abre');
        this.abrir(ctx);
        return;
      default:
        avisar('nada');
    }
  }

  private elegir(hacia: string, ctx: ContextoJuego): void {
    if (this.fase !== 'abierto' && this.fase !== 'abriendo') return;
    // Un botón que pide algo que no tengo no se enciende: las puertas siguen abiertas.
    const parada = this.def.paradas.find((p) => p.hacia === hacia);
    if (parada?.requiere && !cumpleRequisito(ctx.progreso, parada.requiere)) {
      ctx.bus.emit('subtitulo', { texto: parada.cerrada ?? 'El botón no se enciende.', duracion: 3 });
      return;
    }
    this.destino = hacia;
    this.vista.fijarBoton(this.numeros.indexOf(this.numeroDe(hacia)));
    this.cerrar(ctx);
  }

  // --- Lo que pasa solo -----------------------------------------------------------------------------------------

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.tiempo += dt;
    switch (this.fase) {
      case 'viniendo':
        this.sonido.motorParaElla(dt, ctx, this.frente());
        if (this.tiempo >= TIEMPOS_ASCENSOR.llamada) this.llegar(ctx, false);
        break;
      case 'abriendo':
        this.apertura = Math.min(1, this.apertura + dt / TIEMPOS_ASCENSOR.puertas);
        if (this.apertura >= 1) this.cambiarFase('abierto');
        break;
      case 'abierto':
        this.mientrasAbierto(ctx);
        break;
      case 'cerrando':
        if (this.algoEnLaPuerta(ctx)) {
          this.abrir(ctx);
          break;
        }
        this.apertura = Math.max(0, this.apertura - dt / TIEMPOS_ASCENSOR.puertas);
        if (this.apertura <= 0) this.cerradas(ctx);
        break;
      case 'viajando':
        this.viajar(dt, ctx);
        break;
      case 'reteniendo':
        this.retener(ctx);
        break;
      default:
    }
    this.vista.fijarApertura(this.apertura);
  }

  private cambiarFase(fase: FaseAscensor): void {
    this.fase = fase;
    this.tiempo = 0;
  }

  /** Abiertas: sin nadie adentro, se cierran solas; conmigo adentro y un piso elegido, vuelven a intentar cerrar. */
  private mientrasAbierto(ctx: ContextoJuego): void {
    const adentro = this.adentro(ctx);
    if (this.destino && !adentro) this.olvidarDestino();
    if (this.algoEnLaPuerta(ctx)) {
      this.tiempo = 0;
      return;
    }
    if (this.destino && this.tiempo > TIEMPOS_ASCENSOR.reintento) this.cerrar(ctx);
    else if (!adentro && this.tiempo > TIEMPOS_ASCENSOR.abiertas) this.cerrar(ctx);
  }

  /** ¿Algo no deja cerrar? Yo cruzando el vano, o ella en la puerta o adentro. */
  private algoEnLaPuerta(ctx: ContextoJuego): boolean {
    const j = ctx.jugador.posicion;
    if (this.marco.enLaPuerta(j.x, j.z, CONFIG.radioJugador + MEDIO_GROSOR_VANO_CABINA)) return true;
    const e = ctx.entidad;
    if (!e.fisica) return false;
    const p = this.puerta();
    return this.marco.dentro(e.posicion.x, e.posicion.z) || Math.hypot(e.posicion.x - p.x, e.posicion.z - p.z) < DISTANCIA_SENSOR;
  }

  private venir(ctx: ContextoJuego): void {
    this.cambiarFase('viniendo');
    // Viene desde el piso de la primera parada: el indicador marca ese piso y la flecha hacia este.
    const desde = this.def.paradas[0] ? this.numeroDe(this.def.paradas[0].hacia) : this.def.numero;
    this.flecha = Number(desde) < Number(this.def.numero) ? 1 : -1;
    this.vista.fijarLlamada(true);
    this.vista.fijarIndicador(desde, this.flecha, true);
    this.sonido.arrancarMotor(ctx, true);
    const c = this.marco;
    ctx.bus.emit('sonido-relevante', { descripcion: 'el ascensor, moviéndose por el pozo', x: c.cx, z: c.cz });
  }

  private abrir(ctx: ContextoJuego): void {
    if (this.fase !== 'cerrando') this.olvidarDestino();
    this.cambiarFase('abriendo');
    this.sonido.puertas(ctx, this.puerta());
  }

  private cerrar(ctx: ContextoJuego): void {
    this.cambiarFase('cerrando');
    this.sonido.puertas(ctx, this.puerta());
  }

  private olvidarDestino(): void {
    this.destino = null;
    this.vista.fijarBoton(null);
  }

  /** Terminaron de cerrarse: si elegí un piso y estoy adentro, arranco; si no, la cabina se queda aquí. */
  private cerradas(ctx: ContextoJuego): void {
    if (this.destino && this.adentro(ctx)) {
      this.partir(ctx);
      return;
    }
    this.olvidarDestino();
    this.cambiarFase('aqui');
  }

  private partir(ctx: ContextoJuego): void {
    this.cambiarFase('viajando');
    this.cambiado = false;
    this.flecha = Number(this.numeroDe(this.destino ?? '')) > Number(this.def.numero) ? 1 : -1;
    this.vista.fijarIndicador(this.def.numero, this.flecha, true);
    ctx.director.bloquear(TIEMPOS_ASCENSOR.viaje + 3);
    // Ella no viaja. Si estaba afuera con cuerpo, golpea el metal y se va a las paredes.
    const e = ctx.entidad;
    if (e.fisica) {
      const p = this.puerta();
      if (Math.hypot(e.posicion.x - p.x, e.posicion.z - p.z) < DISTANCIA_GOLPE) {
        ctx.audio.reproducir('golpe', { bus: 'entidad', posicion: { x: p.x, y: 1.3, z: p.z }, volumen: 1, tono: 0.8 });
        ctx.jugador.sobresaltar(0.6);
      }
      e.cambiarEstado('paredes', ctx);
    }
    this.sacudon(ctx, 0.3);
    this.sonido.arrancarMotor(ctx, false);
  }

  private viajar(dt: number, ctx: ContextoJuego): void {
    const efectos = ctx.jugador.efectos;
    efectos.trauma = Math.max(efectos.trauma, VIBRACION);
    if (!this.cambiado && this.tiempo >= TIEMPOS_ASCENSOR.viaje / 2) {
      this.cambiado = true;
      this.cambiarDePiso(ctx);
      return;
    }
    // Ya en el piso nuevo: el motor se oye por sus muros (ella sabe que viene alguien).
    if (this.cambiado) this.sonido.motorParaElla(dt, ctx, this.frente());
    if (this.tiempo >= TIEMPOS_ASCENSOR.viaje) this.llegar(ctx, true);
  }

  /**
   * A la mitad del viaje: le pido al juego el piso de destino. Ahí sigo viajando en su cabina (recibir). Si el
   * destino todavía no existe, el piso que se arma es el último que existe antes de él; si es este, no cambio nada.
   */
  private cambiarDePiso(ctx: ContextoJuego): void {
    const destino = this.destino;
    if (!destino) return;
    const armar = pisoPorId(destino) ? destino : pisoAntesDe(destino)?.id;
    if (!armar || armar === ctx.piso.id) return;
    const transcurrido = this.tiempo;
    const flecha = this.flecha;
    this.sonido.detenerMotor();
    ctx.viaje.porAscensor(armar, () => ctx.nivel.ascensor?.recibir(ctx, transcurrido, flecha, destino));
  }

  /**
   * Llego a este piso a mitad de un viaje (la cabina del piso que dejé quedó atrás): sigo viajando aquí. `destino`
   * es el piso que elegí: casi siempre este; si es uno que todavía no existe, sigo hacia él.
   */
  recibir(ctx: ContextoJuego, transcurrido: number, flecha: number, destino: string): void {
    this.cambiarFase('viajando');
    this.tiempo = transcurrido;
    this.cambiado = true;
    this.destino = destino === ctx.piso.id ? null : destino;
    this.apertura = 0;
    this.flecha = flecha;
    this.vista.fijarApertura(0);
    this.vista.fijarIndicador(this.def.numero, flecha, true);
    // El botón encendido es el mismo que encendí en la otra cabina.
    this.vista.fijarBoton(this.numeros.indexOf(this.numeroDe(destino)));
    ctx.director.bloquear(TIEMPOS_ASCENSOR.viaje - transcurrido + 3);
    this.sacudon(ctx, 0.3);
    this.sonido.arrancarMotor(ctx, false);
  }

  /** Llegó: frena, suena la campanilla (fuerte) y abre, salvo que yo venga adentro y ella esté cerca. */
  private llegar(ctx: ContextoJuego, conmigo: boolean): void {
    this.sonido.detenerMotor();
    this.flecha = 0;
    this.vista.fijarLlamada(false);
    this.vista.fijarIndicador(this.def.numero, 0, true);
    this.sonido.campanilla(ctx, this.puerta(), this.frente());
    if (!conmigo) {
      this.abrir(ctx);
      return;
    }
    // Llegué a un piso que todavía no existe: no abro. Lo que pasa ahora es del guion de este piso.
    const final = this.destino && !pisoPorId(this.destino) ? this.destino : null;
    if (final) {
      this.cambiarFase('aqui');
      ctx.bus.emit('ascensor-fin-recorrido', { hacia: final });
      return;
    }
    this.sacudon(ctx, 0.4);
    this.cambiarFase('reteniendo');
  }

  /** La regla de justicia: no abro con ella cerca. Si no se va, la mando a las paredes. */
  private retener(ctx: ContextoJuego): void {
    const e = ctx.entidad;
    const p = this.puerta();
    const cerca = e.fisica && Math.hypot(e.posicion.x - p.x, e.posicion.z - p.z) < DISTANCIA_JUSTICIA;
    if (!cerca) {
      this.olvidarDestino();
      this.abrir(ctx);
      return;
    }
    if (this.tiempo > TIEMPOS_ASCENSOR.retencionMaxima) e.cambiarEstado('paredes', ctx);
  }

  /** Un golpe de la cabina: la cámara se sacude, suena el freno y la luz titila. */
  private sacudon(ctx: ContextoJuego, fuerza: number): void {
    ctx.jugador.efectos.agregarTrauma(fuerza);
    this.sonido.golpe(ctx);
    this.lampara?.interferir(0.35);
  }

  // --- Lo que pide un guion ----------------------------------------------------------------------------------------

  /**
   * La cabina frena de golpe entre dos pisos (un momento escrito: el Piso 2). Las puertas siguen cerradas, el motor
   * se apaga y la luz enloquece. Solo mientras viaja; sigue con reanudar. Devuelve si se detuvo.
   */
  detener(ctx: ContextoJuego): boolean {
    if (this.fase !== 'viajando') return false;
    this.tiempoAlDetener = this.tiempo;
    this.cambiarFase('detenido');
    this.sonido.detenerMotor();
    this.sacudon(ctx, 0.7);
    this.sonido.golpe(ctx, 1);
    this.lampara?.interferir(2.5);
    return true;
  }

  /** Sigo el viaje desde donde me detuvieron, con un sacudón y el motor otra vez. */
  reanudar(ctx: ContextoJuego): void {
    if (this.fase !== 'detenido') return;
    this.cambiarFase('viajando');
    this.tiempo = this.tiempoAlDetener;
    this.sacudon(ctx, 0.35);
    this.sonido.arrancarMotor(ctx, false);
    ctx.director.bloquear(TIEMPOS_ASCENSOR.viaje - this.tiempo + 3);
  }

  // --- Cargar y la historia ---------------------------------------------------------------------------------------

  /** ¿Ya funciona? Sin lo que pide el piso, está muerto (no responde). */
  private vivo(ctx: ContextoJuego): boolean {
    return !this.def.requiere || cumpleRequisito(ctx.progreso, this.def.requiere);
  }

  /** Al armar el piso o cargar: cerrado, en otro piso (o muerto), en silencio. */
  restablecer(ctx: ContextoJuego): void {
    this.sonido.detenerMotor();
    this.cambiarFase(this.vivo(ctx) ? 'lejos' : 'muerto');
    this.apertura = 0;
    this.destino = null;
    this.cambiado = false;
    this.flecha = 0;
    this.vista.fijarApertura(0);
    this.vista.fijarLlamada(false);
    this.vista.fijarBoton(null);
    const lejos = this.def.paradas[0] ? this.numeroDe(this.def.paradas[0].hacia) : this.def.numero;
    this.vista.fijarIndicador(lejos, 0, this.fase !== 'muerto');
  }

  /** Lo que pedía ya se cumplió en plena partida: despierta, y viene solo (alguien lo llamó desde otro piso). */
  alBandera(nombre: string, ctx: ContextoJuego): void {
    if (this.fase !== 'muerto' || nombre !== this.def.requiere) return;
    this.venir(ctx);
    ctx.bus.emit('sonido-relevante', { descripcion: 'el ascensor se puso en marcha solo', x: this.marco.cx, z: this.marco.cz });
  }
}
