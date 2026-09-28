// Aquí decido con qué está interactuando el jugador. Lanzo un rayo desde
// el centro de la vista; si no toca nada, uso un pequeño cono de asistencia
// (clave en táctil y mando). También verifico que no haya un muro en medio.
import { Raycaster, Vector2, Vector3, type Object3D } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { Interactuable } from './Interactuable';

const CENTRO = new Vector2(0, 0);
/** Ángulo máximo (en radianes) del cono de asistencia. */
const CONO_ASISTENCIA = 0.2;

export class SistemaInteraccion {
  enfocado: Interactuable | null = null;
  private readonly rayo = new Raycaster();
  private readonly temporal = new Vector3();
  private readonly adelante = new Vector3();

  constructor() {
    this.rayo.far = CONFIG.distanciaInteraccion;
  }

  private buscarDueno(objeto: Object3D | null): Interactuable | null {
    let actual: Object3D | null = objeto;
    while (actual) {
      const dueno = actual.userData.interactuable as Interactuable | undefined;
      if (dueno) return dueno;
      actual = actual.parent;
    }
    return null;
  }

  private visibleSinMuros(ctx: ContextoJuego, punto: Vector3): boolean {
    const camara = ctx.camara.position;
    // Acorto el segmento un poco para que el propio muro donde está pegado el objeto no lo bloquee.
    const dx = punto.x - camara.x;
    const dz = punto.z - camara.z;
    const largo = Math.hypot(dx, dz);
    if (largo < 0.3) return true;
    const f = (largo - 0.22) / largo;
    // La celda donde está el propio objeto no cuenta como obstáculo. Sin esto, una puerta CERRADA
    // se bloqueaba a sí misma (su hoja está dentro de su celda) y nunca se podía abrir.
    const celda = ctx.nivel.rejilla.celda;
    const propioGx = Math.floor(punto.x / celda);
    const propioGy = Math.floor(punto.z / celda);
    const puertaCerrada = (gx: number, gy: number): boolean =>
      gx === propioGx && gy === propioGy ? false : ctx.nivel.consultaPuertaCerrada(gx, gy);
    return ctx.nivel.rejilla.hayLineaDeVision(camara.x, camara.z, camara.x + dx * f, camara.z + dz * f, puertaCerrada);
  }

  actualizar(ctx: ContextoJuego, quiereInteractuar: boolean): void {
    const candidatos = ctx.nivel.interactuables.filter((i) => i.activo);
    const objetos = candidatos.map((i) => i.objeto);
    this.rayo.setFromCamera(CENTRO, ctx.camara);

    let elegido: Interactuable | null = null;
    const impactos = this.rayo.intersectObjects(objetos, true);
    for (const impacto of impactos) {
      const dueno = this.buscarDueno(impacto.object);
      if (dueno && dueno.activo && this.visibleSinMuros(ctx, impacto.point)) {
        elegido = dueno;
        break;
      }
    }

    // Asistencia: el más centrado dentro de un cono pequeño y a distancia de interacción.
    if (!elegido) {
      ctx.camara.getWorldDirection(this.adelante);
      let mejorAngulo = CONO_ASISTENCIA;
      for (const candidato of candidatos) {
        candidato.objeto.getWorldPosition(this.temporal);
        const distancia = this.temporal.distanceTo(ctx.camara.position);
        if (distancia > CONFIG.distanciaInteraccion) continue;
        const direccion = this.temporal.clone().sub(ctx.camara.position).normalize();
        const angulo = direccion.angleTo(this.adelante);
        if (angulo < mejorAngulo && this.visibleSinMuros(ctx, this.temporal)) {
          mejorAngulo = angulo;
          elegido = candidato;
        }
      }
    }

    this.enfocado = elegido;
    if (quiereInteractuar && elegido) elegido.interactuar(ctx);
  }
}
