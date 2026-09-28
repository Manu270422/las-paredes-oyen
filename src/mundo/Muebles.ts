// Aquí construyo los muebles por código. Decisión de diseño: la mitad del
// edificio está cubierta con sábanas. Es barato de modelar y es de lo más
// inquietante que existe: la imaginación del jugador rellena lo que hay debajo.
// Una de las sábanas tiene forma de persona de pie. Y a veces ya no está.
import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { BibliotecaMateriales } from '../render/Materiales';
import type { CajaColision } from './Colisiones';
import type { DefMueble, TipoMueble } from './datos/TiposMapa';
import { Ruido2D } from '../utilidades/Ruido';
import { GRADOS } from '../utilidades/Matematicas';

const ruido = new Ruido2D(313);

/** Medidas (ancho, alto, fondo) que ocupa cada mueble cuando está cubierto. */
const MEDIDAS_CUBIERTO: Partial<Record<TipoMueble, [number, number, number]>> = {
  sofa: [2.0, 0.85, 0.9],
  sillon: [0.95, 0.9, 0.9],
  mesa: [1.25, 0.78, 0.85],
  silla: [0.5, 0.95, 0.5],
  cama: [1.1, 0.6, 2.05],
  armario: [1.05, 2.0, 0.6],
  televisor: [0.85, 1.0, 0.55],
};

// Materiales simples compartidos (sin textura) que creo una sola vez.
const materialesSimples = new Map<string, MeshStandardMaterial>();
function simple(nombre: string, color: number, rugosidad: number, metalico = 0): MeshStandardMaterial {
  let m = materialesSimples.get(nombre);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: rugosidad, metalness: metalico });
    materialesSimples.set(nombre, m);
  }
  return m;
}

/** Caja posicionada: la uso para armar muebles con piezas. */
function pieza(ancho: number, alto: number, fondo: number, material: Material, x: number, y: number, z: number): Mesh {
  const malla = new Mesh(new BoxGeometry(ancho, alto, fondo), material);
  malla.position.set(x, y, z);
  return malla;
}

/** Deformo una geometría como tela: pliegues con ruido y caída hacia afuera cerca del piso. */
function deformarComoTela(geometria: BufferGeometry, alto: number, caida: number): BufferGeometry {
  geometria.deleteAttribute('normal');
  geometria.deleteAttribute('uv');
  const unida = mergeVertices(geometria, 1e-4);
  const posiciones = unida.getAttribute('position');
  const uvs: number[] = [];
  for (let i = 0; i < posiciones.count; i++) {
    let x = posiciones.getX(i);
    let y = posiciones.getY(i);
    let z = posiciones.getZ(i);
    const t = 1 - Math.min(1, Math.max(0, y / alto)); // 0 arriba, 1 en el piso
    const radial = Math.hypot(x, z) || 1;
    const pliegue = (ruido.valor(x * 5 + z * 3 + 11, y * 4) - 0.5) * 0.06;
    const abrir = t * t * caida + pliegue * (0.3 + t);
    x += (x / radial) * abrir;
    z += (z / radial) * abrir;
    // La parte de arriba se hunde un poco en el centro.
    if (t < 0.05) y -= (ruido.valor(x * 3, z * 3) * 0.035);
    posiciones.setXYZ(i, x, y, z);
    uvs.push((x + z) / 1.5, y / 1.5);
  }
  unida.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  unida.computeVertexNormals();
  return unida;
}

function crearSabana(ancho: number, alto: number, fondo: number, tela: Material): Mesh {
  const base = new BoxGeometry(ancho + 0.04, alto, fondo + 0.04, 10, 6, 10);
  base.translate(0, alto / 2, 0);
  return new Mesh(deformarComoTela(base, alto, 0.14), tela);
}

/** Una sábana sobre alguien de pie. Perfil de revolución: cabeza, hombros, cuerpo. */
function crearFiguraCubierta(tela: Material): Mesh {
  const perfil = [
    [0.36, 0], [0.3, 0.3], [0.27, 0.7], [0.26, 1.1], [0.27, 1.3], [0.24, 1.42],
    [0.1, 1.5], [0.09, 1.56], [0.12, 1.66], [0.1, 1.78], [0.02, 1.82],
  ].map(([r, y]) => new Vector2(r, y));
  const geometria = new LatheGeometry(perfil, 18);
  // Hombros más anchos que profundos, y la cabeza apenas inclinada.
  geometria.scale(1.25, 1, 0.8);
  return new Mesh(deformarComoTela(geometria, 1.82, 0.08), tela);
}

