// Aquí está el viaje por una escalera a otro piso, paso a paso (con fundido: pulsando E en la boca del tramo):
//   0.00 s  la imagen se va a negro y oigo mis primeros pasos en los escalones
//   0.55 s  ya a oscuras: callo el piso que dejo, armo el de destino y aparezco en la llegada (más pasos)
//   2.05 s  vuelve la imagen y vuelvo a tener el control
// Caminando (lo normal), el viaje empieza al cruzar el descanso de lado a lado: el pozo es igual en los dos pisos,
// así que el cambio es un parpadeo y sigo en el mismo punto del descanso, ahora del otro piso. Ella no cruza
// conmigo: puede seguirme por el tramo hasta el descanso, y esos segundos expuesto son el costo de huir por aquí.
// En ascensor tampoco hay negro: a mitad del viaje, con las puertas cerradas, armo el piso de destino y sigo en el
// mismo punto de su cabina, que es idéntica (ver mundo/Ascensor.ts).
// Llego con lo que traía (la linterna y sus pilas, el inventario). Lo que pasó en el piso que dejo queda en el
// progreso: si vuelvo, sigue como lo dejé. Lo saqué de Juego.ts: del juego solo pido lo que es suyo (su
// estado, armar el piso, ponerme en un punto de control y guardar).
//
// La primera vez que salgo de un piso completado, su resumen sale en una tarjeta sobre el negro, y el negro dura
// lo que dura la tarjeta (E o Esc la adelantan). Mientras tanto el mundo está detenido: no le da ventaja a nadie.
import { guardaAlLlegarAOtroPiso } from '../config/Dificultad';
import { pisoPorId } from '../pisos/catalogo';
import type { PaquetePiso } from '../pisos/TiposPiso';
import type { TramoPie } from '../mundo/EscaleraCaminable';
import type { ContextoJuego, PuenteViaje } from './ContextoJuego';
import type { ModoViaje } from './Eventos';

/**
 * Los tiempos del viaje, en segundos: fundido a negro, cuándo cambio de piso (ya a oscuras), cuánto sigo a
 * oscuras oyendo mis pasos en los escalones y cuánto tarda en volver la imagen.
 */
const VIAJE = { fundido: 0.5, cambio: 0.55, llegada: 1.5, aparecer: 1.2 };
/** Caminando, el cambio de piso es un parpadeo (salvo que salga la tarjeta de un piso completado). */
const PARPADEO = { fundido: 0.12, cambio: 0.15, llegada: 0.05, aparecer: 0.3 };
/** En ascensor no hay negro: la cabina es la misma en los dos pisos y el cambio pasa con las puertas cerradas. */
const EN_CABINA = { fundido: 0, cambio: 0, llegada: 0, aparecer: 0 };
/** Cuánto más dura el negro con la tarjeta de un piso completado, y desde cuándo se puede adelantar (segundos). */
const RESUMEN = { extra: 3.5, adelantarDesde: 0.8 };


/** Lo que el viaje le pide al juego sin conocerlo. */
export interface SalidaViaje {
  /** ¿Puedo salir ahora? Solo mientras se juega: no desde un menú, una muerte u otro viaje. */
  puedeSalir(): boolean;
  /** Paso a viajar: a oscuras, sin moverme ni interactuar. */
  salir(): void;
  fundir(aNegro: boolean, segundos: number): void;
  /** Cambio el piso armado por el de destino (su nivel, la criatura en su plano, su guion). */
  armarPiso(destino: PaquetePiso): void;
  /** Me pongo en el punto de control `llegada` del piso ya armado, con el piso como lo dejó la historia. */
  ponerEn(llegada: string): void;
  guardar(): void;
  /** Caminando: después de llegar, me pongo en el punto del descanso donde iba, con la mirada y el tramo que traía. */
  colocar(x: number, y: number, z: number, yaw: number, pitch: number, pie: TramoPie): void;
  /** Vuelvo a jugar (y pauso si mientras tanto se ocultó la pestaña o se soltó el ratón). */
  llegar(): void;
  /** Al salir de `desde`: su resumen si lo completé y no lo he visto (una sola vez), o null. */
  resumenAlSalir(desde: string): { titulo: string; subtitulo: string } | null;
}

