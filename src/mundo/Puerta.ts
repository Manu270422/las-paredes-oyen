// Aquí está la puerta: una hoja de madera que gira sobre su bisagra.
// Las puertas son centrales en el terror: abrir lento (agachado) casi no
// suena; abrir normal cruje; la criatura también las abre... y a veces
// una puerta que dejé cerrada aparece abierta.
//
// Cómo está colocada (la celda de una puerta es un túnel de 1.3 m sin muro):
// la bisagra va en el BORDE de la celda del lado contrario a hacia donde abre
// ("abreHacia"), a 3 cm hacia adentro. Cerrada, la hoja queda a ras del muro
// de ese lado, como una puerta de edificio. Al abrir, gira DENTRO del túnel y
// termina pegada a la jamba, sin sobresalir. Antes la bisagra estaba a mitad
// del túnel y la hoja abierta sobresalía 28 cm hacia el cuarto, en el aire.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Object3D, Vector3 } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { CajaColision } from './Colisiones';
import type { DefPuerta } from './datos/TiposMapa';
import { amortiguar } from '../utilidades/Matematicas';

export type FormaMovimiento = 'lento' | 'normal' | 'golpe';

/** Exactamente 90°: la hoja abierta queda paralela a la jamba (con más ángulo se clavaba en el muro). */
const ANGULO_ABIERTA = Math.PI / 2;
const GROSOR_HOJA = 0.045;
/** Distancia del plano de la hoja al borde de la celda. Con menos, un rayo podría caer en la celda vecina. */
const MARGEN_BORDE = 0.03;
/** La hoja abierta queda a 1 mm de la jamba (media hoja + 1 mm): sin atravesarla ni parpadeo de profundidad. */
const DESPLAZAMIENTO = GROSOR_HOJA / 2 + 0.001;
/** Cuánto sobresale la caja de colisión del plano de la hoja hacia el túnel. */
const GROSOR_COLISION = 0.04;
const VELOCIDAD: Record<FormaMovimiento, number> = { lento: 1.4, normal: 5, golpe: 14 };

export class Puerta {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  /** true si se cruza moviéndose en Z (norte-sur). */
  readonly pasoEnZ: boolean;
  readonly pivote = new Group();
  readonly hoja: Mesh;
  readonly centro: Vector3;
  llave: string | null;
  /** Cuántas veces la ha visto el jugador (para el director: "¿esa puerta no estaba cerrada?"). */
  vecesVista = 0;

  private angulo = 0;
  private objetivo = 0;
  private rapidez = VELOCIDAD.normal;
  private readonly sentido: number;
  private readonly altoHoja: number;
  private readonly rotacionBase: number;
  /** Los límites de mi celda en el eje por donde se cruza (para la colisión de la hoja cerrada). */
  private readonly minPaso: number;
  private readonly maxPaso: number;
  /** Dónde está el plano de la hoja cerrada, en ese mismo eje. */
  private readonly planoHoja: number;
  private readonly estadoInicial: { abierta: boolean; llave: string | null };

