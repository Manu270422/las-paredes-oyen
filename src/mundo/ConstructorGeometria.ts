// Aquí convierto la rejilla de texto en geometría 3D real.
// Solo genero las caras visibles (piso, techo y muros que dan a un espacio),
// agrupadas por material: pocas llamadas de dibujo = buen rendimiento en móvil.
//
// Detalle de calidad: las puertas no son un hueco de 1.3 m. Creo un vano
// de 0.95 x 2.1 m con dintel y jambas, como una puerta de verdad en un muro grueso.
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3 } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { BibliotecaMateriales, IdMaterial } from '../render/Materiales';
import type { Rejilla } from './Rejilla';
import type { AcabadoPared, AcabadoPiso, DefHabitacion } from './datos/TiposMapa';
import type { CajaColision } from './Colisiones';

const MATERIAL_PARED: Record<AcabadoPared, IdMaterial> = {
  pintura: 'paredPintura',
  papel: 'paredPapel',
  azulejo: 'paredAzulejo',
  concreto: 'paredConcreto',
};

const MATERIAL_PISO: Record<AcabadoPiso, IdMaterial> = {
  granito: 'pisoGranito',
  parque: 'pisoParque',
  azulejo: 'pisoAzulejo',
  concreto: 'pisoConcreto',
};

/** Acumulo vértices de un material antes de crear su malla. */
class Acumulador {
  readonly posiciones: number[] = [];
  readonly normales: number[] = [];
  readonly uvs: number[] = [];
  readonly indices: number[] = [];

  /**
   * Agrego un cuadrilátero. Si el orden de los vértices no coincide con la normal
   * deseada, lo invierto: así nunca me preocupo por el sentido del giro.
   */
  cuadro(vertices: Vector3[], normal: Vector3, uv: number[]): void {
    const [a, b, c] = vertices;
    const cruz = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    let orden = [0, 1, 2, 3];
    if (cruz.dot(normal) < 0) orden = [0, 3, 2, 1];
    const base = this.posiciones.length / 3;
    for (const i of orden) {
      const v = vertices[i];
      this.posiciones.push(v.x, v.y, v.z);
      this.normales.push(normal.x, normal.y, normal.z);
      this.uvs.push(uv[i * 2], uv[i * 2 + 1]);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  crearGeometria(): BufferGeometry {
    const geometria = new BufferGeometry();
    geometria.setAttribute('position', new Float32BufferAttribute(this.posiciones, 3));
    geometria.setAttribute('normal', new Float32BufferAttribute(this.normales, 3));
    geometria.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2));
    geometria.setIndex(this.indices);
    geometria.computeBoundingSphere();
    return geometria;
  }
}

export interface ResultadoGeometria {
  grupo: Group;
  cajasEstaticas: CajaColision[];
}

type BuscarHabitacion = (gx: number, gy: number) => DefHabitacion | null;

const DIRECCIONES = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
] as const;

