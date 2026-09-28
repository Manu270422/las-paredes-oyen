// Aquí respondo la pregunta más importante para asustar bien:
// "¿El jugador está viendo este punto?". Casi todo lo que cambia en el mundo
// debe ocurrir cuando NO mira. Y lo poco que ocurre a la vista, debe ocurrir
// en el borde de su visión, para que dude de lo que vio.
import { Vector3 } from 'three';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { ConsultaPuertaCerrada } from '../mundo/Rejilla';

const hacia = new Vector3();
const adelante = new Vector3();
const punto = new Vector3();

/** Ángulo (radianes) entre donde mira el jugador y un punto. */
export function anguloDesdeMirada(ctx: ContextoJuego, x: number, y: number, z: number): number {
  const camara = ctx.camara;
  hacia.set(x - camara.position.x, y - camara.position.y, z - camara.position.z);
  if (hacia.lengthSq() < 1e-6) return 0;
  camara.getWorldDirection(adelante);
  return hacia.normalize().angleTo(adelante);
}

/** Mitad del campo de visión horizontal real (depende de la forma de la pantalla). */
export function mitadCampoHorizontal(ctx: ContextoJuego): number {
  const camara = ctx.camara;
  const vertical = (camara.fov * Math.PI) / 360;
  return Math.atan(Math.tan(vertical) * camara.aspect);
}

/**
 * Las puertas cerradas que tapan la vista hacia un punto, SALVO la de la celda
 * del propio punto. La hoja de una puerta cerrada está dentro de su celda: si
 * contara como obstáculo, la puerta se taparía a sí misma y nunca estaría "a la
 * vista" (el mismo fallo que impedía abrirlas). Con esto el director ya no puede
 * cambiar una puerta cerrada mientras la estoy mirando.
 */
export function puertasQueTapan(ctx: ContextoJuego, x: number, z: number): ConsultaPuertaCerrada {
  const celda = ctx.nivel.rejilla.celda;
  const propioGx = Math.floor(x / celda);
  const propioGy = Math.floor(z / celda);
  return (gx, gy) => (gx === propioGx && gy === propioGy ? false : ctx.nivel.consultaPuertaCerrada(gx, gy));
}

/** ¿El punto está dentro de la vista y sin muros en medio? (con un margen de seguridad). */
export function puntoEnVista(ctx: ContextoJuego, x: number, y: number, z: number, margen = 0.12): boolean {
  if (anguloDesdeMirada(ctx, x, y, z) > mitadCampoHorizontal(ctx) + margen) return false;
  const c = ctx.camara.position;
  return ctx.nivel.rejilla.hayLineaDeVision(c.x, c.z, x, z, puertasQueTapan(ctx, x, z));
}

/** ¿Hay luz suficiente en ese punto para ver algo? */
export function puntoIluminado(ctx: ContextoJuego, x: number, y: number, z: number): boolean {
  punto.set(x, y, z);
  if (ctx.linterna.ilumina(punto)) return true;
  return ctx.nivel.lamparas.some((l) => l.brillo > 0.3 && l.posicion.distanceTo(punto) < 3.5);
}

/** ¿El jugador está viendo a la criatura (en vista, iluminada y a menos de 14 m)? */
export function entidadVisibleParaJugador(ctx: ContextoJuego): boolean {
  const e = ctx.entidad;
  if (!e.fisica || e.distanciaAlJugador(ctx) > 14) return false;
  const p = e.posicion;
  return puntoEnVista(ctx, p.x, 1.5, p.z, 0) && puntoIluminado(ctx, p.x, 1.4, p.z);
}
