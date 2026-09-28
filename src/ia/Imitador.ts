// Aquí está la habilidad más perturbadora de El Inquilino: IMITA mis pasos.
// Antes tenía dos ecos distintos (uno en el acecho y otro en el director),
// copiados y sin relación. Ahora es UNA sola habilidad con etapas que el
// jugador descubre en orden, para que cada una se sienta como revelación:
//
//  1. ECO: cada paso mío se repite un instante después, desde atrás.
//     "¿Es un eco del pasillo?"
//  2. PASO DE MÁS: el eco sigue... y cuando me detengo, da UN paso más.
//     "Eso no fue mío."
//  3. REPETICIÓN: me detengo, hay silencio... y luego suenan MIS pasos, con
//     MI ritmo, acercándose. Pausa. Y un último paso que ya no es mío.
//     "Los pasos siguieron después de que yo me detuve."
//
// La etapa NO la decide el azar: sube con lo que el jugador ya vivió y con
// lo que la grabadora le reveló (en el 403 escuchó sus pasos estando quieto).
// Es una regla aprendible que después se rompe a propósito.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { MapaEventos } from '../nucleo/Eventos';
import type { AcabadoPiso } from '../mundo/datos/TiposMapa';
import { aleatorio, limitar } from '../utilidades/Matematicas';

export type EtapaImitacion = 1 | 2 | 3;

interface Punto {
  x: number;
  z: number;
}

export interface OpcionesImitacion {
  etapa: EtapaImitacion;
  /** De dónde salen los pasos imitados en cada momento (la criatura, o un punto detrás de mí). */
  fuente: () => Punto;
  /** Con cuerpo, los pasos salen del cuerpo. Sin cuerpo, se acercan hacia mí. */
  conCuerpo: boolean;
  /** Segundos que dura la imitación (una limpieza garantiza que termine). */
  duracion: number;
}

interface PasoGrabado {
  t: number;
  superficie: AcabadoPiso;
}

/** Pasos que recuerdo del jugador para copiar su ritmo. */
const MEMORIA_PASOS = 8;
/** Cuántos "pasos de más" doy como máximo por imitación (repetirlo mucho lo gasta). */
const RESPUESTAS_MAXIMAS = 2;

export class Imitador {
  private activo = false;
  private opciones: OpcionesImitacion | null = null;
  private readonly pasos: PasoGrabado[] = [];
  private cancelarBus: (() => void) | null = null;
  /** Cada imitación tiene su número: así una limpieza vieja no apaga una imitación nueva. */
  private sesion = 0;
  private ultimoPaso = -Infinity;
  private pendiente = false;
  private respuestas = 0;
  private repitio = false;
  private esperaRepeticion = 1.6;

  get imitando(): boolean {
    return this.activo;
  }

  get etapa(): EtapaImitacion | null {
    return this.opciones?.etapa ?? null;
  }

  iniciar(ctx: ContextoJuego, opciones: OpcionesImitacion): void {
    this.detener();
    this.activo = true;
    this.opciones = opciones;
    this.pendiente = false;
    this.respuestas = 0;
    this.repitio = false;
    this.ultimoPaso = ctx.programador.ahora;
    const sesion = ++this.sesion;
    this.cancelarBus = ctx.bus.on('paso-jugador', (paso) => this.alPaso(paso, ctx));
    // Pase lo que pase (muerte, menú, recarga), esta imitación termina.
    ctx.programador.limpiarDespues(opciones.duracion, () => {
      if (this.sesion === sesion) this.detener();
    });
    ctx.memoria.exposicionesImitacion++;
    ctx.bus.emit('imitacion', { etapa: opciones.etapa, conCuerpo: opciones.conCuerpo });
  }

  detener(): void {
    this.cancelarBus?.();
    this.cancelarBus = null;
    this.activo = false;
    this.opciones = null;
    this.pasos.length = 0;
  }

