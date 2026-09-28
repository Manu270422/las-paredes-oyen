// Aquí construyo el cuerpo de "El Inquilino". Decisiones de diseño:
// - Demasiado alto (2.25 m) para los techos de 2.7 m: tiene que encorvarse.
// - Brazos que llegan a las rodillas, dedos largos.
// - Sin ojos. Solo una ranura por boca. Es ciego: vive del oído.
// - Se anima a 12 poses por segundo (stop-motion) mientras todo lo demás va
//   a 60 FPS. El cerebro detecta que "algo no se mueve bien" sin saber qué es.
// - Al escuchar, ladea la cabeza hacia el sonido.
import { CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, BoxGeometry } from 'three';
import { aleatorio } from '../utilidades/Matematicas';

export type PoseEntidad = 'quieto' | 'caminar' | 'correr' | 'escuchar' | 'susto';

const POSES_POR_SEGUNDO = 12;

function hueso(radio: number, largo: number, material: MeshStandardMaterial): Mesh {
  const malla = new Mesh(new CapsuleGeometry(radio, largo, 4, 8), material);
  malla.position.y = -(largo / 2 + radio);
  malla.castShadow = true;
  return malla;
}

interface Extremidad {
  raiz: Group;
  medio: Group;
}

export class ModeloEntidad {
  readonly raiz = new Group();
  private readonly torso = new Group();
  private readonly cabeza = new Group();
  private readonly hombros = new Group();
  private readonly piernas: Extremidad[] = [];
  private readonly brazos: Extremidad[] = [];
  private acumulado = 0;
  private fase = 0;
  private tic = 0;
  private proximoTic = 1.5;
  private ladeo = 0;

  constructor() {
    // Piel mate, casi negra. Nada de brillo: el brillo la haría parecer de plástico.
    const piel = new MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.85, metalness: 0 });
    const boca = new MeshStandardMaterial({ color: 0x050000, roughness: 1 });

    const cadera = new Group();
    cadera.position.y = 1.1;
    this.raiz.add(cadera);

    // Piernas: muslo + pantorrilla.
    for (const lado of [-1, 1]) {
      const raiz = new Group();
      raiz.position.x = 0.11 * lado;
      raiz.add(hueso(0.045, 0.45, piel));
      const medio = new Group();
      medio.position.y = -0.55;
      medio.add(hueso(0.035, 0.47, piel));
      raiz.add(medio);
      cadera.add(raiz);
      this.piernas.push({ raiz, medio });
    }

    // Torso delgado, inclinado hacia adelante.
    this.torso.rotation.x = 0.55;
    // Caja torácica estrecha y una cintura casi inexistente: demacrado.
    const pecho = new Mesh(new CapsuleGeometry(0.11, 0.3, 4, 10), piel);
    pecho.scale.set(1.15, 1, 0.6);
    pecho.position.y = 0.46;
    pecho.castShadow = true;
    const cintura = new Mesh(new CapsuleGeometry(0.05, 0.25, 4, 8), piel);
    cintura.position.y = 0.16;
    this.torso.add(pecho, cintura);
    cadera.add(this.torso);

    // Hombros desiguales: uno más alto que el otro.
    const hombros = this.hombros;
    hombros.position.y = 0.66;
    hombros.rotation.z = 0.12;
    this.torso.add(hombros);

    // Brazos largos: brazo + antebrazo + dedos.
    for (const lado of [-1, 1]) {
      const raiz = new Group();
      raiz.position.x = 0.21 * lado;
      raiz.add(hueso(0.03, 0.44, piel));
      const medio = new Group();
      medio.position.y = -0.5;
      medio.add(hueso(0.026, 0.5, piel));
      for (let d = -1; d <= 1; d++) {
        const dedo = hueso(0.009, 0.2, piel);
        dedo.position.set(d * 0.016, -0.7, 0);
        dedo.rotation.x = d * 0.12;
        medio.add(dedo);
      }
      raiz.add(medio);
      hombros.add(raiz);
      this.brazos.push({ raiz, medio });
    }

    // Cuello largo y cabeza alargada sin ojos.
    // El cuello sale hacia adelante: la cabeza cuelga por delante del pecho.
    const cuello = new Mesh(new CapsuleGeometry(0.03, 0.14, 4, 8), piel);
    cuello.position.set(0, 0.08, 0.06);
    cuello.rotation.x = 0.9;
    hombros.add(cuello);
    this.cabeza.position.set(0, 0.14, 0.17);
    const craneo = new Mesh(new SphereGeometry(0.1, 16, 12), piel);
    craneo.scale.set(0.85, 1.5, 1);
    craneo.castShadow = true;
    const ranura = new Mesh(new BoxGeometry(0.075, 0.008, 0.02), boca);
    ranura.position.set(0, -0.07, 0.1);
    this.cabeza.add(craneo, ranura);
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

    // Torso y cabeza según la pose.
    this.torso.rotation.x = pose === 'escuchar' ? 0.8 : correr ? 0.85 : pose === 'susto' ? 0.25 : 0.55;
    if (this.tic <= 0) {
      // Tic nervioso: la cabeza gira de golpe.
      this.tic = this.proximoTic;
      this.proximoTic = aleatorio(0.8, 3);
      this.ladeo = aleatorio(-0.5, 0.5);
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
