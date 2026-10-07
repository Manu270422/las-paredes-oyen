// Aquí está el jugador: un técnico de sonido en primera persona.
// Movimiento, mirada, agacharse, correr, escuchar y el RUIDO que hago.
// Cada paso emite un ruido cuya intensidad depende de cómo me muevo,
// del piso que piso y de si voy pegado a una pared (la regla central).
import { PerspectiveCamera, Vector3 } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { EstadoEntrada } from '../entrada/AccionesEntrada';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { AcabadoPiso } from '../mundo/datos/TiposMapa';
import type { IdSonido } from '../audio/TiposAudio';
import { resolverCirculo } from '../mundo/Colisiones';
import { amortiguar, GRADOS, limitar, normalizarAngulo } from '../utilidades/Matematicas';
import { EfectosCamara } from './EfectosCamara';
import { Respiracion } from './Respiracion';
import { Corazon } from './Corazon';

const FACTOR_SUPERFICIE: Record<AcabadoPiso, number> = { granito: 1, parque: 1.1, azulejo: 1.15, concreto: 1 };

export class Jugador {
  readonly camara: PerspectiveCamera;
  /** Posición de mis pies. */
  readonly posicion = new Vector3();
  readonly efectos = new EfectosCamara();
  readonly respiracion = new Respiracion();
  readonly corazon = new Corazon();
  yaw = 0;
  pitch = 0;
  agachado = false;
  escuchando = false;
  corriendo = false;
  estamina = 1;
  estres = 0;
  /** 0..1 suavizado del modo escuchar (para audio y postprocesado). */
  nivelEscucha = 0;
  /** Segundos que llevo sin moverme. */
  tiempoQuieto = 0;
  superficie: AcabadoPiso = 'concreto';
  private agotado = false;
  private vx = 0;
  private vz = 0;
  private rapidezReal = 0;
  private alturaOjos: number = CONFIG.alturaOjos;
  private distanciaRecorrida = 0;
  private pasosDados = 0;
  private inclinacion = 0;
  private sustoFov = 0;

  constructor(aspecto: number) {
    this.camara = new PerspectiveCamera(72, aspecto, 0.05, 60);
    this.camara.rotation.order = 'YXZ';
  }

  /** Hacia dónde queda un punto del mundo respecto a donde miro, como flecha (para los subtítulos con dirección). */
  direccionHacia(x: number, z: number): string {
    const angulo = Math.atan2(-(x - this.posicion.x), -(z - this.posicion.z));
    const relativo = normalizarAngulo(angulo - this.yaw);
    const abs = Math.abs(relativo);
    if (abs < Math.PI / 4) return '↑';
    if (abs > (3 * Math.PI) / 4) return '↓';
    return relativo > 0 ? '←' : '→';
  }

  /** Coloco al jugador en un punto (en celdas) mirando hacia un ángulo (grados). */
  teletransportar(x: number, y: number, anguloGrados: number): void {
    this.posicion.set(x * CONFIG.celda, 0, y * CONFIG.celda);
    this.yaw = anguloGrados * GRADOS;
    this.pitch = 0;
    this.vx = 0;
    this.vz = 0;
    this.agachado = false;
    this.estamina = 1;
    this.estres = 0;
    this.tiempoQuieto = 0;
    this.efectos.reiniciar();
    this.respiracion.reiniciar();
  }

  get rapidez(): number {
    return this.rapidezReal;
  }

  sumarEstres(cantidad: number): void {
    this.estres = limitar(this.estres + cantidad, 0, 1);
  }

  /** Susto: sacudida de cámara y un golpe de FOV (la vista "se cierra"). */
  sobresaltar(intensidad: number): void {
    this.efectos.agregarTrauma(intensidad * 0.6);
    this.sustoFov = Math.max(this.sustoFov, intensidad);
    this.sumarEstres(intensidad * 0.4);
  }