  constructor(def: DefPuerta, pasoEnZ: boolean, madera: MeshStandardMaterial) {
    const C = CONFIG.celda;
    this.id = def.id;
    this.gx = def.x;
    this.gy = def.y;
    this.pasoEnZ = pasoEnZ;
    this.llave = def.llave ?? null;
    this.estadoInicial = { abierta: def.abierta ?? false, llave: this.llave };
    this.centro = new Vector3((def.x + 0.5) * C, 0, (def.y + 0.5) * C);

    const ancho = CONFIG.anchoVano - 0.02;
    const alto = CONFIG.alturaPuerta - 0.02;
    const relleno = (C - CONFIG.anchoVano) / 2;
    this.sentido = def.abreHacia === 's' || def.abreHacia === 'o' ? -1 : 1;
    this.altoHoja = alto;

    // Mi hoja de madera, con el origen en la bisagra (por eso la desplazo medio ancho). El
    // desplazamiento en el grosor la deja separada de la jamba cuando está abierta.
    this.hoja = new Mesh(new BoxGeometry(ancho, alto, GROSOR_HOJA), madera);
    this.hoja.castShadow = true;
    this.hoja.receiveShadow = true;
    this.hoja.position.set(ancho / 2, alto / 2, this.sentido * DESPLAZAMIENTO);

    // Las posiciones de lo que cuelga de la hoja son relativas a su CENTRO: el borde de la bisagra
    // está en -ancho / 2 y el borde libre en +ancho / 2.
    // La perilla metálica a ambos lados, a 9 cm del borde libre. (Antes estaba a ancho - 9 cm del
    // centro: 37 cm FUERA de la hoja, flotando en el aire cuando la puerta estaba abierta.)
    const metal = new MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.8, roughness: 0.35 });
    const perilla = new Mesh(new CylinderGeometry(0.03, 0.03, 0.14, 12), metal);
    perilla.rotation.x = Math.PI / 2;
    perilla.position.set(ancho / 2 - 0.09, 1.0 - alto / 2, 0);
    this.hoja.add(perilla);

    // Tres bisagras en el borde de la bisagra: una placa que abraza el canto (se ve por las dos
    // caras) y el nudillo cilíndrico. Sin ellas la hoja no se leía unida al marco.
    const placa = new BoxGeometry(0.05, 0.1, GROSOR_HOJA + 0.004);
    const nudillo = new CylinderGeometry(0.016, 0.016, 0.1, 10);
    for (const altura of [0.22, alto / 2, alto - 0.22]) {
      const y = altura - alto / 2;
      const chapa = new Mesh(placa, metal);
      chapa.position.set(-ancho / 2 + 0.02, y, 0);
      const eje = new Mesh(nudillo, metal);
      eje.position.set(-ancho / 2, y, 0);
      this.hoja.add(chapa, eje);
    }

    this.pivote.add(this.hoja);

    // Bisagra en el borde contrario a hacia donde abre; la jamba de la bisagra es la oeste (o la norte).
    const borde = this.sentido > 0 ? 1 : 0;
    if (pasoEnZ) {
      this.minPaso = def.y * C;
      this.maxPaso = (def.y + 1) * C;
      this.planoHoja = borde ? this.maxPaso - MARGEN_BORDE : this.minPaso + MARGEN_BORDE;
      this.pivote.position.set(def.x * C + relleno, 0, this.planoHoja - this.sentido * DESPLAZAMIENTO);
    } else {
      this.minPaso = def.x * C;
      this.maxPaso = (def.x + 1) * C;
      this.planoHoja = borde ? this.minPaso + MARGEN_BORDE : this.maxPaso - MARGEN_BORDE;
      this.pivote.position.set(this.planoHoja + this.sentido * DESPLAZAMIENTO, 0, def.y * C + relleno);
      this.pivote.rotation.y = -Math.PI / 2;
    }
    this.rotacionBase = this.pivote.rotation.y;
    this.restablecer();
  }

  get abierta(): boolean {
    return this.angulo > 0.5;
  }

  get cerradaConLlave(): boolean {
    return this.llave !== null;
  }

  get enMovimiento(): boolean {
    return Math.abs(this.objetivo - this.angulo) > 0.02;
  }

  abrir(forma: FormaMovimiento = 'normal'): void {
    if (this.llave) return;
    this.objetivo = ANGULO_ABIERTA;
    this.rapidez = VELOCIDAD[forma];
  }

  cerrar(forma: FormaMovimiento = 'normal'): void {
    this.objetivo = 0;
    this.rapidez = VELOCIDAD[forma];
  }

  /** Abro o cierro de golpe sin animación (lo usa el director cuando nadie mira). */
  fijarInstantaneo(abierta: boolean, fraccion = 1): void {
    this.angulo = abierta ? ANGULO_ABIERTA * fraccion : 0;
    this.objetivo = this.angulo;
    this.aplicarRotacion();
  }

  desbloquear(): void {
    this.llave = null;
  }

  restablecer(): void {
    this.llave = this.estadoInicial.llave;
    this.fijarInstantaneo(this.estadoInicial.abierta);
    this.vecesVista = 0;
  }

  private aplicarRotacion(): void {
    this.pivote.rotation.y = this.rotacionBase + this.angulo * this.sentido;
  }

  actualizar(dt: number): void {
    if (!this.enMovimiento) return;
    this.angulo = amortiguar(this.angulo, this.objetivo, this.rapidez, dt);
    if (Math.abs(this.objetivo - this.angulo) < 0.005) this.angulo = this.objetivo;
    this.aplicarRotacion();
  }

  /**
   * Si está casi cerrada bloquea el paso: una caja delgada en el plano de la hoja, pegada al borde de
   * mi celda. Abierta no estorba: la hoja queda pegada a la jamba y el vano queda libre.
   *
   * El umbral de 0.55 rad (~31°) es ANTERIOR al cambio de la bisagra: lo dejé como estaba. Bajo ese
   * ángulo la hoja bloquea; por encima NO bloquea nada, así que una hoja a medio abrir (por ejemplo
   * la que deja el director con `fijarInstantaneo(true, 0.45)`, que son ~40°) se puede cruzar. Es
   * solo visual: mientras la hoja barre el túnel no hay colisión con ella.
   */
  cajaColision(): CajaColision | null {
    if (this.angulo > 0.55) return null;
    const C = CONFIG.celda;
    // El lado de la bisagra es el del borde; la caja llega hasta él.
    const haciaMax = this.sentido > 0 === this.pasoEnZ;
    const desde = haciaMax ? this.planoHoja - GROSOR_COLISION : this.minPaso;
    const hasta = haciaMax ? this.maxPaso : this.planoHoja + GROSOR_COLISION;
    if (this.pasoEnZ) return { minX: this.gx * C, maxX: (this.gx + 1) * C, minZ: desde, maxZ: hasta };
    return { minX: desde, maxX: hasta, minZ: this.gy * C, maxZ: (this.gy + 1) * C };
  }

  /**
   * Cuelgo algo en la cara de la hoja que se EMPUJA para abrir (la contraria a "abreHacia"): en un
   * apartamento es la cara del pasillo. Queda centrado en el ancho, con su centro a `altura` metros del
   * piso y mirando hacia afuera de esa cara (su +Z). Va con la hoja: si la puerta se abre, se va con ella.
   * `grosor` es el del objeto, para apoyarlo en la cara sin que se hunda.
   */
  colgarEnCaraDeEmpuje(objeto: Object3D, altura: number, grosor: number): void {
    objeto.position.set(0, altura - this.altoHoja / 2, this.sentido * (GROSOR_HOJA / 2 + grosor / 2 + 0.001));
    objeto.rotation.y = this.sentido > 0 ? 0 : Math.PI;
    this.hoja.add(objeto);
  }

  /**
   * El punto donde hay que mirar para interactuar con esta puerta: el centro de la hoja AHORA
   * (cerrada o abierta, o a medio camino). Lo usan el cono de asistencia y las pruebas.
   */
  puntoInteraccion(destino = new Vector3()): Vector3 {
    this.pivote.updateWorldMatrix(true, true);
    return this.hoja.getWorldPosition(destino);
  }
}
