// Aquí está "El Inquilino": la criatura que vive dentro de las paredes.
// Tiene dos modos de existencia:
// - EN LAS PAREDES: no tiene cuerpo. Se mueve a través de los muros y solo
//   se manifiesta con sonidos amortiguados (golpes, rasguños). Oye mejor.
// - FÍSICA: sale por un punto que el jugador no está mirando y camina por
//   el edificio. Abre puertas. Parpadean las luces a su alrededor.
// Su cerebro es la máquina de estados; aquí están sus "músculos":
// moverse, abrir puertas, sonar, aparecer y desaparecer.
import { Vector3, type Scene } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { MotivoCaza, Ruido } from '../nucleo/Eventos';
import type { IdSonido } from '../audio/TiposAudio';
import type { Rejilla } from '../mundo/Rejilla';
import { ModeloEntidad, type PoseEntidad } from './ModeloEntidad';
import { Navegacion } from './Navegacion';
import { Percepcion } from './Percepcion';
import { Memoria } from './Memoria';
import { Imitador } from './Imitador';
import { MaquinaEstados } from './MaquinaEstados';
import type { Celda, NombreEstadoIA } from './TiposIA';
import { EstadoParedes } from './estados/EstadoParedes';
import { EstadoInvestigando } from './estados/EstadoInvestigando';
import { EstadoCazando } from './estados/EstadoCazando';
import { EstadoAcechando } from './estados/EstadoAcechando';
import { EstadoRetirada } from './estados/EstadoRetirada';
import { amortiguar, distancia2D, normalizarAngulo } from '../utilidades/Matematicas';
import { puntoEnVista } from '../director/Visibilidad';

export type ResultadoMovimiento = 'moviendo' | 'llego' | 'sin-camino' | 'abriendo';

export class Entidad {
  readonly posicion = new Vector3();
  readonly modelo = new ModeloEntidad();
  readonly memoria = new Memoria();
  readonly percepcion = new Percepcion();
  readonly maquina = new MaquinaEstados();
  /** Su habilidad más perturbadora: repetir mis pasos (con o sin cuerpo). */
  readonly imitador = new Imitador();
  readonly navegacion: Navegacion;
  rumbo = 0;
  /** true cuando tiene cuerpo en el mundo. */
  fisica = false;
  /** El progreso de la historia decide si ya puede salir de las paredes. */
  puedeManifestarse = false;
  /** El director puede pedirle que salga a acechar. */
  solicitudAcecho = false;
  pose: PoseEntidad = 'quieto';
  velocidadActual = 0;
  /** Por qué estoy cazando: lo que el jugador hizo para delatarse. Lo leo si lo atrapo. */
  motivoCaza: MotivoCaza = 'desconocido';
  /** Si lo que lo delató lo hizo pegado a la pared (la regla central). */
  motivoEnPared = false;

  private camino: Celda[] = [];
  private indiceCamino = 0;
  private abriendo = 0;
  private distanciaPaso = 0;
  private temporizadorInterferencia = 0;

  constructor(escena: Scene, private readonly rejilla: Rejilla) {
    this.navegacion = new Navegacion(rejilla);
    escena.add(this.modelo.raiz);
    for (const estado of [new EstadoParedes(), new EstadoInvestigando(), new EstadoCazando(), new EstadoAcechando(), new EstadoRetirada()]) {
      this.maquina.registrar(estado);
    }
  }

  get estado(): NombreEstadoIA | null {
    return this.maquina.actual;
  }

  cambiarEstado(nombre: NombreEstadoIA, ctx: ContextoJuego): void {
    this.maquina.cambiar(nombre, this, ctx);
  }

  /** Empiezo a cazar recordando QUÉ me delató al jugador (para que su muerte tenga explicación). */
  cazar(motivo: MotivoCaza, ctx: ContextoJuego, enPared = false): void {
    this.motivoCaza = motivo;
    this.motivoEnPared = enPared;
    this.cambiarEstado('cazando', ctx);
  }

  reiniciar(x: number, z: number, ctx: ContextoJuego): void {
    this.posicion.set(x, 0, z);
    this.memoria.reiniciar();
    this.camino = [];
    this.abriendo = 0;
    this.solicitudAcecho = false;
    this.motivoCaza = 'desconocido';
    this.motivoEnPared = false;
    this.imitador.detener();
    this.desvanecer();
    this.cambiarEstado('paredes', ctx);
  }

  distanciaAlJugador(ctx: ContextoJuego): number {
    const j = ctx.jugador.posicion;
    return distancia2D(this.posicion.x, this.posicion.z, j.x, j.z);
  }