  /** Cada paso del jugador: lo recuerdo y lo repito como eco. */
  private alPaso(paso: MapaEventos['paso-jugador'], ctx: ContextoJuego): void {
    const o = this.opciones;
    if (!this.activo || !o) return;
    const ahora = ctx.programador.ahora;
    this.pasos.push({ t: ahora, superficie: paso.superficie });
    if (this.pasos.length > MEMORIA_PASOS) this.pasos.shift();
    this.ultimoPaso = ahora;
    this.pendiente = true;
    this.esperaRepeticion = aleatorio(1.3, 2.3);

    // En la etapa 3 el eco casi desaparece: quiero que lo fuerte sea lo que viene después.
    const volumen = o.etapa === 3 ? 0.3 : o.conCuerpo ? 0.5 : 0.55;
    // En la etapa 1 el eco es "perfecto" (parece acústica). Después se desincroniza un poco.
    const retraso = o.etapa === 1 ? 0.27 : aleatorio(0.24, 0.38);
    const p = o.fuente();
    ctx.audio.reproducir(`paso_${paso.superficie}`, { bus: 'entidad', posicion: { x: p.x, y: 0.1, z: p.z }, volumen, retraso, tono: 0.94, reverb: 0.6 });
  }

  /** Reviso si el jugador se detuvo para responder según la etapa. */
  actualizar(ctx: ContextoJuego): void {
    const o = this.opciones;
    if (!this.activo || !o || !this.pendiente) return;
    if (ctx.jugador.rapidez > 0.1) return;
    const quieto = ctx.programador.ahora - this.ultimoPaso;

    if (o.etapa === 2 && quieto > 0.7) {
      this.pendiente = false;
      if (this.respuestas >= RESPUESTAS_MAXIMAS) return;
      this.respuestas++;
      this.pasoDeMas(ctx, o, 0);
    } else if (o.etapa === 3 && quieto > this.esperaRepeticion) {
      this.pendiente = false;
      // La repetición completa ocurre UNA vez por imitación: repetirla la volvería predecible.
      if (this.repitio || this.pasos.length < 3) {
        if (this.respuestas < RESPUESTAS_MAXIMAS) {
          this.respuestas++;
          this.pasoDeMas(ctx, o, 0);
        }
        return;
      }
      this.repitio = true;
      this.repetirRitmo(ctx, o);
    }
  }

  /** Un solo paso, pesado y húmedo: el de la criatura, no el mío. "cercania" = qué tanto se acerca a mí (sin cuerpo). */
  private pasoDeMas(ctx: ContextoJuego, o: OpcionesImitacion, retraso: number, cercania = 0.35): void {
    const p = o.conCuerpo ? o.fuente() : this.puntoHaciaJugador(ctx, o.fuente(), cercania);
    ctx.audio.reproducir('paso_entidad', { bus: 'entidad', posicion: { x: p.x, y: 0.1, z: p.z }, volumen: 0.55, retraso, reverb: 0.5 });
    ctx.programador.despues(retraso, () => ctx.bus.emit('sonido-relevante', { descripcion: 'un paso detrás de ti', x: p.x, z: p.z }));
  }

  /**
   * Repito mis últimos pasos con MI ritmo (mismas pausas, un poco más lentas:
   * imperfecta, como una copia hecha de memoria). Sin cuerpo se acercan.
   * Después, una pausa y un paso más... que ya no es mío.
   */
  private repetirRitmo(ctx: ContextoJuego, o: OpcionesImitacion): void {
    const ultimos = this.pasos.slice(-4);
    const origen = o.fuente();
    let t = 0;
    ultimos.forEach((paso, i) => {
      if (i > 0) t += limitar(paso.t - ultimos[i - 1].t, 0.35, 1.2) * 1.07;
      const p = o.conCuerpo ? origen : this.puntoHaciaJugador(ctx, origen, (i + 1) / (ultimos.length + 2));
      ctx.audio.reproducir(`paso_${paso.superficie}`, {
        bus: 'entidad',
        posicion: { x: p.x, y: 0.1, z: p.z },
        volumen: 0.45 + i * 0.07,
        retraso: t,
        tono: 0.95,
        variacion: 0.02,
        reverb: 0.55,
      });
      if (i === 0) ctx.programador.despues(t, () => ctx.bus.emit('sonido-relevante', { descripcion: 'pasos detrás de ti', x: p.x, z: p.z }));
    });
    // La pausa larga es lo que más pesa: el jugador espera que termine... y no termina.
    this.pasoDeMas(ctx, o, t + aleatorio(1.1, 1.6), 0.82);
  }

  /** Un punto entre el origen y el jugador (fracción 0 = origen, 1 = el jugador). */
  private puntoHaciaJugador(ctx: ContextoJuego, origen: Punto, fraccion: number): Punto {
    const j = ctx.jugador.posicion;
    return { x: origen.x + (j.x - origen.x) * fraccion, z: origen.z + (j.z - origen.z) * fraccion };
  }
}