export class Mueble {
  readonly id: string | null;
  readonly tipo: TipoMueble;
  readonly objeto: Group;
  readonly movible: boolean;
  caja: CajaColision | null = null;
  private readonly bloquea: boolean;
  private readonly posicionInicial: { x: number; z: number; rot: number; visible: boolean };

  constructor(def: DefMueble, objeto: Group, bloquea: boolean) {
    this.id = def.id ?? null;
    this.tipo = def.tipo;
    this.objeto = objeto;
    this.movible = def.movible ?? false;
    this.bloquea = bloquea;
    this.posicionInicial = { x: objeto.position.x, z: objeto.position.z, rot: objeto.rotation.y, visible: true };
    this.recalcularCaja();
  }

  /** Recalculo la colisión cuando el director mueve el mueble. */
  recalcularCaja(): void {
    if (!this.bloquea || !this.objeto.visible) {
      this.caja = null;
      return;
    }
    this.objeto.updateMatrixWorld(true);
    const caja = new Box3().setFromObject(this.objeto);
    const margen = 0.04;
    this.caja = { minX: caja.min.x + margen, maxX: caja.max.x - margen, minZ: caja.min.z + margen, maxZ: caja.max.z - margen };
  }

  restablecer(): void {
    const p = this.posicionInicial;
    this.objeto.position.x = p.x;
    this.objeto.position.z = p.z;
    this.objeto.rotation.y = p.rot;
    this.objeto.visible = p.visible;
    this.recalcularCaja();
  }
}

