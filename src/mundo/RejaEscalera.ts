// Aquí está la reja del tramo que baja: cerrada con cadena y candado hasta que alguien la abre con la llave.
// Abrirla no es un clic, es un momento:
//   0.00 s  la llave entra y no quiere girar
//   0.60 s  el candado cede
//   0.90 s  el candado cae y rebota en el escalón: hace ruido (la criatura lo oye como una puerta)
//   1.20 s  la cadena se desliza entre los barrotes y cae
//   2.10 s  las dos hojas se abren con un chirrido largo
//   3.40 s  abierta
// Abierta se queda abierta: al cargar la partida, la pongo así sin animación.
import type { Group, Object3D } from 'three';
import type { ContextoJuego } from '../nucleo/ContextoJuego';

/** Los momentos de la apertura, en segundos. */
const MOMENTOS = { giro: 0.0, cede: 0.6, caeCandado: 0.9, caeCadena: 1.2, hojas: 2.1, fin: 3.4 };
/** Cuánto giran las hojas al abrirse (radianes): casi hasta tocar el muro del pozo. */
const GIRO_HOJAS = 1.7;
const GRAVEDAD = 9.8;

const suavizar = (t: number) => t * t * (3 - 2 * t);

export class RejaEscalera {
  private readonly hojaIzq: Object3D;
  private readonly hojaDer: Object3D;
  private readonly cadena: Object3D;
  private readonly candado: Object3D;
  private readonly caida: { cadena: number; candado: number };
  /** Segundos desde que empecé a abrirla; -1 si no se está abriendo. */
  private tiempo = -1;
  private hechos = new Set<string>();
  private alTerminar: (() => void) | null = null;
  abierta = false;

  constructor(readonly grupo: Group) {
    const parte = (nombre: string) => {
      const p = grupo.getObjectByName(nombre)?.children[0];
      if (!p) throw new Error(`La reja no tiene "${nombre}".`);
      return p;
    };
    this.hojaIzq = parte('reja-hoja-izq');
    this.hojaDer = parte('reja-hoja-der');
    this.cadena = parte('reja-cadena');
    this.candado = parte('reja-candado');
    this.caida = grupo.userData.caida as { cadena: number; candado: number };
  }

  get abriendo(): boolean {
    return this.tiempo >= 0;
  }

  /** Dónde está el candado en el mundo (para el sonido y para saber de qué tramo es la reja). */
  posicion(): { x: number; y: number; z: number } {
    const p = this.candado.parent!.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  /** Empiezo a abrirla. Al terminar, llamo `alTerminar` (quien me abre marca su bandera). */
  abrir(alTerminar: () => void): void {
    if (this.abierta || this.abriendo) return;
    this.tiempo = 0;
    this.hechos.clear();
    this.alTerminar = alTerminar;
  }

  /** La dejo abierta o cerrada al instante (al cargar la partida o al armar el piso). */
  fijar(abierta: boolean): void {
    this.tiempo = -1;
    this.alTerminar = null;
    this.abierta = abierta;
    this.posar(abierta ? MOMENTOS.fin : 0);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    if (this.tiempo < 0) return;
    this.tiempo += dt;
    const t = this.tiempo;
    const p = this.posicion();
    const sonar = (id: string, momento: number, hacer: () => void) => {
      if (t >= momento && !this.hechos.has(id)) {
        this.hechos.add(id);
        hacer();
      }
    };
    sonar('giro', MOMENTOS.giro, () => ctx.audio.reproducir('llave', { posicion: p, volumen: 0.9, tono: 0.85 }));
    sonar('cede', MOMENTOS.cede, () => ctx.audio.reproducir('cerradura', { posicion: p, volumen: 0.8 }));
    sonar('candado', MOMENTOS.caeCandado + this.tiempoDeCaida(this.caida.candado), () => {
      ctx.audio.reproducir('candado', { posicion: { x: p.x, y: 0, z: p.z }, volumen: 1 });
      ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.4, origen: 'puerta', causa: 'puerta' });
    });
    sonar('cadena', MOMENTOS.caeCadena, () => ctx.audio.reproducir('cadena', { posicion: p, volumen: 0.9 }));
    sonar('hojas', MOMENTOS.hojas, () => ctx.audio.reproducir('puerta_crujido', { posicion: p, volumen: 0.9, tono: 0.72 }));
    this.posar(t);
    if (t >= MOMENTOS.fin) {
      this.tiempo = -1;
      this.abierta = true;
      const fin = this.alTerminar;
      this.alTerminar = null;
      fin?.();
    }
  }

  /** Cuánto tarda en caer una pieza desde su altura (caída libre). */
  private tiempoDeCaida(altura: number): number {
    return Math.sqrt((2 * altura) / GRAVEDAD);
  }

  /** Pongo cada pieza donde va en el instante `t` de la apertura. */
  private posar(t: number): void {
    const caer = (pieza: Object3D, desde: number, altura: number, giro: number) => {
      const s = Math.max(0, t - desde);
      const bajada = Math.min(altura, 0.5 * GRAVEDAD * s * s);
      pieza.position.y = -bajada;
      pieza.rotation.z = (bajada / Math.max(altura, 0.001)) * giro;
    };
    caer(this.candado, MOMENTOS.caeCandado, this.caida.candado, 1.2);
    caer(this.cadena, MOMENTOS.caeCadena, this.caida.cadena, 0.25);
    const apertura = suavizar(Math.min(1, Math.max(0, (t - MOMENTOS.hojas) / (MOMENTOS.fin - MOMENTOS.hojas))));
    // Las hojas se abren hacia adentro del hueco, cada una sobre su bisagra.
    this.hojaIzq.rotation.y = -GIRO_HOJAS * apertura;
    this.hojaDer.rotation.y = GIRO_HOJAS * apertura;
  }
}
