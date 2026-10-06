// Aquí está mi linterna: la luz principal del juego y parte de la jugabilidad.
// - La sostengo en la mano derecha, abajo: así las sombras se mueven y se
//   ven los contornos (si la pusiera en los ojos, las sombras quedarían ocultas).
// - Sigue a la mirada con un pequeño retraso: se siente como una mano, no una cámara.
// - Parpadea cuando la criatura está cerca (señal aprendible).
// - Con la pila baja, zumba... y ÉL LO OYE.
import { Object3D, PointLight, Quaternion, SpotLight, Vector3, type Scene, type Texture } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { PerfilCalidad } from '../config/PerfilesCalidad';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import { aleatorio } from '../utilidades/Matematicas';

const INTENSIDAD = 28;
const OFFSET_MANO = new Vector3(0.2, -0.17, -0.12);

export class Linterna {
  readonly luz: SpotLight;
  readonly objetivo = new Object3D();
  private readonly rebote: PointLight;
  encendida = false;
  bateria = 1;
  /** Brillo real en este fotograma (0..1), con parpadeos incluidos. */
  factor = 0;
  private apagadaForzada = 0;
  private readonly giroSuave = new Quaternion();
  private readonly posicionMano = new Vector3();
  private readonly adelante = new Vector3();
  private temporizadorZumbido = 2;
  private avisoZumbido = false;

  constructor(escena: Scene, perfil: PerfilCalidad, private readonly cookie: Texture) {
    this.luz = new SpotLight(0xfff0d8, 0, 20, 0.44, 0.55, 2);
    this.luz.shadow.camera.near = 0.1;
    this.luz.shadow.camera.far = 20;
    this.luz.shadow.bias = -0.0004;
    this.luz.shadow.normalBias = 0.03;
    this.luz.target = this.objetivo;
    // Un rebote tenue: simula la luz que devuelven las paredes cercanas (iluminación indirecta barata).
    this.rebote = new PointLight(0xffe6c8, 0, 3.5, 2);
    escena.add(this.luz, this.objetivo, this.rebote);
    this.aplicarPerfil(perfil);
  }

  aplicarPerfil(perfil: PerfilCalidad): void {
    this.luz.castShadow = perfil.sombras;
    this.luz.shadow.mapSize.set(perfil.tamanoSombra, perfil.tamanoSombra);
    this.luz.shadow.map?.dispose();
    this.luz.shadow.map = null;
    // En Three.js el "cookie" (map) de un foco requiere sombras activas.
    this.luz.map = perfil.sombras ? this.cookie : null;
  }

  get iluminando(): boolean {
    return this.factor > 0.15;
  }

  alternar(ctx: ContextoJuego): void {
    this.encendida = !this.encendida;
    const p = ctx.jugador.posicion;
    ctx.audio.reproducir('clic', { bus: 'voz', volumen: 0.5 });
    ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: CONFIG.ruido.clicLinterna, origen: 'jugador', causa: 'linterna-clic' });
    if (this.encendida && this.bateria <= 0) ctx.bus.emit('subtitulo', { texto: 'Sin pilas.', duracion: 2 });
  }

  recargar(cantidad: number): void {
    this.bateria = Math.min(1, this.bateria + cantidad);
  }

  /** El guion puede apagarla unos segundos (sin tocar la batería). */
  forzarApagada(segundos: number): void {
    this.apagadaForzada = Math.max(this.apagadaForzada, segundos);
  }

  /** Anulo un apagado forzado (el guion devuelve la luz de golpe). */
  cancelarApagado(): void {
    this.apagadaForzada = 0;
  }

  reiniciar(bateria: number): void {
    this.bateria = bateria;
    this.encendida = false;
    this.apagadaForzada = 0;
    this.giroSuave.identity();
  }

  /** ¿Un punto está dentro del cono iluminado? (para saber si el jugador VE a la criatura). */
  ilumina(punto: Vector3, alcance = 11): boolean {
    if (!this.iluminando) return false;
    const hacia = punto.clone().sub(this.luz.position);
    const distancia = hacia.length();
    if (distancia > alcance * Math.sqrt(this.factor)) return false;
    return hacia.normalize().angleTo(this.adelante) < this.luz.angle * 0.95;
  }

  actualizar(dt: number, distanciaEntidad: number, ctx: ContextoJuego): void {
    const camara = ctx.camara;
    // La mano sigue a la cámara con retraso.
    this.giroSuave.slerp(camara.quaternion, 1 - Math.exp(-13 * dt));
    this.posicionMano.copy(OFFSET_MANO).applyQuaternion(camara.quaternion).add(camara.position);
    this.luz.position.copy(this.posicionMano);
    this.adelante.set(0, 0, -1).applyQuaternion(this.giroSuave);
    this.objetivo.position.copy(this.posicionMano).addScaledVector(this.adelante, 5);
    this.objetivo.updateMatrixWorld();

    // Batería.
    if (this.encendida && this.bateria > 0) this.bateria = Math.max(0, this.bateria - dt / ctx.dificultad.bateria);

    // Brillo con parpadeos.
    let factor = this.encendida && this.bateria > 0 ? 1 : 0;
    if (factor > 0) {
      // Curva de pila real: se mantiene y cae de golpe al final.
      factor *= 0.35 + 0.65 * Math.min(1, this.bateria / 0.2);
      if (this.bateria < 0.15 && Math.random() < 0.03) factor *= aleatorio(0, 0.4);
      // La criatura cerca: interferencia errática.
      if (distanciaEntidad < 9 && Math.random() < 0.35 * (1 - distanciaEntidad / 9) + 0.05) factor *= Math.random() < 0.5 ? 0.04 : aleatorio(0.3, 0.9);
    }
    if (this.apagadaForzada > 0) {
      this.apagadaForzada -= dt;
      factor = 0;
    }
    this.factor = factor;
    this.luz.intensity = INTENSIDAD * factor;
    this.rebote.intensity = 0.55 * factor;
    this.rebote.position.copy(this.posicionMano).addScaledVector(this.adelante, 1.3);

    // Regla que se rompe: con la pila baja, la linterna zumba y la criatura lo oye.
    if (this.encendida && this.bateria > 0 && this.bateria < 0.25) {
      this.temporizadorZumbido -= dt;
      if (this.temporizadorZumbido <= 0) {
        this.temporizadorZumbido = 2.2;
        const p = ctx.jugador.posicion;
        ctx.audio.reproducir('zumbido', { bus: 'voz', volumen: 0.05, tono: 4, variacion: 0.02 });
        ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: CONFIG.ruido.zumbidoLinterna, origen: 'jugador', causa: 'linterna-zumbido' });
        if (!this.avisoZumbido) {
          this.avisoZumbido = true;
          ctx.bus.emit('subtitulo', { texto: '[La linterna zumba]', duracion: 3, tipo: 'efecto' });
        }
      }
    }
  }
}