  actualizar(dt: number, entrada: EstadoEntrada, ctx: ContextoJuego, controlesActivos: boolean): void {
    const ajustes = ctx.ajustes.valores;
    const e = controlesActivos ? entrada : null;

    // --- Mirada ---
    if (e) {
      this.yaw -= e.mirarX;
      this.pitch = limitar(this.pitch - e.mirarY, -1.45, 1.45);
      if (e.agacharse) this.agachado = !this.agachado;
    }
    this.escuchando = e?.escuchar ?? false;
    this.nivelEscucha = amortiguar(this.nivelEscucha, this.escuchando ? 1 : 0, 6, dt);

    // --- Velocidad según mi forma de moverme ---
    const moverX = e?.moverX ?? 0;
    const moverY = e?.moverY ?? 0;
    const magnitud = Math.min(1, Math.hypot(moverX, moverY));
    if (this.agotado && this.estamina > 0.4) this.agotado = false;
    this.corriendo = !!e?.correr && moverY > 0.3 && !this.agachado && !this.escuchando && !this.agotado && this.estamina > 0.02;
    const velocidad = this.escuchando
      ? CONFIG.velocidadEscuchando
      : this.agachado
        ? CONFIG.velocidadAgachado
        : this.corriendo
          ? CONFIG.velocidadCorrer
          : CONFIG.velocidadCaminar;

    if (this.corriendo && magnitud > 0.1) {
      this.estamina -= dt / CONFIG.duracionEstamina;
      if (this.estamina <= 0) {
        this.estamina = 0;
        this.agotado = true;
      }
    } else {
      this.estamina = Math.min(1, this.estamina + dt / (CONFIG.duracionEstamina * 1.4));
    }

    // --- Dirección relativa a donde miro ---
    const seno = Math.sin(this.yaw);
    const coseno = Math.cos(this.yaw);
    const deseadoX = (coseno * moverX - seno * moverY) * velocidad;
    const deseadoZ = (-seno * moverX - coseno * moverY) * velocidad;
    this.vx = amortiguar(this.vx, deseadoX, 11, dt);
    this.vz = amortiguar(this.vz, deseadoZ, 11, dt);

    const antesX = this.posicion.x;
    const antesZ = this.posicion.z;
    this.posicion.x += this.vx * dt;
    this.posicion.z += this.vz * dt;
    resolverCirculo(this.posicion, CONFIG.radioJugador, ctx.nivel.cajasCercanas(this.posicion.x, this.posicion.z));
    this.rapidezReal = Math.hypot(this.posicion.x - antesX, this.posicion.z - antesZ) / Math.max(dt, 1e-4);

    // --- Pasos sincronizados con el balanceo de la cabeza ---
    const longitud = CONFIG.longitudPaso * (this.corriendo ? 1.3 : this.agachado ? 0.75 : 1);
    if (this.rapidezReal > 0.12) {
      this.distanciaRecorrida += this.rapidezReal * dt;
      this.tiempoQuieto = 0;
      const pasos = Math.floor(this.distanciaRecorrida / longitud);
      if (pasos > this.pasosDados) {
        this.pasosDados = pasos;
        this.darPaso(ctx);
      }
    } else {
      this.tiempoQuieto += dt;
    }

    // --- Estado interno ---
    const esfuerzo = this.agotado ? 0.9 : this.corriendo ? 0.6 : 0;
    this.estres = Math.max(0, this.estres - dt * 0.035);
    this.respiracion.actualizar(dt, e?.aguantar ?? false, esfuerzo, this.estres, ctx, this.posicion.x, this.posicion.z);
    this.corazon.actualizar(dt, this.estres, ctx);
    this.efectos.actualizar(dt, ajustes.reducirDestellos);

    // --- Cámara ---
    this.alturaOjos = amortiguar(this.alturaOjos, this.agachado ? CONFIG.alturaOjosAgachado : CONFIG.alturaOjos, 8, dt);
    const fase = (this.distanciaRecorrida / longitud) * Math.PI;
    const amplitud = (this.corriendo ? 0.055 : this.agachado ? 0.018 : 0.03) * Math.min(1, this.rapidezReal / 1.5) * (ajustes.movimientoCabeza ? 1 : 0.2);
    const bobY = (Math.abs(Math.sin(fase)) - 0.5) * amplitud;
    const bobX = Math.sin(fase) * amplitud * 0.6;
    this.inclinacion = amortiguar(this.inclinacion, -moverX * 0.02 * (ajustes.movimientoCabeza ? 1 : 0), 6, dt);

    this.camara.position.set(
      this.posicion.x + coseno * bobX + this.efectos.desplazamiento.x,
      this.alturaOjos + bobY + this.efectos.desplazamiento.y,
      this.posicion.z - seno * bobX,
    );
    this.camara.rotation.set(this.pitch + this.efectos.giroX, this.yaw + this.efectos.giroY, this.inclinacion + this.efectos.giroZ);

    this.sustoFov = Math.max(0, this.sustoFov - dt * 2.5);
    const fovObjetivo = ajustes.campoVision + (this.corriendo ? 4 : 0) - this.nivelEscucha * 6 - this.sustoFov * 8;
    const fov = amortiguar(this.camara.fov, fovObjetivo, 5, dt);
    if (Math.abs(fov - this.camara.fov) > 0.01) {
      this.camara.fov = fov;
      this.camara.updateProjectionMatrix();
    }
  }

  private darPaso(ctx: ContextoJuego): void {
    const habitacion = ctx.nivel.habitacionEn(this.posicion.x, this.posicion.z);
    if (habitacion) this.superficie = habitacion.piso;
    const r = CONFIG.ruido;
    const base = this.agachado ? r.pasoAgachado : this.corriendo ? r.pasoCorriendo : r.pasoCaminando;
    // La regla central: pegado a la pared, el edificio lleva mi sonido.
    const pegado = ctx.nivel.rejilla.distanciaAPared(this.posicion.x, this.posicion.z) < r.distanciaPared;
    const intensidad = base * FACTOR_SUPERFICIE[this.superficie] * (pegado ? r.multiplicadorPared : 1);
    const volumen = this.agachado ? 0.22 : this.corriendo ? 0.75 : 0.45;
    ctx.audio.reproducir(`paso_${this.superficie}` as IdSonido, { bus: 'voz', volumen, variacion: 0.07, reverb: 0.35 });
    const causa = this.corriendo ? 'carrera' : 'paso';
    ctx.bus.emit('ruido', { x: this.posicion.x, z: this.posicion.z, intensidad, origen: 'jugador', causa, pared: pegado });
    ctx.bus.emit('paso-jugador', { x: this.posicion.x, z: this.posicion.z, superficie: this.superficie, intensidad });
    if (this.corriendo) ctx.entrada.vibrar(0.05, 20);
  }
}
