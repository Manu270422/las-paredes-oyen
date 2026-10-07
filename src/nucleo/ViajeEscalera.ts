// Aquí está el viaje por una escalera a otro piso, paso a paso:
//   0.00 s  la imagen se va a negro y oigo mis primeros pasos en los escalones
//   0.55 s  ya a oscuras: callo el piso que dejo, armo el de destino y aparezco en la llegada (más pasos)
//   2.05 s  vuelve la imagen y vuelvo a tener el control
// Llego con lo que traía (la linterna y sus pilas, el inventario). Lo que pasó en el piso que dejo queda en el
// progreso: si vuelvo, sigue como lo dejé. Lo saqué de Juego.ts: del juego solo pido lo que es suyo (su
// estado, armar el piso, ponerme en un punto de control y guardar).
import { guardaAlLlegarAOtroPiso } from '../config/Dificultad';
import { pisoPorId } from '../pisos/catalogo';
import type { PaquetePiso } from '../pisos/TiposPiso';
import type { ContextoJuego } from './ContextoJuego';

/**
 * Los tiempos del viaje, en segundos: fundido a negro, cuándo cambio de piso (ya a oscuras), cuánto sigo a
 * oscuras oyendo mis pasos en los escalones y cuánto tarda en volver la imagen.
 */
const VIAJE = { fundido: 0.5, cambio: 0.55, llegada: 1.5, aparecer: 1.2 };

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
  /** Vuelvo a jugar (y pauso si mientras tanto se ocultó la pestaña o se soltó el ratón). */
  llegar(): void;
}

export class ViajeEscalera {
  constructor(private readonly salida: SalidaViaje) {}

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
    if (!this.salida.puedeSalir()) return;
    const desde = ctx.piso.id;
    this.salida.salir();
    this.salida.fundir(true, VIAJE.fundido);
    if (!sinPasos) pasosEscalera(ctx, 2);
    window.setTimeout(() => {
      ctx.programador.cancelarTodo();
      ctx.audio.detenerTodo();
      ctx.audio.fijarSilencioAmbiente(1);
      ctx.ambiente.olvidarFuentes();
      ctx.progreso.cambiarPiso(desde, destino);
      this.salida.armarPiso(destino);
      this.llegarA(llegada, ctx);
      ctx.bus.emit('piso-cambiado', { desde, hacia: destino.id });
      if (!sinPasos) pasosEscalera(ctx, 4);
      window.setTimeout(() => {
        this.salida.fundir(false, VIAJE.aparecer);
        this.salida.llegar();
      }, VIAJE.llegada * 1000);
    }, VIAJE.cambio * 1000);
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
