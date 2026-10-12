// Aquí construyo el cuerpo de "El Inquilino". Decisiones de diseño:
// - Demasiado alto (2.25 m) para los techos de 2.7 m: tiene que encorvarse.
// - Brazos que llegan a las rodillas, dedos largos de dos falanges, con uñas.
// - Sin ojos: dos cuencas hundidas donde deberían estar. Es ciego: vive del oído.
// - Cerrada, la boca es solo una ranura. Abierta, la mandíbula baja de más (se desencaja) y tiene dientes.
// - Demacrado: se le marcan las costillas, la columna y los omóplatos. La piel no es negra lisa: tiene manchas,
//   venas y relieve, y solo se ve cuando la linterna la toca.
// - Se anima a 12 poses por segundo (stop-motion) mientras todo lo demás va a 60 FPS. El cerebro detecta que
//   "algo no se mueve bien" sin saber qué es.
// - Al escuchar, ladea la cabeza hacia el sonido; a veces la gira más de lo que un cuello aguanta.
//
// Las piezas pequeñas que no se mueven por separado (costillas, vértebras, dientes) van fundidas en una sola malla
// por grupo: pocas llamadas de dibujo, que en un celular importan.
import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  DataTexture,
  Group,
  type Material,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Euler,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { aleatorio } from '../utilidades/Matematicas';
import { Ruido2D } from '../utilidades/Ruido';

export type PoseEntidad = 'quieto' | 'caminar' | 'correr' | 'escuchar' | 'susto';

const POSES_POR_SEGUNDO = 12;
/** Qué tan abierta queda la mandíbula en cada pose (radianes). En el susto se desencaja. */
const MANDIBULA: Record<PoseEntidad, number> = { quieto: 0.04, caminar: 0.08, escuchar: 0.3, correr: 0.75, susto: 1.2 };
/** Cuánto se cierran los dedos en cada pose (0 abiertos, 1 garra). En el susto se abren. */
const GARRA: Record<PoseEntidad, number> = { quieto: 0.45, caminar: 0.4, escuchar: 0.3, correr: 0.8, susto: 0.05 };
/** Uno de cada tantos tics nerviosos gira la cabeza de más. */
const TIC_EXTREMO = 0.18;

function hueso(radio: number, largo: number, material: Material): Mesh {
  const malla = new Mesh(new CapsuleGeometry(radio, largo, 4, 8), material);
  malla.position.y = -(largo / 2 + radio);
  malla.castShadow = true;
  return malla;
}

/** Una geometría puesta en su lugar (posición, giro en Euler y escala): para fundir piezas en una sola malla. */
function pieza(g: BufferGeometry, x: number, y: number, z: number, giro: [number, number, number] = [0, 0, 0], escala: [number, number, number] = [1, 1, 1]): BufferGeometry {
  const m = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(...giro)), new Vector3(...escala));
  return g.applyMatrix4(m);
}

/** Fundo piezas en una sola malla (sin sombra: son detalles finos, su sombra sería ruido). */
function fundir(piezas: BufferGeometry[], material: Material): Mesh {
  const malla = new Mesh(mergeGeometries(piezas, false), material);
  for (const p of piezas) p.dispose();
  return malla;
}

/**
 * La piel: manchas más claras, venas que se ramifican y poros. El color de fondo (casi negro) va en el material;
 * esta textura solo lo multiplica (blanco = el color del material): si por algo no cargara, ella seguiría oscura,
 * nunca blanca. Devuelvo también el relieve (las venas se levantan, los poros se hunden bajo la linterna).
 * DataTexture: no necesita un lienzo del navegador.
 */
function texturasPiel(): { color: DataTexture; relieve: DataTexture } {
  const T = 128;
  const ruido = new Ruido2D(7171);
  const color = new Uint8Array(T * T * 4);
  const relieve = new Uint8Array(T * T * 4);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const u = x / T;
      const v = y / T;
      const manchas = ruido.fractal(u * 6, v * 6, 4, 64);
      // Las venas: donde un ruido alargado pasa cerca de la mitad (líneas finas que se ramifican).
      const trazo = Math.abs(ruido.fractal(u * 9 + 31, v * 3 + 7, 4, 64) - 0.5);
      const vena = Math.max(0, 1 - trazo / 0.035);
      const poro = ruido.valor(x * 0.9, y * 0.9, 128) > 0.86 ? 1 : 0;
      // Multiplicador: ~0.55 en la piel común, 1 en las manchas claras; las venas, más rojizas y oscuras.
      const k = Math.min(1, 0.55 + 1.2 * Math.max(0, manchas - 0.42));
      const i = (y * T + x) * 4;
      color[i] = 255 * Math.max(0, k * (1 - 0.15 * vena) - 0.2 * poro);
      color[i + 1] = 255 * Math.max(0, k * (1 - 0.45 * vena) - 0.2 * poro);
      color[i + 2] = 255 * Math.max(0, k * (1 - 0.5 * vena) - 0.2 * poro);
      color[i + 3] = 255;
      const alto = 128 + (manchas - 0.5) * 70 + vena * 50 - poro * 60;
      relieve[i] = relieve[i + 1] = relieve[i + 2] = Math.max(0, Math.min(255, alto));
      relieve[i + 3] = 255;
    }
  }
  const crear = (datos: Uint8Array, esColor: boolean) => {
    const t = new DataTexture(datos, T, T);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(2, 3);
    if (esColor) t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { color: crear(color, true), relieve: crear(relieve, false) };
}

