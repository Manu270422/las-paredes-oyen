// Aquí está lo que pasa cuando la criatura me atrapa, paso a paso:
//   0.00 s  susto frente a la cámara (el grito)
//   0.75 s  fundido rápido a negro
//   1.50 s  pantalla de muerte: QUÉ oyó, y lo hace sonar como ella lo oyó
// Antes usaba setTimeout (tiempo real del navegador): si la pestaña se
// congelaba o el juego iba lento, la secuencia se desfasaba de la animación.
// Ahora avanza con el tiempo del juego, en el mismo bucle que todo lo demás.
import type { ContextoJuego } from './ContextoJuego';
import { explicarMuerte, type ExplicacionMuerte } from '../narrativa/ExplicacionesMuerte';
import { mostrarSusto } from './Susto';

/** Segundos entre que me atrapa y aparece la pantalla de muerte. */
export const DURACION_SUSTO_MUERTE = 1.5;
const MOMENTO_FUNDIDO = 0.75;

/** Lo que la secuencia le pide al juego (UI y limpieza) sin conocerlo. */
export interface SalidaMuerte {
  fundir(aNegro: boolean, segundos: number): void;
  /** Detengo el mundo: sonidos, fuentes del ambiente y guardo estadísticas. */
  apagarMundo(): void;
  mostrarPantalla(datos: { titulo: string; linea: string; consejo: string | null }): void;
}

export class SecuenciaMuerte {
  private tiempo = 0;
  private fundido = false;
  private mostrada = true;
  private explicacion: ExplicacionMuerte | null = null;
  private primeraVez = false;

  /** Mientras dura el susto sigo animando cámara y linterna; después, estoy muerto. */
  get enSusto(): boolean {
    return this.tiempo < DURACION_SUSTO_MUERTE;
  }

  iniciar(ctx: ContextoJuego): void {
    this.tiempo = 0;
    this.fundido = false;
    this.mostrada = false;
    const memoria = ctx.memoria;
    memoria.muertes++;
    memoria.muertesSinProgreso++;
    const motivo = ctx.entidad.motivoCaza;
    const enPared = ctx.entidad.motivoEnPared;
    const j = ctx.jugador.posicion;
    ctx.bus.emit('jugador-atrapado', { x: j.x, z: j.z, motivo, enPared });
    this.explicacion = explicarMuerte(motivo, enPared);
    // El consejo práctico solo la primera vez por causa: la segunda, basta el sonido.
    this.primeraVez = !memoria.consejosVistos.has(this.explicacion.clave);
    memoria.consejosVistos.add(this.explicacion.clave);
    mostrarSusto(ctx, 'muerte');
  }

  actualizar(dt: number, ctx: ContextoJuego, salida: SalidaMuerte): void {
    if (this.mostrada) return;
    this.tiempo += dt;
    if (!this.fundido && this.tiempo >= MOMENTO_FUNDIDO) {
      this.fundido = true;
      salida.fundir(true, 0.12);
    }
    if (this.tiempo < DURACION_SUSTO_MUERTE || !this.explicacion) return;
    this.mostrada = true;
    const e = this.explicacion;
    salida.apagarMundo();
    salida.mostrarPantalla({ titulo: e.titulo, linea: e.linea, consejo: this.primeraVez ? e.consejo : null });
    salida.fundir(false, 0);
    const eco = e.eco;
    if (!eco) return;
    for (let i = 0; i < eco.repeticiones; i++) {
      ctx.audio.reproducir(eco.id, { bus: 'efectos', volumen: eco.volumen, tono: eco.tono ?? 1, retraso: 0.6 + i * eco.intervalo, dentroPared: true, reverb: 0.55, variacion: 0.03 });
    }
  }
}
