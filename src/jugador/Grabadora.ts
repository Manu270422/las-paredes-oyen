// Aquí está mi grabadora de campo, la herramienta del protagonista:
// 1) MEDIR: en cada punto marcado grabo 6 s de "tono de sala". Si me muevo
//    o hago ruido (incluido jadear), la medición se arruina.
//    Y lo que capta el micrófono en esos 6 s es REAL (CapturaGrabadora):
//    al reproducirlo descubro lo que pasó a mi alrededor sin que lo oyera.
// 2) SEÑUELO: la dejo en el piso reproduciendo mis pasos grabados. La
//    criatura va hacia ella. Luego tengo que ir a recogerla... si me atrevo.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Scene } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { CausaRuido, Ruido } from '../nucleo/Eventos';
import type { FuenteSonido } from '../audio/FuenteSonido';
import type { PuntoMedicion } from '../interaccion/objetos/PuntoMedicion';
import { crearZonaToque, vincular, type Interactuable } from '../interaccion/Interactuable';
import { CapturaGrabadora } from './CapturaGrabadora';

const DURACION_MEDICION = 6;
const DURACION_SENUELO = 7;
/** Ruido máximo tolerado durante la medición. */
const TOLERANCIA_RUIDO = 0.11;

/**
 * Lo que pienso cuando una medición se arruina, según QUÉ la arruinó.
 * Decir la causa concreta enseña la regla sin un tutorial: "fue mi respiración".
 */
const MOTIVOS_FALLO: Partial<Record<CausaRuido | 'movimiento', string>> = {
  movimiento: 'Me moví. Tengo que empezar de nuevo.',
  respiracion: 'Mi respiración quedó en la grabación. Otra vez.',
  jadeo: 'Jadeé encima del micrófono. La medición no sirve.',
  'linterna-clic': 'El clic de la linterna quedó grabado.',
  'linterna-zumbido': 'El zumbido de la linterna arruinó la toma.',
  paso: 'Mis pasos quedaron grabados.',
  carrera: 'Mis pasos quedaron grabados.',
};

/** La grabadora tirada en el piso es un interactuable para recogerla. */
class GrabadoraEnPiso implements Interactuable {
  readonly id = 'grabadora-senuelo';
  constructor(
    readonly objeto: Group,
    private readonly dueno: Grabadora,
  ) {
    vincular(objeto, this);
  }
  get activo(): boolean {
    return this.objeto.visible && !this.dueno.senueloSonando;
  }
  texto(): string {
    return 'Recoger la grabadora';
  }
  interactuar(ctx: ContextoJuego): void {
    this.dueno.recogerSenuelo(ctx);
  }
}

export class Grabadora {
  midiendo: PuntoMedicion | null = null;
  progresoMedicion = 0;
  readonly interactuable: GrabadoraEnPiso;
  /** Lo que el micrófono oyó de verdad en la última medición. */
  readonly captura = new CapturaGrabadora();
  private readonly modelo = new Group();
  private inicioX = 0;
  private inicioZ = 0;
  private siseo: FuenteSonido | null = null;
  private senueloTiempo = 0;
  private senueloPaso = 0;
  private colocada = false;

  constructor(escena: Scene) {
    const cuerpo = new MeshStandardMaterial({ color: 0x22201d, roughness: 0.5, metalness: 0.3 });
    const detalle = new MeshStandardMaterial({ color: 0x6d6a63, roughness: 0.4, metalness: 0.7 });
    const caja = new Mesh(new BoxGeometry(0.16, 0.05, 0.08), cuerpo);
    caja.position.y = 0.025;
    const microfono = new Mesh(new CylinderGeometry(0.015, 0.015, 0.06, 10), detalle);
    microfono.rotation.z = Math.PI / 2;
    microfono.position.set(0.1, 0.03, 0);
    const luzRoja = new Mesh(new BoxGeometry(0.01, 0.006, 0.01), new MeshStandardMaterial({ color: 0x300000, emissive: 0xff1100, emissiveIntensity: 2 }));
    luzRoja.position.set(-0.05, 0.053, 0.02);
    this.modelo.add(caja, microfono, luzRoja, crearZonaToque(0.25));
    this.modelo.traverse((o) => {
      // La zona de toque es invisible: no debe proyectar sombra.
      if (o.name !== 'zona-toque') o.castShadow = true;
    });
    this.modelo.visible = false;
    escena.add(this.modelo);
    this.interactuable = new GrabadoraEnPiso(this.modelo, this);
  }

  get senueloSonando(): boolean {
    return this.colocada && this.senueloTiempo > 0;
  }

  /** El señuelo se desbloquea tras la primera medición (ya tengo pasos grabados). */
  puedeUsarSenuelo(ctx: ContextoJuego): boolean {
    return ctx.progreso.criaturaDespierta && !this.colocada && !this.midiendo;
  }

  iniciarMedicion(punto: PuntoMedicion, ctx: ContextoJuego): void {
    if (this.midiendo) return;
    if (this.colocada) {
      ctx.bus.emit('subtitulo', { texto: 'Necesito la grabadora. La dejé en el piso.', duracion: 3 });
      return;
    }
    this.midiendo = punto;
    this.progresoMedicion = 0;
    this.inicioX = ctx.jugador.posicion.x;
    this.inicioZ = ctx.jugador.posicion.z;
    ctx.audio.reproducir('bip', { bus: 'interfaz', volumen: 0.6 });
    this.siseo = ctx.audio.reproducir('siseo_cinta', { bus: 'voz', bucle: true, volumen: 0.12, variacion: 0 });
    this.captura.iniciar(ctx);
    ctx.bus.emit('medicion', { estado: 'inicio', progreso: 0, apartamento: punto.apartamento });
  }