export function crearMueble(def: DefMueble, materiales: BibliotecaMateriales): Mueble {
  const C = CONFIG.celda;
  const madera = materiales.obtener('madera');
  const tela = materiales.obtener('tela');
  const metal = materiales.obtener('metal');
  const grupo = new Group();
  let bloquea = true;

  const medidas = MEDIDAS_CUBIERTO[def.tipo];
  if (def.tipo === 'figura') {
    grupo.add(crearFiguraCubierta(tela));
  } else if (def.cubierto && medidas) {
    grupo.add(crearSabana(medidas[0], medidas[1], medidas[2], tela));
  } else {
    switch (def.tipo) {
      case 'mesa':
        grupo.add(pieza(1.2, 0.05, 0.8, madera, 0, 0.735, 0));
        for (const [x, z] of [[-0.54, -0.34], [0.54, -0.34], [-0.54, 0.34], [0.54, 0.34]]) grupo.add(pieza(0.05, 0.71, 0.05, madera, x, 0.355, z));
        break;
      case 'silla':
        grupo.add(pieza(0.45, 0.05, 0.45, madera, 0, 0.45, 0));
        for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) grupo.add(pieza(0.04, 0.45, 0.04, madera, x, 0.225, z));
        grupo.add(pieza(0.45, 0.5, 0.04, madera, 0, 0.72, -0.2));
        break;
      case 'cama':
        grupo.add(pieza(1.0, 0.32, 2.0, madera, 0, 0.16, 0));
        grupo.add(pieza(0.95, 0.2, 1.9, tela, 0, 0.42, 0.02));
        grupo.add(pieza(1.0, 0.95, 0.06, madera, 0, 0.475, -1.0));
        break;
      case 'armario':
        grupo.add(pieza(1.0, 2.0, 0.55, madera, 0, 1.0, 0));
        grupo.add(pieza(0.01, 1.9, 0.01, simple('negro', 0x050505, 1), 0, 1.0, 0.28));
        break;
      case 'caja':
        grupo.add(pieza(0.55, 0.52, 0.45, simple('carton', 0x6b5237, 0.95), 0, 0.26, 0));
        break;
      case 'nevera':
        grupo.add(pieza(0.7, 1.7, 0.65, simple('esmalte', 0xb6b2a6, 0.35), 0, 0.85, 0));
        grupo.add(pieza(0.03, 0.4, 0.04, metal, 0.28, 1.25, 0.34));
        break;
      case 'escritorio':
        grupo.add(pieza(1.2, 0.05, 0.6, madera, 0, 0.735, 0));
        grupo.add(pieza(0.04, 0.71, 0.58, madera, -0.58, 0.355, 0));
        grupo.add(pieza(0.4, 0.71, 0.58, madera, 0.4, 0.355, 0));
        break;
      case 'estante':
        grupo.add(pieza(0.9, 1.8, 0.03, madera, 0, 0.9, -0.14));
        for (const y of [0.05, 0.5, 0.95, 1.4, 1.78]) grupo.add(pieza(0.9, 0.03, 0.3, madera, 0, y, 0));
        grupo.add(pieza(0.03, 1.8, 0.3, madera, -0.44, 0.9, 0), pieza(0.03, 1.8, 0.3, madera, 0.44, 0.9, 0));
        break;
      case 'tina': {
        grupo.add(pieza(0.78, 0.55, 1.6, simple('esmalte', 0xb6b2a6, 0.35), 0, 0.275, 0));
        // Agua oscura estancada casi hasta el borde.
        grupo.add(pieza(0.64, 0.02, 1.46, simple('aguaNegra', 0x020303, 0.05), 0, 0.53, 0));
        break;
      }
      case 'tuberia':
        grupo.add(new Mesh(new CylinderGeometry(0.06, 0.06, CONFIG.alturaTecho, 10), metal));
        grupo.children[0].position.y = CONFIG.alturaTecho / 2;
        break;
      case 'bolsa': {
        const bolsa = new Mesh(new SphereGeometry(0.3, 12, 9), simple('bolsa', 0x070707, 0.25));
        bolsa.scale.set(1, 0.8, 0.85);
        bolsa.position.y = 0.22;
        grupo.add(bolsa);
        break;
      }
      case 'baranda':
        grupo.add(pieza(3.6, 0.05, 0.05, metal, 0, 0.95, 0));
        for (let x = -1.7; x <= 1.7; x += 0.34) grupo.add(pieza(0.03, 0.95, 0.03, metal, x, 0.475, 0));
        break;
      case 'televisor':
        grupo.add(pieza(0.8, 0.45, 0.45, madera, 0, 0.225, 0));
        grupo.add(pieza(0.62, 0.5, 0.48, simple('plastico', 0x1a1917, 0.6), 0, 0.7, 0));
        break;
      case 'mesita':
        grupo.add(pieza(0.45, 0.54, 0.4, madera, 0, 0.27, 0));
        break;
      case 'cuadro': {
        const marco = pieza(0.55, 0.42, 0.03, madera, 0, 1.6, 0.015);
        const lienzo = pieza(0.47, 0.34, 0.01, simple('lienzo', 0x1d1a16, 0.9), 0, 1.6, 0.032);
        // Torcido. Si el jugador vuelve, puede que esté derecho.
        marco.rotation.z = 0.06;
        lienzo.rotation.z = 0.06;
        grupo.add(marco, lienzo);
        bloquea = false;
        break;
      }
      case 'sofa':
        grupo.add(pieza(1.9, 0.42, 0.85, simple('tapiz', 0x3a2e24, 0.9), 0, 0.21, 0));
        grupo.add(pieza(1.9, 0.45, 0.2, simple('tapiz', 0x3a2e24, 0.9), 0, 0.64, -0.33));
        break;
      case 'sillon':
        grupo.add(pieza(0.9, 0.42, 0.85, simple('tapiz', 0x3a2e24, 0.9), 0, 0.21, 0));
        grupo.add(pieza(0.9, 0.5, 0.2, simple('tapiz', 0x3a2e24, 0.9), 0, 0.66, -0.33));
        break;
      default:
        break;
    }
  }

  grupo.traverse((o) => {
    if (o instanceof Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  grupo.position.set(def.x * C, 0, def.y * C);
  grupo.rotation.y = (def.rot ?? 0) * GRADOS;
  return new Mueble(def, grupo, bloquea);
}
