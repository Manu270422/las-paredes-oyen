// Aquí está el fondo del menú: se dibuja sobre el pasillo REAL del piso, con la cámara que respira y,
// cada tanto, una figura de pie al fondo. Antes vivía dentro de Juego.ts; es el mismo código.
import { CONFIG } from '../config/ConfiguracionJuego';
import { GRADOS } from '../utilidades/Matematicas';
import type { ContextoJuego } from './ContextoJuego';

export class FondoMenu {
  private temporizador = 12;
  private tiempo = 0;

  /** Dejo el piso como al empezar, sin director, con la criatura en su guarida y la cámara donde dice el paquete. */
  preparar(ctx: ContextoJuego): void {
    ctx.progreso.importar(null);
    ctx.nivel.restablecer(ctx);
    ctx.entidad.reiniciar(ctx.piso.mapa.guaridaEntidad.x * CONFIG.celda, ctx.piso.mapa.guaridaEntidad.y * CONFIG.celda, ctx);
    const { x, y, angulo } = ctx.piso.menu.camara;
    ctx.jugador.teletransportar(x, y, angulo);
    ctx.linterna.reiniciar(1);
    ctx.linterna.encendida = true;
    ctx.director.activo = false;
  }

  /** "conSonido": en la pantalla de inicio el audio todavía espera el primer gesto. */
  actualizar(dt: number, ctx: ContextoJuego, conSonido: boolean): void {
    this.tiempo += dt;
    const camara = ctx.camara;
    const { camara: vista, figura } = ctx.piso.menu;
    camara.position.set(vista.x * CONFIG.celda, 1.55 + Math.sin(this.tiempo * 0.6) * 0.012, vista.y * CONFIG.celda);
    camara.rotation.set(Math.sin(this.tiempo * 0.23) * 0.02 - 0.03, vista.angulo * GRADOS + Math.sin(this.tiempo * 0.17) * 0.05, 0);
    ctx.linterna.actualizar(dt, Infinity, ctx);
    ctx.linterna.bateria = 1;
    ctx.nivel.actualizar(dt, null, camara.position.x, camara.position.z);

    // Cada tanto aparece una figura de pie al fondo del pasillo.
    this.temporizador -= dt;
    const modelo = ctx.entidad.modelo;
    if (this.temporizador <= 0) {
      if (modelo.raiz.visible) {
        modelo.fijarVisible(false);
        this.temporizador = 20 + Math.random() * 25;
      } else {
        modelo.raiz.position.set(figura.x * CONFIG.celda, 0, figura.y * CONFIG.celda);
        modelo.raiz.rotation.y = figura.angulo * GRADOS;
        modelo.forzarPose('quieto');
        modelo.fijarVisible(true);
        this.temporizador = 1.8;
      }
    }
    if (conSonido) {
      ctx.ambiente.actualizar(dt, camara.position.x, camara.position.z, ctx.nivel.rejilla);
      ctx.audio.actualizarOyente(camara);
      ctx.audio.actualizar(dt);
    }
  }
}
