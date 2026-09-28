// Aquí está la lámpara: el objeto físico (bombillo, tubo o luz de emergencia)
// y su comportamiento eléctrico. Las luces en este juego son jugabilidad:
// - Parpadean cuando la criatura está cerca (una señal que el jugador aprende).
// - Mueren una por una, acercándose a mí.
// - La del 401 está encendida en un edificio sin luz, y nadie explica por qué.
// La luz real (PointLight) no vive aquí: la asigna el PoolLuces.
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { DefLampara, EstadoLampara, TipoLampara } from './datos/TiposMapa';
import { aleatorio } from '../utilidades/Matematicas';

export class Lampara {
  readonly id: string;
  readonly circuito: string;
  readonly tipo: TipoLampara;
  readonly posicion: Vector3;
  readonly objeto = new Group();
  readonly color: Color;
  readonly intensidad: number;
  estado: EstadoLampara;
  /** Brillo actual entre 0 y 1 (incluye parpadeo). */
  factor = 0;

  private readonly emisivo: MeshStandardMaterial;
  private readonly estadoInicial: EstadoLampara;
  private temporizador = 0;
  private faseEncendida = true;
  private interferencia = 0;

  constructor(def: DefLampara) {
    const C = CONFIG.celda;
    this.id = def.id;
    this.circuito = def.circuito;
    this.tipo = def.tipo;
    this.estado = def.estado;
    this.estadoInicial = def.estado;
    this.color = new Color(def.color ?? (def.tipo === 'tubo' ? 0xdfeee6 : 0xffd9a8));
    this.intensidad = def.intensidad ?? (def.tipo === 'tubo' ? 1.2 : 1);
    const altura = def.altura ?? CONFIG.alturaTecho - (def.tipo === 'bombillo' ? 0.45 : 0.06);
    this.posicion = new Vector3(def.x * C, altura, def.y * C);
    this.objeto.position.copy(this.posicion);

    this.emisivo = new MeshStandardMaterial({ color: 0x222222, emissive: this.color, emissiveIntensity: 0, roughness: 0.4 });
    const carcasa = new MeshStandardMaterial({ color: 0x2b2926, roughness: 0.7, metalness: 0.3 });

    if (def.tipo === 'bombillo') {
      // Cable colgando del techo + portalámparas + bombillo.
      const cable = new Mesh(new CylinderGeometry(0.006, 0.006, 0.42, 5), carcasa);
      cable.position.y = 0.26;
      const socket = new Mesh(new CylinderGeometry(0.025, 0.03, 0.07, 10), carcasa);
      socket.position.y = 0.05;
      const bombillo = new Mesh(new SphereGeometry(0.045, 14, 10), this.emisivo);
      bombillo.position.y = -0.02;
      this.objeto.add(cable, socket, bombillo);
    } else if (def.tipo === 'tubo') {
      // Lámpara fluorescente de pasillo pegada al techo.
      const base = new Mesh(new BoxGeometry(1.2, 0.05, 0.14), carcasa);
      const tubo = new Mesh(new CylinderGeometry(0.018, 0.018, 1.1, 8), this.emisivo);
      tubo.rotation.z = Math.PI / 2;
      tubo.position.y = -0.045;
      this.objeto.add(base, tubo);
      // Oriento el tubo a lo largo del pasillo (este-oeste).
    } else {
      // Luz de emergencia: caja en la pared con dos focos.
      const caja = new Mesh(new BoxGeometry(0.34, 0.12, 0.08), carcasa);
      const foco1 = new Mesh(new SphereGeometry(0.035, 10, 8), this.emisivo);
      const foco2 = foco1.clone();
      foco1.position.set(-0.1, -0.04, 0.05);
      foco2.position.set(0.1, -0.04, 0.05);
      this.objeto.add(caja, foco1, foco2);
    }
    this.objeto.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = false;
    });
  }

  /** Brillo efectivo para asignar a una luz real. */
  get brillo(): number {
    return this.factor * this.intensidad;
  }

  fijarEstado(estado: EstadoLampara): void {
    this.estado = estado;
    this.temporizador = 0;
    this.faseEncendida = true;
  }

  /** La criatura cerca altera la electricidad durante unos segundos. */
  interferir(segundos: number): void {
    this.interferencia = Math.max(this.interferencia, segundos);
  }

  restablecer(): void {
    this.fijarEstado(this.estadoInicial);
    this.interferencia = 0;
  }

  actualizar(dt: number): void {
    let objetivo = 0;
    switch (this.estado) {
      case 'encendida':
        objetivo = 0.96 + Math.random() * 0.04;
        break;
      case 'parpadeante':
        objetivo = this.parpadeo(dt);
        break;
      default:
        objetivo = 0;
    }
    if (this.interferencia > 0 && (this.estado === 'encendida' || this.estado === 'parpadeante')) {
      this.interferencia -= dt;
      // Interferencia: cortes erráticos y rápidos, más violentos que el parpadeo normal.
      objetivo = Math.random() < 0.45 ? 0.03 : objetivo * aleatorio(0.3, 1.1);
    }
    this.factor = objetivo;
    this.emisivo.emissiveIntensity = this.factor * 3.2;
  }

  /** Parpadeo realista: largos tramos encendida, cortes breves, y de vez en cuando un apagón largo. */
  private parpadeo(dt: number): number {
    this.temporizador -= dt;
    if (this.temporizador <= 0) {
      this.faseEncendida = !this.faseEncendida;
      if (this.faseEncendida) this.temporizador = Math.random() < 0.3 ? aleatorio(0.04, 0.15) : aleatorio(0.6, 3.5);
      else this.temporizador = Math.random() < 0.12 ? aleatorio(0.8, 2.2) : aleatorio(0.03, 0.2);
    }
    return this.faseEncendida ? aleatorio(0.82, 1) : aleatorio(0, 0.06);
  }
}