interface Extremidad {
  raiz: Group;
  medio: Group;
}

/** Un dedo: la falange de la base (se abre o se cierra) y la de la punta, con la uña. */
interface Dedo {
  base: Group;
  punta: Group;
}

export class ModeloEntidad {
  readonly raiz = new Group();
  private readonly torso = new Group();
  private readonly cabeza = new Group();
  private readonly mandibula = new Group();
  private readonly hombros = new Group();
  private readonly piernas: Extremidad[] = [];
  private readonly brazos: Extremidad[] = [];
  private readonly dedos: Dedo[] = [];
  private acumulado = 0;
  private fase = 0;
  private tic = 0;
  private proximoTic = 1.5;
  private ladeo = 0;

  constructor() {
    // Piel mate DE VERDAD: Lambert, sin reflejo especular. Con el material "estándar" (aunque fuera negro puro), la
    // linterna, que sale de mis ojos, le sacaba un reflejo gris en todo el cuerpo: parecía un maniquí de plástico
    // claro. Así es una figura oscura, y la linterna solo le saca el relieve, las costillas y los dientes. Solo la
    // boca por dentro está húmeda (brilla un poco).
    const { color, relieve } = texturasPiel();
    const piel = new MeshLambertMaterial({ color: 0x2a221d, map: color, bumpMap: relieve, bumpScale: 0.6 });
    const hueco = new MeshLambertMaterial({ color: 0x020101 });
    const boca = new MeshStandardMaterial({ color: 0x1a0504, roughness: 0.35 });
    const dientes = new MeshLambertMaterial({ color: 0x6e6656 });
    const unas = new MeshLambertMaterial({ color: 0x1b1712 });

    const cadera = new Group();
    cadera.position.y = 1.1;
    this.raiz.add(cadera);

    // Piernas: muslo + pantorrilla, con la rodilla marcada.
    for (const lado of [-1, 1]) {
      const raiz = new Group();
      raiz.position.x = 0.11 * lado;
      raiz.add(hueso(0.045, 0.45, piel));
      const medio = new Group();
      medio.position.y = -0.55;
      medio.add(hueso(0.035, 0.47, piel), new Mesh(new SphereGeometry(0.045, 8, 6), piel));
      raiz.add(medio);
      cadera.add(raiz);
      this.piernas.push({ raiz, medio });
    }

    // Torso delgado, inclinado hacia adelante. Caja torácica estrecha y una cintura casi inexistente.
    this.torso.rotation.x = 0.55;
    const pecho = new Mesh(new CapsuleGeometry(0.11, 0.3, 4, 10), piel);
    pecho.scale.set(1.15, 1, 0.6);
    pecho.position.y = 0.46;
    pecho.castShadow = true;
    const cintura = new Mesh(new CapsuleGeometry(0.05, 0.25, 4, 8), piel);
    cintura.position.y = 0.16;
    this.torso.add(pecho, cintura);
    // Lo que se le marca bajo la piel: costillas por delante (arcos que se achican hacia abajo), la columna por
    // detrás, de la cintura a la nuca, y los omóplatos salidos.
    const marcas: BufferGeometry[] = [];
    [0.6, 0.54, 0.48, 0.42, 0.37].forEach((y, k) => {
      const radio = 0.108 - k * 0.006;
      // La escala va en los ejes del aro antes de girarlo: su "y" queda hacia adelante (lo plano del pecho).
      marcas.push(pieza(new TorusGeometry(radio, 0.0075, 4, 12, Math.PI), 0, y, 0.004, [Math.PI / 2 + 0.18, 0, 0], [1.2, 0.62, 1]));
    });
    for (let k = 0; k < 9; k++) {
      const y = 0.1 + k * 0.065;
      const fondo = y > 0.3 ? -0.068 : -0.045;
      marcas.push(pieza(new SphereGeometry(0.019, 6, 5), 0, y, fondo, [0, 0, 0], [1.2, 0.8, 0.9]));
    }
    for (const lado of [-1, 1]) {
      marcas.push(pieza(new SphereGeometry(0.06, 8, 6), 0.075 * lado, 0.54, -0.05, [0.3, 0, 0.2 * lado], [0.9, 1.3, 0.3]));
    }
    this.torso.add(fundir(marcas, piel));
    cadera.add(this.torso);

    // Hombros desiguales: uno más alto que el otro.
    const hombros = this.hombros;
    hombros.position.y = 0.66;
    hombros.rotation.z = 0.12;
    this.torso.add(hombros);

    // Brazos largos: brazo + antebrazo + una mano de cuatro dedos largos, cada uno de dos falanges y con uña.
    for (const lado of [-1, 1]) {
      const raiz = new Group();
      raiz.position.x = 0.21 * lado;
      raiz.add(hueso(0.03, 0.44, piel));
      const medio = new Group();
      medio.position.y = -0.5;
      medio.add(hueso(0.026, 0.5, piel));
      const mano = new Group();
      mano.position.y = -0.6;
      mano.add(new Mesh(new BoxGeometry(0.06, 0.07, 0.022), piel));
      for (let d = 0; d < 4; d++) {
        const base = new Group();
        base.position.set((d - 1.5) * 0.016, -0.03, 0);
        base.rotation.z = (d - 1.5) * 0.07;
        base.add(hueso(0.0075, 0.13, piel));
        const punta = new Group();
        punta.position.y = -0.15;
        const falange = hueso(0.0065, 0.11, piel);
        const una = new Mesh(new ConeGeometry(0.007, 0.035, 5), unas);
        una.position.y = -0.14;
        una.rotation.x = Math.PI;
        punta.add(falange, una);
        base.add(punta);
        mano.add(base);
        this.dedos.push({ base, punta });
      }
      medio.add(mano);
      raiz.add(medio);
      hombros.add(raiz);
      this.brazos.push({ raiz, medio });
    }

    // Cuello largo con dos tendones tirantes, y la cabeza alargada que cuelga por delante del pecho.
    const cuello = new Mesh(new CapsuleGeometry(0.03, 0.17, 4, 8), piel);
    cuello.position.set(0, 0.08, 0.07);
    cuello.rotation.x = 0.9;
    const tendones = fundir(
      [-1, 1].map((lado) => pieza(new CapsuleGeometry(0.008, 0.17, 3, 6), 0.022 * lado, 0.085, 0.085, [0.9, 0, 0])),
      piel,
    );
    hombros.add(cuello, tendones);
    this.cabeza.position.set(0, 0.15, 0.19);
    const craneo = new Mesh(new SphereGeometry(0.1, 16, 12), piel);
    craneo.scale.set(0.85, 1.5, 1);
    craneo.castShadow = true;
    // Donde irían los ojos: dos cuencas hundidas, negras, bajo una frente que sobresale.
    const cuencas = fundir(
      [-1, 1].map((lado) => pieza(new SphereGeometry(0.024, 8, 6), 0.034 * lado, 0.035, 0.078, [0, 0, 0], [1.1, 0.75, 0.45])),
      hueco,
    );
    const frente = fundir([pieza(new CapsuleGeometry(0.012, 0.07, 3, 6), 0, 0.066, 0.082, [0, 0, Math.PI / 2])], piel);
    // La fila de dientes de arriba, desparejos, pegada al cráneo.
    const filaArriba: BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) {
      const largo = 0.01 + 0.009 * Math.abs(Math.sin(k * 2.3));
      filaArriba.push(pieza(new BoxGeometry(0.0045, largo, 0.004), (k - 3) * 0.0095, -0.072 - largo / 2, 0.088 - Math.abs(k - 3) * 0.004));
    }
    this.cabeza.add(craneo, cuencas, frente, fundir(filaArriba, dientes));