export function construirGeometria(
  rejilla: Rejilla,
  habitacionDe: BuscarHabitacion,
  materiales: BibliotecaMateriales,
): ResultadoGeometria {
  const C = CONFIG.celda;
  const H = CONFIG.alturaTecho;
  const HP = CONFIG.alturaPuerta;
  const relleno = (C - CONFIG.anchoVano) / 2;
  const acumuladores = new Map<IdMaterial, Acumulador>();
  const cajasEstaticas: CajaColision[] = [];

  const acumulador = (id: IdMaterial): Acumulador => {
    let a = acumuladores.get(id);
    if (!a) {
      a = new Acumulador();
      acumuladores.set(id, a);
    }
    return a;
  };

  /** Para celdas de puerta busco la habitación de algún vecino. */
  const habitacionCercana = (gx: number, gy: number): DefHabitacion | null => {
    const propia = habitacionDe(gx, gy);
    if (propia) return propia;
    for (const d of DIRECCIONES) {
      const vecina = habitacionDe(gx + d.dx, gy + d.dy);
      if (vecina) return vecina;
    }
    return null;
  };

  const materialPared = (h: DefHabitacion | null): IdMaterial => (h ? MATERIAL_PARED[h.pared] : 'paredPintura');
  const materialPiso = (h: DefHabitacion | null): IdMaterial => (h ? MATERIAL_PISO[h.piso] : 'pisoConcreto');
  const llevaGuardaescoba = (h: DefHabitacion | null) => !h || h.pared === 'papel' || h.pared === 'pintura';

  /**
   * Agrego un muro vertical en el plano definido por dos puntos del piso (p0 → p1),
   * entre las alturas y0 e y1, mirando en la dirección "normal".
   */
  const muro = (id: IdMaterial, p0: Vector3, p1: Vector3, y0: number, y1: number, normal: Vector3, guardaescoba: boolean) => {
    const escala = materiales.escala(id);
    // La coordenada u avanza a lo largo del muro; v es la altura (así el zócalo queda siempre a la misma altura).
    const u0 = (p0.x + p0.z) / escala;
    const u1 = (p1.x + p1.z) / escala;
    acumulador(id).cuadro(
      [new Vector3(p0.x, y0, p0.z), new Vector3(p1.x, y0, p1.z), new Vector3(p1.x, y1, p1.z), new Vector3(p0.x, y1, p0.z)],
      normal,
      [u0, y0 / escala, u1, y0 / escala, u1, y1 / escala, u0, y1 / escala],
    );
    if (guardaescoba && y0 === 0) {
      // Guardaescoba: una franja de madera oscura de 9 cm, separada 1.2 cm del muro.
      const off = normal.clone().multiplyScalar(0.012);
      const a = p0.clone().add(off);
      const b = p1.clone().add(off);
      const g = acumulador('guardaescoba');
      g.cuadro([new Vector3(a.x, 0, a.z), new Vector3(b.x, 0, b.z), new Vector3(b.x, 0.09, b.z), new Vector3(a.x, 0.09, a.z)], normal, [0, 0, 1, 0, 1, 1, 0, 1]);
      g.cuadro(
        [new Vector3(p0.x, 0.09, p0.z), new Vector3(p1.x, 0.09, p1.z), new Vector3(b.x, 0.09, b.z), new Vector3(a.x, 0.09, a.z)],
        new Vector3(0, 1, 0),
        [0, 0, 1, 0, 1, 1, 0, 1],
      );
    }
  };

  const suelo = (id: IdMaterial, x0: number, z0: number, x1: number, z1: number, y: number, haciaArriba: boolean) => {
    const e = materiales.escala(id);
    acumulador(id).cuadro(
      [new Vector3(x0, y, z0), new Vector3(x1, y, z0), new Vector3(x1, y, z1), new Vector3(x0, y, z1)],
      new Vector3(0, haciaArriba ? 1 : -1, 0),
      [x0 / e, z0 / e, x1 / e, z0 / e, x1 / e, z1 / e, x0 / e, z1 / e],
    );
  };

  /**
   * Marco de ~6 cm alrededor del vano, SOLO VISUAL (no agrega colisiones): dos jambas y un cabezal pegados
   * a la cara del muro, por fuera del hueco (el vano sigue midiendo 95 cm). Va 1.6 cm delante del muro
   * para tapar el final del guardaescoba, como en un marco de verdad. Hace que la hoja y el muro se lean
   * como una sola pieza.
   */
  const ANCHO_MARCO = 0.06;
  const SALIDA_MARCO = 0.016;
  const marco = (centro: Vector3, normal: Vector3) => {
    const mitad = CONFIG.anchoVano / 2;
    const lado = new Vector3(normal.z, 0, -normal.x);
    const punto = (t: number) => centro.clone().addScaledVector(lado, t).addScaledVector(normal, SALIDA_MARCO);
    const tira = (t0: number, t1: number, y0: number, y1: number) => muro('madera', punto(t0), punto(t1), y0, y1, normal, false);
    tira(-mitad - ANCHO_MARCO, -mitad, 0, HP + ANCHO_MARCO);
    tira(mitad, mitad + ANCHO_MARCO, 0, HP + ANCHO_MARCO);
    tira(-mitad, mitad, HP, HP + ANCHO_MARCO);

    // Las tiras NO flotan: las cierro con sus cantos (1.6 cm de fondo) para que, vistas desde abajo o
    // de lado, el marco sea una moldura con grosor y no un plano suelto que deja un escalón contra el dintel.
    const punto3 = (t: number, y: number, fondo: number) => centro.clone().addScaledVector(lado, t).addScaledVector(normal, fondo).setY(y);
    const canto = (t: number, y0: number, y1: number, haciaMas: boolean) =>
      acumulador('madera').cuadro(
        [punto3(t, y0, 0), punto3(t, y0, SALIDA_MARCO), punto3(t, y1, SALIDA_MARCO), punto3(t, y1, 0)],
        lado.clone().multiplyScalar(haciaMas ? 1 : -1),
        [0, 0, 0.1, 0, 0.1, 0.1, 0, 0.1],
      );
    const tapa = (t0: number, t1: number, y: number, haciaArriba: boolean) =>
      acumulador('madera').cuadro(
        [punto3(t0, y, 0), punto3(t1, y, 0), punto3(t1, y, SALIDA_MARCO), punto3(t0, y, SALIDA_MARCO)],
        new Vector3(0, haciaArriba ? 1 : -1, 0),
        [0, 0, 0.1, 0, 0.1, 0.1, 0, 0.1],
      );
    const tope = HP + ANCHO_MARCO;
    canto(-mitad - ANCHO_MARCO, 0, tope, false); // canto exterior de la jamba izquierda
    canto(-mitad, 0, HP, true); // canto interior de la jamba izquierda (hacia el vano)
    canto(mitad, 0, HP, false); // canto interior de la jamba derecha
    canto(mitad + ANCHO_MARCO, 0, tope, true); // canto exterior de la jamba derecha
    tapa(-mitad - ANCHO_MARCO, -mitad, tope, true); // arriba de cada jamba y del cabezal
    tapa(mitad, mitad + ANCHO_MARCO, tope, true);
    tapa(-mitad, mitad, tope, true);
    tapa(-mitad, mitad, HP, false); // la cara de abajo del cabezal, que se ve desde el vano
  };

  for (let gy = 0; gy < rejilla.alto; gy++) {
    for (let gx = 0; gx < rejilla.ancho; gx++) {
      if (!rejilla.esTransitable(gx, gy)) continue;
      const x0 = gx * C;
      const x1 = x0 + C;
      const z0 = gy * C;
      const z1 = z0 + C;
      const esPuerta = rejilla.esPuerta(gx, gy);
      const habitacion = habitacionCercana(gx, gy);

      suelo(materialPiso(habitacion), x0, z0, x1, z1, 0, true);
      // En las puertas el "techo" es la cara inferior del dintel.
      suelo('techo', x0, z0, x1, z1, esPuerta ? HP : H, false);

      if (esPuerta) {
        construirVano(gx, gy, x0, x1, z0, z1);
        continue;
      }

      const idPared = materialPared(habitacion);
      const guarda = llevaGuardaescoba(habitacion);
      // Cada lado: si el vecino es muro, levanto el muro; si es puerta, levanto el dintel sobre ella.
      const lados = [
        { dx: 1, dy: 0, p0: new Vector3(x1, 0, z0), p1: new Vector3(x1, 0, z1), n: new Vector3(-1, 0, 0) },
        { dx: -1, dy: 0, p0: new Vector3(x0, 0, z1), p1: new Vector3(x0, 0, z0), n: new Vector3(1, 0, 0) },
        { dx: 0, dy: 1, p0: new Vector3(x1, 0, z1), p1: new Vector3(x0, 0, z1), n: new Vector3(0, 0, -1) },
        { dx: 0, dy: -1, p0: new Vector3(x0, 0, z0), p1: new Vector3(x1, 0, z0), n: new Vector3(0, 0, 1) },
      ];
      for (const lado of lados) {
        const nx = gx + lado.dx;
        const ny = gy + lado.dy;
        if (rejilla.esMuro(nx, ny)) muro(idPared, lado.p0, lado.p1, 0, H, lado.n, guarda);
        else if (rejilla.esPuerta(nx, ny)) {
          // Sobre la puerta: el muro del dintel, de 2.1 m hasta el techo.
          muro(idPared, lado.p0, lado.p1, HP, H, lado.n, false);
          // Y a los lados del vano: la cara de las jambas que da a esta habitación.
          const haciaX = lado.dx !== 0;
          const a = lado.p0;
          const b = lado.p1;
          if (haciaX) {
            const zMin = Math.min(a.z, b.z);
            const zMax = Math.max(a.z, b.z);
            muro(idPared, new Vector3(a.x, 0, zMin), new Vector3(a.x, 0, zMin + relleno), 0, HP, lado.n, guarda);
            muro(idPared, new Vector3(a.x, 0, zMax - relleno), new Vector3(a.x, 0, zMax), 0, HP, lado.n, guarda);
          } else {
            const xMin = Math.min(a.x, b.x);
            const xMax = Math.max(a.x, b.x);
            muro(idPared, new Vector3(xMin, 0, a.z), new Vector3(xMin + relleno, 0, a.z), 0, HP, lado.n, guarda);
            muro(idPared, new Vector3(xMax - relleno, 0, a.z), new Vector3(xMax, 0, a.z), 0, HP, lado.n, guarda);
          }
        }
      }
    }
  }

  /** Construyo las caras interiores del vano (las jambas) y sus colisiones. */
  function construirVano(gx: number, gy: number, x0: number, x1: number, z0: number, z1: number): void {
    const pasoEnZ = rejilla.esMuro(gx - 1, gy) && rejilla.esMuro(gx + 1, gy);
    const id = materialPared(habitacionCercana(gx, gy));
    if (pasoEnZ) {
      // Paso norte-sur: las jambas están a los lados en X.
      muro(id, new Vector3(x0 + relleno, 0, z1), new Vector3(x0 + relleno, 0, z0), 0, HP, new Vector3(1, 0, 0), false);
      muro(id, new Vector3(x1 - relleno, 0, z0), new Vector3(x1 - relleno, 0, z1), 0, HP, new Vector3(-1, 0, 0), false);
      cajasEstaticas.push({ minX: x0, maxX: x0 + relleno, minZ: z0, maxZ: z1 });
      cajasEstaticas.push({ minX: x1 - relleno, maxX: x1, minZ: z0, maxZ: z1 });
      marco(new Vector3((x0 + x1) / 2, 0, z0), new Vector3(0, 0, -1));
      marco(new Vector3((x0 + x1) / 2, 0, z1), new Vector3(0, 0, 1));
    } else {
      // Paso este-oeste: las jambas están arriba y abajo en Z.
      muro(id, new Vector3(x0, 0, z0 + relleno), new Vector3(x1, 0, z0 + relleno), 0, HP, new Vector3(0, 0, 1), false);
      muro(id, new Vector3(x1, 0, z1 - relleno), new Vector3(x0, 0, z1 - relleno), 0, HP, new Vector3(0, 0, -1), false);
      cajasEstaticas.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z0 + relleno });
      cajasEstaticas.push({ minX: x0, maxX: x1, minZ: z1 - relleno, maxZ: z1 });
      marco(new Vector3(x0, 0, (z0 + z1) / 2), new Vector3(-1, 0, 0));
      marco(new Vector3(x1, 0, (z0 + z1) / 2), new Vector3(1, 0, 0));
    }
  }

  const grupo = new Group();
  grupo.name = 'geometria-estatica';
  for (const [id, acc] of acumuladores) {
    const malla = new Mesh(acc.crearGeometria(), materiales.obtener(id));
    malla.name = `estatica-${id}`;
    malla.receiveShadow = true;
    malla.castShadow = true;
    malla.matrixAutoUpdate = false;
    malla.updateMatrix();
    grupo.add(malla);
  }
  return { grupo, cajasEstaticas };
}
