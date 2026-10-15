// Aquí está la puerta principal de un edificio: la salida. Dos hojas de madera con vidrio esmerilado y tres
// cerraduras que se abren en orden, cada una con su momento y su ruido: la cadena, el cerrojo y la llave. Cada ruido
// le llega a ella como el de una puerta (va a investigar, no sale cazando), así que abrirlas seguidas la trae: hay
// que alejarla entre una y otra (P1-guion).
// Cada cerradura abierta queda en una bandera ("cerradura:1", ":2", ":3"); al cargar, la puerta queda como diga el
// progreso. Morir sin un punto de control en medio las vuelve a cerrar (sus banderas no alcanzaron a guardarse).
// Abiertas las tres, se marca la bandera de salida del paquete: lo que pasa después (salir) es del guion del piso.
// Del paquete solo sé qué llave pide la última (`objeto`) y qué bandera marco al final (`bandera`).
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { IdSonido } from '../../audio/TiposAudio';
import type { DefInteractuable } from '../../mundo/datos/TiposMapa';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import { GRADOS } from '../../utilidades/Matematicas';
import { crearZonaToque, vincular, type Interactuable } from '../Interactuable';

/** Una cerradura: lo que dice el indicador, lo que dura su momento, cuánto le suena a ella y cómo suena. */
interface Cerradura {
  readonly accion: string;
  readonly subtitulo: string;
  readonly duracion: number;
  readonly ruido: number;
  readonly sonidos: ReadonlyArray<readonly [IdSonido, number, number]>;
}

/** Las tres, en orden. Los ruidos son como el del candado de la reja (0.4): se oyen, y ella viene a ver. */
export const CERRADURAS: readonly Cerradura[] = [
  { accion: 'Quitar la cadena', subtitulo: '[La cadena cae al piso]', duracion: 1.4, ruido: 0.45, sonidos: [['cadena', 0, 1], ['candado', 0.9, 0.7]] },
  { accion: 'Correr el cerrojo', subtitulo: '[El cerrojo cede de golpe]', duracion: 1.2, ruido: 0.5, sonidos: [['cerradura', 0, 0.9], ['golpe', 0.7, 0.75]] },
  { accion: 'Abrir con la llave', subtitulo: '[La llave gira, despacio]', duracion: 1.8, ruido: 0.35, sonidos: [['llave', 0, 0.9], ['cerradura', 1.1, 0.8]] },
];
const SIN_LLAVE = 'Falta la llave de esta cerradura.';

/** La bandera de la cerradura `i` (desde 1). */
export const banderaCerradura = (i: number): string => `cerradura:${i}`;

/** Medidas de la puerta, en metros. */
const PUERTA = { hoja: 0.78, alto: 2.25, grosor: 0.06 } as const;

export class PuertaPrincipal implements Interactuable {
  readonly id: string;
  readonly objeto = new Group();
  private readonly llave: string | null;
  private readonly bandera: string;
  private readonly cadena: Object3D;
  private readonly cerrojo: Object3D;
  private readonly hojas: [Object3D, Object3D];
  /** Cuántas abrí (0 a 3). */
  private abiertas = 0;
  /** El momento de la cerradura que estoy abriendo: segundos que le quedan (≤ 0: ninguno). */
  private momento = 0;

