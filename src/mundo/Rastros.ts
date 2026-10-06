// Aquí pongo en el mundo los RASTROS de un piso a partir de sus DATOS: sangre vieja en el piso o en un muro,
// rayas de lápiz, un conteo rayado. No brillan ni se marcan en la interfaz: casi no se ven sin linterna, y
// el jugador los descubre solo. Cada uno cuenta un pedazo de la historia sin una palabra en pantalla.
//
// También vigilo la primera vez que el jugador VE cada uno (de cerca, de frente, sin muros en medio y con
// luz) para la telemetría: un rastro que nadie encuentra no está contando nada, y eso lo quiero saber.
import { Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { DefRastro, TipoRastro } from '../pisos/TiposPiso';
import { texturaRastro } from '../render/texturas/TexturasRastros';
import { GRADOS, limitar } from '../utilidades/Matematicas';
import type { Lampara } from './Lampara';
import type { ConsultaPuertaCerrada, Rejilla } from './Rejilla';

/** Separación del muro o del piso: evita el parpadeo de profundidad sin que se note. */
const SEPARACION = 0.004;
/**
 * Qué tan liso es cada rastro bajo la linterna. La sangre seca de un charco sobre madera todavía devuelve
 * un poco de brillo (así la linterna lo "descubre" al pasar); el lápiz brilla apenas; el yeso rayado, nada.
 */
const RUGOSIDAD: Record<TipoRastro, number> = { charco: 0.42, mano: 0.62, estatura: 0.72, conteo: 0.95 };

/** Lo que necesito saber del detalle de las texturas del juego (del perfil de calidad). */
export interface DetalleTexturas {
  readonly tamano: number;
  readonly anisotropia: number;
}

/** ¿El rastro va en el piso? (los demás van en un muro). */
export function rastroEnPiso(def: DefRastro): boolean {
  return def.tipo === 'charco';
}

/**
 * Pongo un rastro en su sitio. Se llama "rastro:<id>". En un muro se pega a la cara como un rótulo; en el
 * piso queda acostado, con la parte de ARRIBA del dibujo hacia donde dice `rot`.
 */
export function ponerRastro(def: DefRastro, detalle: DetalleTexturas): Mesh {
  // Con texturas de 256 (gama baja) pinto a la mitad de resolución: la cuarta parte del trabajo al cargar.
  const textura = texturaRastro(def, limitar(detalle.tamano / 512, 0.5, 1), detalle.anisotropia);
  if (def.tipo === 'mano' && def.espejo) {
    textura.repeat.set(-1, 1);
    textura.offset.set(1, 0);
  }
  const material = new MeshStandardMaterial({
    map: textura,
    transparent: true,
    depthWrite: false,
    roughness: RUGOSIDAD[def.tipo],
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const malla = new Mesh(new PlaneGeometry(def.ancho, def.alto), material);
  malla.name = `rastro:${def.id}`;
  malla.receiveShadow = true;
  const C = CONFIG.celda;
  const angulo = def.rot * GRADOS;
  if (rastroEnPiso(def)) {
    // Acostado (mirando arriba) y girado: la parte de arriba del dibujo apunta a (sin rot, cos rot).
    malla.rotation.set(-Math.PI / 2, angulo + Math.PI, 0, 'YXZ');
    malla.position.set(def.x * C, SEPARACION, def.y * C);
  } else {
    malla.rotation.y = angulo;
    malla.position.set(def.x * C + Math.sin(angulo) * SEPARACION, alturaDe(def), def.y * C + Math.cos(angulo) * SEPARACION);
  }
  return malla;
}

/** La altura del centro de un rastro de muro (los de piso quedan a ras del suelo). */
function alturaDe(def: DefRastro): number {
  return def.tipo === 'charco' ? 0 : def.altura;
}

/** El punto que miro para decidir si el jugador vio un rastro: su centro, un poco fuera de la superficie. */
export function puntoDelRastro(def: DefRastro): Vector3 {
  const C = CONFIG.celda;
  if (rastroEnPiso(def)) return new Vector3(def.x * C, 0.05, def.y * C);
  const angulo = def.rot * GRADOS;
  return new Vector3(def.x * C + Math.sin(angulo) * 0.05, alturaDe(def), def.y * C + Math.cos(angulo) * 0.05);
}

/** Cuándo cuenta como visto: de cerca (los trazos finos no se distinguen de lejos) y casi de frente. */
const VISTO = { distancia: 4.5, angulo: 32 * GRADOS, cadaSegundos: 0.25 };
const hacia = new Vector3();
const adelante = new Vector3();

/** Vigilo la primera vez que el jugador ve cada rastro y lo aviso por el bus (`rastro-visto`). */
export class VigiaRastros {
  private readonly pendientes: Array<{ id: string; punto: Vector3 }>;
  private espera = 0;

  constructor(
    defs: readonly DefRastro[],
    private readonly rejilla: Rejilla,
    private readonly lamparas: readonly Lampara[],
    private readonly puertaCerrada: ConsultaPuertaCerrada,
  ) {
    this.pendientes = defs.map((d) => ({ id: d.id, punto: puntoDelRastro(d) }));
  }

  /** Los que todavía no ha visto (para las pruebas). */
  get sinVer(): readonly string[] {
    return this.pendientes.map((p) => p.id);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    if (this.pendientes.length === 0) return;
    this.espera -= dt;
    if (this.espera > 0) return;
    this.espera = VISTO.cadaSegundos;
    const camara = ctx.camara;
    camara.getWorldDirection(adelante);
    for (let i = this.pendientes.length - 1; i >= 0; i--) {
      const { id, punto } = this.pendientes[i];
      hacia.copy(punto).sub(camara.position);
      if (hacia.length() > VISTO.distancia || hacia.angleTo(adelante) > VISTO.angulo) continue;
      if (!this.rejilla.hayLineaDeVision(camara.position.x, camara.position.z, punto.x, punto.z, this.puertaCerrada)) continue;
      const conLuz = ctx.linterna.ilumina(punto, VISTO.distancia + 1) || this.lamparas.some((l) => l.brillo > 0.3 && l.posicion.distanceTo(punto) < 3.5);
      if (!conLuz) continue;
      this.pendientes.splice(i, 1);
      ctx.bus.emit('rastro-visto', { id });
    }
  }
}