export class ViajeEscalera {
  /** La llegada pendiente mientras se ve una tarjeta: E o Esc la adelantan. */
  private tarjeta: { temporizador: number; desde: number; llegar: () => void } | null = null;

  constructor(private readonly salida: SalidaViaje) {}

  /** Adelanto la tarjeta de un piso completado (si ya lleva un momento en pantalla). */
  adelantar(): void {
    const t = this.tarjeta;
    if (!t || performance.now() - t.desde < RESUMEN.adelantarDesde * 1000) return;
    window.clearTimeout(t.temporizador);
    t.llegar();
  }

  /** Un tramo de escalera me pide ir al piso `hacia`. */
  cambiarDePiso(hacia: string, llegada: string, ctx: ContextoJuego): void {
    const destino = pisoPorId(hacia);
    if (destino) {
      this.viajar(destino, llegada, ctx);
      return;
    }
    // No debería pasar (paquetesDePiso valida cada escalera contra el catálogo), pero si pasa no me quedo colgado.
    ctx.bus.emit('subtitulo', { texto: 'La escalera no lleva a ninguna parte.', duracion: 2.5 });
  }

  /** Viajo a `llegada` de `destino`. `sinPasos`: cuando no bajo por una escalera (despertar tras el final). */
  viajar(destino: PaquetePiso, llegada: string, ctx: ContextoJuego, sinPasos = false): void {
    this.ir(destino, llegada, ctx, sinPasos ? 'despertar' : 'fundido');
  }

  /** Lo que el contexto del juego ofrece a los tramos y al ascensor (el contexto se lee al usarlo: cambia con el piso). */
  puente(ctx: () => ContextoJuego): PuenteViaje {
    return {
      cambiarDePiso: (hacia, llegada) => this.cambiarDePiso(hacia, llegada, ctx()),
      porAscensor: (hacia, alLlegar) => this.porAscensor(hacia, ctx(), alLlegar),
    };
  }

  /**
   * A mitad de un viaje en ascensor: armo el piso de destino sin negro (salvo la tarjeta de un piso completado) y me
   * dejan en el mismo punto de la cabina, que está en la misma celda en los dos pisos, mirando hacia donde miraba.
   * Llego al punto inicial del piso (de ahí reaparezco si muero antes de otro punto de control) y de inmediato me
   * paso a la cabina. `alLlegar`: el ascensor del piso nuevo retoma el viaje.
   */
  porAscensor(hacia: string, ctx: ContextoJuego, alLlegar: () => void): void {
    const destino = pisoPorId(hacia);
    if (!destino) {
      ctx.bus.emit('subtitulo', { texto: 'El ascensor no lleva a ninguna parte.', duracion: 2.5 });
      return;
    }
    const j = ctx.jugador;
    const { x, z } = j.posicion;
    const { yaw, pitch } = j;
    this.ir(destino, destino.puntoInicial, ctx, 'cabina', () => {
      this.salida.colocar(x, 0, z, yaw, pitch, 'piso');
      alLlegar();
    });
  }