  /** Cualquier ruido mío por encima de la tolerancia arruina la medición. */
  alRuidoJugador(ruido: Ruido, ctx: ContextoJuego): void {
    if (this.midiendo && ruido.intensidad > TOLERANCIA_RUIDO) this.cancelarMedicion(ctx, ruido.causa);
  }

  /** Cancelo la medición. Si doy un motivo, lo digo en voz alta (subtítulo) con su bip de error. */
  cancelarMedicion(ctx: ContextoJuego, motivo: CausaRuido | 'movimiento' | null): void {
    const punto = this.midiendo;
    if (!punto) return;
    this.midiendo = null;
    this.siseo?.detener(0.1);
    this.siseo = null;
    this.captura.cancelar();
    if (motivo) {
      ctx.audio.reproducir('bip', { bus: 'interfaz', volumen: 0.5, tono: 0.6 });
      ctx.bus.emit('subtitulo', { texto: MOTIVOS_FALLO[motivo] ?? 'Demasiado ruido. La medición no sirve.', duracion: 3 });
    }
    ctx.bus.emit('medicion', { estado: 'cancelada', progreso: this.progresoMedicion, apartamento: punto.apartamento, motivo: motivo ?? undefined });
  }

  colocarSenuelo(ctx: ContextoJuego): void {
    if (!this.puedeUsarSenuelo(ctx)) return;
    const j = ctx.jugador;
    const x = j.posicion.x - Math.sin(j.yaw) * 0.5;
    const z = j.posicion.z - Math.cos(j.yaw) * 0.5;
    // Si adelante hay muro, la dejo a mis pies.
    const libre = ctx.nivel.rejilla.esTransitable(ctx.nivel.rejilla.aCelda(x), ctx.nivel.rejilla.aCelda(z));
    this.modelo.position.set(libre ? x : j.posicion.x, 0, libre ? z : j.posicion.z);
    this.modelo.rotation.y = j.yaw;
    this.modelo.visible = true;
    this.colocada = true;
    this.senueloTiempo = DURACION_SENUELO + 1.2;
    this.senueloPaso = 1.2;
    ctx.audio.reproducir('recoger', { bus: 'interfaz', volumen: 0.5 });
    ctx.bus.emit('subtitulo', { texto: 'Dejas la grabadora reproduciendo tus pasos.', duracion: 3 });
    ctx.bus.emit('grabadora', { accion: 'senuelo-colocado' });
  }

  recogerSenuelo(ctx: ContextoJuego): void {
    this.modelo.visible = false;
    this.colocada = false;
    this.senueloTiempo = 0;
    ctx.audio.reproducir('recoger', { bus: 'interfaz', volumen: 0.6 });
    ctx.bus.emit('grabadora', { accion: 'senuelo-recogido' });
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    // --- Medición ---
    const punto = this.midiendo;
    if (punto) {
      const j = ctx.jugador.posicion;
      if (Math.hypot(j.x - this.inicioX, j.z - this.inicioZ) > 0.3) {
        this.cancelarMedicion(ctx, 'movimiento');
      } else {
        this.progresoMedicion = Math.min(1, this.progresoMedicion + dt / DURACION_MEDICION);
        this.captura.actualizar(dt, ctx);
        if (this.progresoMedicion >= 1) {
          this.midiendo = null;
          this.siseo?.detener(0.1);
          this.siseo = null;
          punto.completar();
          // Cierro la cinta ANTES de marcar la bandera: el guion la reproduce al instante.
          this.captura.cerrar();
          ctx.bus.emit('grabacion-captada', { apartamento: punto.apartamento, huellas: this.captura.cantidad, presencia: this.captura.captoPresencia });
          ctx.audio.reproducir('bip', { bus: 'interfaz', volumen: 0.6 });
          ctx.audio.reproducir('bip', { bus: 'interfaz', volumen: 0.6, retraso: 0.18 });
          ctx.bus.emit('medicion', { estado: 'completa', progreso: 1, apartamento: punto.apartamento });
          ctx.progreso.marcar(`medido:${punto.apartamento}`);
        }
      }
    }

    // --- Señuelo: reproduce pasos a intervalos regulares ---
    if (this.colocada && this.senueloTiempo > 0) {
      this.senueloTiempo -= dt;
      this.senueloPaso -= dt;
      if (this.senueloPaso <= 0 && this.senueloTiempo > 0) {
        this.senueloPaso = 0.55;
        const p = this.modelo.position;
        // Suena "a cinta": un poco más grave y opaco que mis pasos reales.
        ctx.audio.reproducir('paso_granito', { posicion: { x: p.x, y: 0.2, z: p.z }, volumen: 0.8, tono: 0.92, reverb: 0.6 });
        ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: CONFIG.ruido.senuelo, origen: 'grabadora', causa: 'senuelo' });
      }
    }
  }

  reiniciar(): void {
    this.captura.cancelar();
    this.midiendo = null;
    this.progresoMedicion = 0;
    this.siseo?.detener(0.05);
    this.siseo = null;
    this.modelo.visible = false;
    this.colocada = false;
    this.senueloTiempo = 0;
  }
}