  constructor(def: DefInteractuable) {
    this.id = def.id;
    this.llave = def.objeto ?? null;
    this.bandera = def.bandera ?? `abierta:${def.id}`;
    const madera = new MeshStandardMaterial({ color: 0x4a3322, roughness: 0.8 });
    const vidrio = new MeshStandardMaterial({ color: 0x8c9aa4, roughness: 0.25, metalness: 0.1, emissive: 0x1a2430, emissiveIntensity: 0.6 });
    const hierro = new MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.5, metalness: 0.6 });
    const caja = (ancho: number, alto: number, fondo: number, material: MeshStandardMaterial, x: number, y: number, z: number, padre: Object3D): Mesh => {
      const m = new Mesh(new BoxGeometry(ancho, alto, fondo), material);
      m.position.set(x, y, z);
      padre.add(m);
      return m;
    };
    // Cada hoja gira sobre su bisagra (en el borde de afuera): se abre hacia el vestíbulo.
    const hoja = (lado: number): Object3D => {
      const bisagra = new Group();
      bisagra.position.set(lado * PUERTA.hoja, 0, PUERTA.grosor / 2);
      caja(PUERTA.hoja - 0.01, PUERTA.alto, PUERTA.grosor, madera, -lado * (PUERTA.hoja / 2), PUERTA.alto / 2, 0, bisagra);
      caja(PUERTA.hoja * 0.6, PUERTA.alto * 0.42, 0.012, vidrio, -lado * (PUERTA.hoja / 2), PUERTA.alto * 0.68, PUERTA.grosor / 2 + 0.002, bisagra);
      this.objeto.add(bisagra);
      return bisagra;
    };
    this.hojas = [hoja(-1), hoja(1)];
    // Las cerraduras, en el centro: la cadena cruzada arriba, el cerrojo en el medio y la chapa de la llave abajo.
    this.cadena = new Group();
    caja(0.42, 0.02, 0.02, hierro, 0, 1.55, PUERTA.grosor + 0.02, this.cadena).rotation.z = 0.25;
    this.objeto.add(this.cadena);
    this.cerrojo = new Group();
    caja(0.22, 0.05, 0.03, hierro, 0, 1.15, PUERTA.grosor + 0.02, this.cerrojo);
    this.objeto.add(this.cerrojo);
    caja(0.08, 0.16, 0.02, hierro, 0.1, 0.98, PUERTA.grosor + 0.015, this.objeto);
    const zona = crearZonaToque(0.4);
    zona.position.set(0, 1.2, PUERTA.grosor + 0.1);
    this.objeto.add(zona);
    this.objeto.position.set(def.x * CONFIG.celda, 0, def.y * CONFIG.celda);
    this.objeto.rotation.y = (def.rot ?? 0) * GRADOS;
    vincular(this.objeto, this);
  }

  /** Mientras dura el momento de una cerradura, o ya abierta del todo, no respondo. */
  get activo(): boolean {
    return this.momento <= 0 && this.abiertas < CERRADURAS.length;
  }

  /** Cuántas cerraduras van abiertas (para las pruebas y el guion). */
  get cerradurasAbiertas(): number {
    return this.abiertas;
  }

  texto(ctx: ContextoJuego): string {
    const c = CERRADURAS[this.abiertas];
    if (!c) return '';
    return this.esLaDeLlave() && !this.tengoLaLlave(ctx) ? 'Cerrada con llave' : c.accion;
  }

  interactuar(ctx: ContextoJuego): void {
    const c = CERRADURAS[this.abiertas];
    if (!c || this.momento > 0) return;
    const p = this.objeto.position;
    if (this.esLaDeLlave() && !this.tengoLaLlave(ctx)) {
      ctx.audio.reproducir('cerradura', { posicion: { x: p.x, y: 1, z: p.z }, volumen: 0.7 });
      ctx.bus.emit('subtitulo', { texto: SIN_LLAVE, duracion: 2.5 });
      ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: 0.2, origen: 'puerta', causa: 'puerta' });
      return;
    }
    this.momento = c.duracion;
    for (const [id, cuando, volumen] of c.sonidos) {
      ctx.audio.reproducir(id, { posicion: { x: p.x, y: 1.2, z: p.z }, volumen, retraso: cuando });
    }
    ctx.bus.emit('ruido', { x: p.x, z: p.z, intensidad: c.ruido, origen: 'puerta', causa: 'puerta' });
    ctx.bus.emit('subtitulo', { texto: c.subtitulo, duracion: 2.5, tipo: 'efecto' });
  }

  /** Cada fotograma: si estoy en el momento de una cerradura, cuando termina queda abierta (y lo anoto). */
  actualizar(dt: number, ctx: ContextoJuego): void {
    if (this.momento <= 0) return;
    this.momento -= dt;
    if (this.momento > 0) return;
    this.abiertas++;
    this.posar();
    ctx.progreso.marcar(banderaCerradura(this.abiertas));
    if (this.abiertas === CERRADURAS.length) {
      const p = this.objeto.position;
      ctx.audio.reproducir('puerta_crujido', { posicion: { x: p.x, y: 1.2, z: p.z }, volumen: 1, tono: 0.7 });
      ctx.progreso.marcar(this.bandera);
    }
  }

  /** Al cargar o armar el piso: abiertas las que diga el progreso. */
  restablecer(ctx: ContextoJuego): void {
    this.momento = 0;
    this.abiertas = 0;
    while (this.abiertas < CERRADURAS.length && ctx.progreso.tiene(banderaCerradura(this.abiertas + 1))) this.abiertas++;
    this.posar();
  }

  private esLaDeLlave(): boolean {
    return this.abiertas === CERRADURAS.length - 1 && this.llave !== null;
  }

  private tengoLaLlave(ctx: ContextoJuego): boolean {
    return this.llave === null || ctx.progreso.tieneObjeto(this.llave);
  }

  /** Cada pieza donde va según las cerraduras abiertas: la cadena en el piso, el cerrojo corrido, las hojas abiertas. */
  private posar(): void {
    this.cadena.visible = this.abiertas < 1;
    this.cerrojo.position.x = this.abiertas >= 2 ? 0.2 : 0;
    const abierta = this.abiertas >= CERRADURAS.length ? 0.5 : 0;
    // La de la izquierda gira hacia un lado y la de la derecha hacia el otro: las dos hacia el vestíbulo.
    this.hojas[0].rotation.y = -abierta;
    this.hojas[1].rotation.y = abierta;
  }
}