  /** Cada fotograma (caminando): si crucé el descanso hacia un tramo que lleva a otro piso, voy. */
  revisarCruce(ctx: ContextoJuego): void {
    if (ctx.ajustes.valores.escalerasConFundido || !this.salida.puedeSalir()) return;
    const j = ctx.jugador;
    const cruce = ctx.nivel.escaleras.cruce(j.pie, j.posicion.x, j.posicion.z);
    const destino = cruce ? pisoPorId(cruce.def.hacia) : undefined;
    if (!cruce || !destino) return;
    const { yaw, pitch } = j;
    const desde = ctx.piso.id;
    this.ir(destino, cruce.def.llegada, ctx, 'caminando', () => {
      // El mismo punto del descanso, en la escalera del otro piso que lleva de vuelta al que dejé.
      const escalera = ctx.nivel.escaleras.llegadaDesde(desde);
      if (!escalera) return;
      const p = escalera.aMundo(cruce.u, cruce.v);
      const y = escalera.altura(cruce.sigue, p.x, p.z);
      this.salida.colocar(p.x, y, p.z, yaw + escalera.marco.angulo - cruce.angulo, pitch, cruce.sigue);
    });
  }

  private ir(destino: PaquetePiso, llegada: string, ctx: ContextoJuego, modo: ModoViaje, colocar?: () => void): void {
    if (!this.salida.puedeSalir()) return;
    const desde = ctx.piso.id;
    // El resumen lo tomo ANTES de llegar: la llegada guarda, y así la tarjeta queda vista en la partida. Con
    // tarjeta, aun caminando, el negro dura lo que ella (el piso completado merece su momento).
    const resumen = destino.id === desde ? null : this.salida.resumenAlSalir(desde);
    const t = resumen ? VIAJE : modo === 'caminando' ? PARPADEO : modo === 'cabina' ? EN_CABINA : VIAJE;
    this.salida.salir();
    if (t !== EN_CABINA) this.salida.fundir(true, t.fundido);
    if (modo === 'fundido') pasosEscalera(ctx, 2);
    window.setTimeout(() => {
      ctx.programador.cancelarTodo();
      ctx.audio.detenerTodo();
      ctx.audio.fijarSilencioAmbiente(1);
      ctx.ambiente.olvidarFuentes();
      ctx.progreso.cambiarPiso(desde, destino);
      this.salida.armarPiso(destino);
      this.llegarA(llegada, ctx);
      colocar?.();
      ctx.bus.emit('piso-cambiado', { desde, hacia: destino.id, por: modo });
      if (modo === 'fundido') pasosEscalera(ctx, 4);
      if (resumen) ctx.bus.emit('tarjeta', { ...resumen, estilo: 'capitulo' });
      const llegar = () => {
        this.tarjeta = null;
        this.salida.fundir(false, t.aparecer);
        this.salida.llegar();
      };
      const espera = (t.llegada + (resumen ? RESUMEN.extra : 0)) * 1000;
      const temporizador = window.setTimeout(llegar, espera);
      if (resumen) this.tarjeta = { temporizador, desde: performance.now(), llegar };
    }, t.cambio * 1000);
  }

  /** Acabo de llegar al piso ya armado: aparezco en su punto de control `llegada`. */
  private llegarA(llegada: string, ctx: ContextoJuego): void {
    // Banderas de arranque del piso: el director y la criatura las leen al ponerme en el punto.
    for (const b of ctx.piso.banderasAlLlegar ?? []) ctx.progreso.marcarSilencioso(b);
    ctx.director.cambiarDePiso();
    this.salida.ponerEn(llegada);
    // Llegar a un piso es avanzar: como un punto de control, reinicia el alivio por muertes seguidas y guarda
    // (salvo donde no hay puntos de control: en Pesadilla, morir sigue siendo empezar de cero).
    ctx.memoria.muertesSinProgreso = 0;
    if (guardaAlLlegarAOtroPiso(ctx.dificultad)) this.salida.guardar();
  }
}

/** Mis pasos en los escalones, a oscuras: el viaje se oye aunque no se vea. */
function pasosEscalera(ctx: ContextoJuego, cuantos: number): void {
  for (let i = 0; i < cuantos; i++) {
    ctx.audio.reproducir('paso_granito', { bus: 'voz', volumen: 0.55, variacion: 0.07, reverb: 0.5, retraso: 0.05 + i * 0.38 });
  }
}
