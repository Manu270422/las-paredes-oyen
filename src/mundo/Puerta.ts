// Aquí está la puerta: una hoja de madera que gira sobre su bisagra.
// Las puertas son centrales en el terror: abrir lento (agachado) casi no
// suena; abrir normal cruje; la criatura también las abre... y a veces
// una puerta que dejé cerrada aparece abierta.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { CajaColision } from './Colisiones';
import type { DefPuerta } from './datos/TiposMapa';
import { amortiguar } from '../utilidades/Matematicas';

export type FormaMovimiento = 'lento' | 'normal' | 'golpe';

const ANGULO_ABIERTA = Math.PI * 0.52;
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
  private readonly rotacionBase: number;
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

    // Mi hoja de madera, con el origen en la bisagra (por eso la desplazo medio ancho).
    this.hoja = new Mesh(new BoxGeometry(ancho, alto, 0.045), madera);
    this.hoja.castShadow = true;
    this.hoja.receiveShadow = true;
    this.hoja.position.set(ancho / 2, alto / 2, 0);

    // La perilla metálica a ambos lados.
    const metal = new MeshStandardMaterial({ color: 0x8a7a5a, metalness: 0.8, roughness: 0.35 });
    const perilla = new Mesh(new CylinderGeometry(0.03, 0.03, 0.14, 12), metal);
    perilla.rotation.x = Math.PI / 2;
    perilla.position.set(ancho - 0.09, 1.0 - alto / 2, 0);
    this.hoja.add(perilla);

    this.pivote.add(this.hoja);

    // Coloco la bisagra en un extremo del vano y oriento la hoja.
    if (pasoEnZ) {
      this.pivote.position.set(def.x * C + relleno, 0, this.centro.z);
      this.sentido = def.abreHacia === 's' ? -1 : 1;
    } else {
      this.pivote.position.set(this.centro.x, 0, def.y * C + relleno);
      this.pivote.rotation.y = -Math.PI / 2;
      this.sentido = def.abreHacia === 'o' ? -1 : 1;
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

  /** Qué tan abierta está, de 0 a 1. */
  get apertura(): number {
    return this.angulo / ANGULO_ABIERTA;
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

  /** Si está casi cerrada bloquea el paso: devuelvo una caja delgada en el centro del vano. */
  cajaColision(): CajaColision | null {
    if (this.angulo > 0.55) return null;
    const C = CONFIG.celda;
    const grosor = 0.07;
    if (this.pasoEnZ) {
      return { minX: this.gx * C, maxX: (this.gx + 1) * C, minZ: this.centro.z - grosor, maxZ: this.centro.z + grosor };
    }
    return { minX: this.centro.x - grosor, maxX: this.centro.x + grosor, minZ: this.gy * C, maxZ: (this.gy + 1) * C };
  }
}