    // La mandíbula, con su bisagra atrás: cerrada, deja la ranura de siempre; abierta, enseña la boca y los dientes.
    this.mandibula.position.set(0, -0.075, 0.02);
    const quijada = new Mesh(new BoxGeometry(0.07, 0.022, 0.085), piel);
    quijada.position.set(0, -0.012, 0.045);
    const garganta = new Mesh(new BoxGeometry(0.06, 0.04, 0.06), boca);
    garganta.position.set(0, 0.012, 0.035);
    const filaAbajo: BufferGeometry[] = [];
    for (let k = 0; k < 6; k++) {
      const largo = 0.009 + 0.008 * Math.abs(Math.cos(k * 1.7));
      filaAbajo.push(pieza(new BoxGeometry(0.0045, largo, 0.004), (k - 2.5) * 0.0105, 0.001 + largo / 2, 0.082 - Math.abs(k - 2.5) * 0.004));
    }
    this.mandibula.add(quijada, garganta, fundir(filaAbajo, dientes));
    this.cabeza.add(this.mandibula);
    hombros.add(this.cabeza);

    this.raiz.visible = false;
  }

  /** Avanzo la animación. La pose solo se aplica 12 veces por segundo. */
  actualizar(dt: number, velocidad: number, pose: PoseEntidad): void {
    this.fase += dt * velocidad * 3.1;
    this.tic -= dt;
    this.acumulado += dt;
    if (this.acumulado < 1 / POSES_POR_SEGUNDO) return;
    // A veces "se salta" una pose: un tirón casi imperceptible.
    if (Math.random() < 0.08) return;
    this.acumulado = 0;
    this.aplicarPose(pose);
  }

  /** Su cabeza: el susto la pone frente a la cámara midiendo dónde quedó, sea cual sea la pose o el cuerpo. */
  get cara(): Group {
    return this.cabeza;
  }

  /** Qué tan abierta está la mandíbula ahora (radianes). */
  get aperturaMandibula(): number {
    return this.mandibula.rotation.x;
  }

  private aplicarPose(pose: PoseEntidad): void {
    const s = Math.sin(this.fase);
    const correr = pose === 'correr';
    const moviendo = pose === 'caminar' || correr;
    const amplitud = correr ? 0.75 : 0.42;

    // Piernas.
    this.piernas.forEach((pierna, i) => {
      const lado = i === 0 ? 1 : -1;
      pierna.raiz.rotation.x = (moviendo ? s * amplitud * lado : 0.05) - 0.18;
      pierna.medio.rotation.x = (moviendo ? Math.max(0, -s * lado) * (correr ? 1.1 : 0.7) : 0.1) + 0.3;
    });

    // Brazos: cuelgan, se balancean poco y con un temblor irregular.
    this.brazos.forEach((brazo, i) => {
      const lado = i === 0 ? -1 : 1;
      const temblor = aleatorio(-0.04, 0.04);
      brazo.raiz.rotation.x = (moviendo ? s * 0.15 * lado : 0) + (correr ? -0.5 : 0) + temblor;
      brazo.raiz.rotation.z = 0.08 * lado * (pose === 'susto' ? -6 : 1);
      // Un brazo cuelga recto; el otro, doblado hacia adentro como si no le perteneciera.
      const doblez = i === 0 ? -0.1 : -0.55;
      brazo.medio.rotation.x = correr ? -0.6 : pose === 'susto' ? -1.2 : doblez + temblor;
      brazo.medio.rotation.z = i === 0 ? 0 : 0.35;
    });

    // Los dedos se crispan: cada uno por su cuenta, a tirones.
    const garra = GARRA[pose];
    for (const dedo of this.dedos) {
      // Hacia adelante (−x): la mano se cierra como una garra hacia lo que tiene delante.
      const crispado = aleatorio(-0.12, 0.12);
      dedo.base.rotation.x = -(garra * 0.9 + crispado);
      dedo.punta.rotation.x = -(garra * 1.1 + crispado * 1.5);
    }

    // La mandíbula: casi cerrada (la ranura) al acechar, entreabierta al escuchar, abierta al correr. En el susto
    // baja de más y se corre hacia abajo: se desencaja. Siempre con un temblor.
    this.mandibula.rotation.x = MANDIBULA[pose] + aleatorio(-0.03, 0.05);
    this.mandibula.position.y = pose === 'susto' ? -0.095 : -0.075;

    // Torso y cabeza según la pose.
    this.torso.rotation.x = pose === 'escuchar' ? 0.8 : correr ? 0.85 : pose === 'susto' ? 0.25 : 0.55;
    if (this.tic <= 0) {
      // Tic nervioso: la cabeza gira de golpe. A veces, más de lo que un cuello aguanta.
      this.tic = this.proximoTic;
      this.proximoTic = aleatorio(0.8, 3);
      const extremo = Math.random() < TIC_EXTREMO;
      this.ladeo = extremo ? aleatorio(1.2, 1.7) * (Math.random() < 0.5 ? -1 : 1) : aleatorio(-0.5, 0.5);
    }
    const ladeoObjetivo = pose === 'escuchar' ? 0.75 : 0.35 + this.ladeo * 0.5;
    // Compenso la inclinación del torso para que la "cara" apunte hacia adelante.
    this.cabeza.rotation.set(pose === 'susto' ? 0.2 : -0.75, 0, ladeoObjetivo);
  }

  fijarVisible(visible: boolean): void {
    this.raiz.visible = visible;
  }

  /** Aplico la pose de inmediato (para apariciones instantáneas). */
  forzarPose(pose: PoseEntidad): void {
    this.acumulado = 0;
    this.aplicarPose(pose);
  }
}