  /** La criatura oye un ruido. La percepción decide cuánto le llega. */
  oir(ruido: Ruido, ctx: ContextoJuego): void {
    const percibido = this.percepcion.percibir(ruido, this.posicion.x, this.posicion.z, !this.fisica, ctx);
    if (percibido < CONFIG.entidad.umbralAudicion) return;
    this.memoria.registrarRuido(ruido.x, ruido.z, percibido, ctx.programador.ahora, ruido.origen === 'jugador' ? ruido : null);
    this.maquina.oir(this, ctx, percibido, ruido);
  }

  /** Salgo de la pared en un punto. Sonido de algo que se desprende del muro. */
  manifestar(x: number, z: number, ctx: ContextoJuego): void {
    this.posicion.set(x, 0, z);
    this.fisica = true;
    this.modelo.raiz.position.copy(this.posicion);
    this.modelo.fijarVisible(true);
    this.modelo.forzarPose('quieto');
    this.camino = [];
    ctx.audio.reproducir('crujido_madera', { bus: 'entidad', posicion: { x, y: 1.4, z }, volumen: 0.8, tono: 0.7 });
    ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x, y: 2, z }, volumen: 0.6, retraso: 0.6 });
  }

  /** Vuelvo a las paredes: pierdo el cuerpo. */
  desvanecer(): void {
    this.fisica = false;
    this.modelo.fijarVisible(false);
    this.camino = [];
    this.velocidadActual = 0;
  }

  /** Calculo un camino hacia un punto (en metros). */
  irHacia(x: number, z: number, ctx: ContextoJuego): boolean {
    const desde = { gx: this.rejilla.aCelda(this.posicion.x), gy: this.rejilla.aCelda(this.posicion.z) };
    const hasta = { gx: this.rejilla.aCelda(x), gy: this.rejilla.aCelda(z) };
    const camino = this.navegacion.buscar(desde, hasta, (gx, gy) => (ctx.nivel.consultaPuertaCerrada(gx, gy) ? 3 : 0));
    if (!camino) return false;
    this.camino = camino;
    this.indiceCamino = camino.length > 1 ? 1 : 0;
    return true;
  }

  get tieneCamino(): boolean {
    return this.camino.length > 0 && this.indiceCamino < this.camino.length;
  }

  /** Sigo el camino actual. Si hay una puerta cerrada, me detengo a abrirla. */
  avanzar(dt: number, velocidad: number, ctx: ContextoJuego, violento = false): ResultadoMovimiento {
    if (this.abriendo > 0) {
      this.abriendo -= dt;
      this.velocidadActual = 0;
      return 'abriendo';
    }
    if (!this.tieneCamino) {
      this.velocidadActual = 0;
      return this.camino.length > 0 ? 'llego' : 'sin-camino';
    }
    const celda = this.camino[this.indiceCamino];
    const puerta = ctx.nivel.puertaEn(celda.gx, celda.gy);
    if (puerta && !puerta.abierta && !puerta.enMovimiento) {
      // Ni las puertas con llave la detienen: las fuerza.
      puerta.desbloquear();
      const p = { x: puerta.centro.x, y: 1.1, z: puerta.centro.z };
      if (violento) {
        this.abriendo = 0.35;
        puerta.abrir('golpe');
        ctx.audio.reproducir('portazo', { bus: 'entidad', posicion: p, volumen: 0.9 });
        ctx.bus.emit('sonido-relevante', { descripcion: 'un portazo', x: p.x, z: p.z });
      } else {
        this.abriendo = 1.6;
        puerta.abrir('lento');
        ctx.audio.reproducir('puerta_lenta', { bus: 'entidad', posicion: p, volumen: 0.6 });
        ctx.bus.emit('sonido-relevante', { descripcion: 'una puerta abriéndose', x: p.x, z: p.z });
      }
      return 'abriendo';
    }
    const destinoX = this.rejilla.centro(celda.gx);
    const destinoZ = this.rejilla.centro(celda.gy);
    const dx = destinoX - this.posicion.x;
    const dz = destinoZ - this.posicion.z;
    const distancia = Math.hypot(dx, dz);
    if (distancia < 0.12) {
      this.indiceCamino++;
      return this.tieneCamino ? 'moviendo' : 'llego';
    }
    const paso = Math.min(distancia, velocidad * dt);
    this.posicion.x += (dx / distancia) * paso;
    this.posicion.z += (dz / distancia) * paso;
    this.velocidadActual = velocidad;
    this.mirarHacia(destinoX, destinoZ, dt, 7);
    return 'moviendo';
  }

  /** Me muevo en línea recta ignorando muros (solo dentro de las paredes). */
  deslizarHacia(x: number, z: number, velocidad: number, dt: number): boolean {
    const dx = x - this.posicion.x;
    const dz = z - this.posicion.z;
    const distancia = Math.hypot(dx, dz);
    if (distancia < 0.3) return true;
    const paso = Math.min(distancia, velocidad * dt);
    this.posicion.x += (dx / distancia) * paso;
    this.posicion.z += (dz / distancia) * paso;
    return false;
  }

  mirarHacia(x: number, z: number, dt: number, rapidez = 5): void {
    const objetivo = Math.atan2(x - this.posicion.x, z - this.posicion.z);
    const diferencia = normalizarAngulo(objetivo - this.rumbo);
    this.rumbo = normalizarAngulo(this.rumbo + diferencia * (1 - Math.exp(-rapidez * dt)));
  }

  /** Sonido desde dentro de la pared más cercana a mi posición. */
  sonarEnPared(id: IdSonido, ctx: ContextoJuego, volumen: number, descripcion: string): void {
    const muro = this.rejilla.muroMasCercano(this.posicion.x, this.posicion.z);
    const x = muro ? this.rejilla.centro(muro.gx) : this.posicion.x;
    const z = muro ? this.rejilla.centro(muro.gy) : this.posicion.z;
    ctx.audio.reproducir(id, { bus: 'entidad', posicion: { x, y: 1.2 + Math.random(), z }, dentroPared: true, volumen, reverb: 0.3 });
    ctx.bus.emit('sonido-relevante', { descripcion, x, z });
  }

  /**
   * Busco dónde salir de la pared: una celda transitable cerca del objetivo,
   * que el jugador NO esté viendo y a una distancia mínima de él.
   */
  buscarPuntoSalida(x: number, z: number, ctx: ContextoJuego, distanciaMinima: number, radio = 5): { x: number; z: number } | null {
    const r = this.rejilla;
    const gx0 = r.aCelda(x);
    const gy0 = r.aCelda(z);
    const radioCeldas = Math.ceil(radio / r.celda);
    const j = ctx.jugador.posicion;
    let mejor: { x: number; z: number } | null = null;
    let mejorDistancia = Infinity;
    for (let oy = -radioCeldas; oy <= radioCeldas; oy++) {
      for (let ox = -radioCeldas; ox <= radioCeldas; ox++) {
        const gx = gx0 + ox;
        const gy = gy0 + oy;
        if (!r.esTransitable(gx, gy) || r.esPuerta(gx, gy)) continue;
        const cx = r.centro(gx);
        const cz = r.centro(gy);
        if (distancia2D(cx, cz, j.x, j.z) < distanciaMinima) continue;
        if (puntoEnVista(ctx, cx, 1.2, cz)) continue;
        const d = distancia2D(cx, cz, x, z);
        if (d < mejorDistancia) {
          mejorDistancia = d;
          mejor = { x: cx, z: cz };
        }
      }
    }
    return mejor;
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.memoria.decaer(dt);
    this.imitador.actualizar(ctx);
    const j = ctx.jugador.posicion;
    this.memoria.registrarRastro(j.x, j.z);
    const habitacion = ctx.nivel.habitacionEn(j.x, j.z);
    if (habitacion) this.memoria.registrarHabito(habitacion.id, dt);

    this.maquina.actualizar(this, ctx, dt);

    if (!this.fisica) return;
    // Cuerpo: posición, orientación y animación.
    this.modelo.raiz.position.x = amortiguar(this.modelo.raiz.position.x, this.posicion.x, 20, dt);
    this.modelo.raiz.position.z = amortiguar(this.modelo.raiz.position.z, this.posicion.z, 20, dt);
    this.modelo.raiz.rotation.y = this.rumbo;
    this.modelo.actualizar(dt, this.velocidadActual, this.pose);

    // Pasos pesados según la distancia recorrida.
    this.distanciaPaso += this.velocidadActual * dt;
    const zancada = this.velocidadActual > 2 ? 1.1 : 0.8;
    if (this.distanciaPaso > zancada) {
      this.distanciaPaso = 0;
      const volumen = this.velocidadActual > 2 ? 0.95 : 0.55;
      ctx.audio.reproducir('paso_entidad', { bus: 'entidad', posicion: { x: this.posicion.x, y: 0.1, z: this.posicion.z }, volumen, reverb: 0.6 });
    }

    // Interferencia eléctrica a su alrededor y estrés del jugador por cercanía.
    this.temporizadorInterferencia -= dt;
    if (this.temporizadorInterferencia <= 0) {
      this.temporizadorInterferencia = 0.25;
      for (const lampara of ctx.nivel.lamparas) {
        if (lampara.posicion.distanceTo(this.posicion) < 7) lampara.interferir(0.5);
      }
    }
    const distancia = this.distanciaAlJugador(ctx);
    if (distancia < 10) ctx.jugador.sumarEstres(dt * 0.14 * (1 - distancia / 10));
  }
}
