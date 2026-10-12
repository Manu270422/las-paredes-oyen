// Aquí armo lo que se ve de un ascensor: las dos hojas de metal que se abren hacia los lados, el marco de acero en
// el pasillo, el botón de llamar, el indicador de piso (afuera y adentro), el revestimiento de la cabina, el
// pasamanos y el panel con sus botones. El muro con el vano lo levanta ConstructorGeometria (es del pasillo); la luz
// de la cabina es una lámpara del mapa. Todo va en un grupo con el giro de la cabina: en su espacio, +Z es hacia
// afuera (u) y +X es la izquierda de quien sale (-v).
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  type Material,
} from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { BibliotecaMateriales } from '../render/Materiales';
import { IndicadorPiso, texturaPanel } from '../render/texturas/TexturasAscensor';
import { DISPOSICION_CABINA, type MarcoCabina } from './MarcoCabina';

/** Lo que el ascensor le pide a su modelo (las pruebas sin navegador usan uno de mentira). */
export interface VistaAscensor {
  readonly raiz: Group;
  /** 0 cerradas, 1 abiertas del todo. */
  fijarApertura(apertura: number): void;
  /** Lo que marca el indicador: el número, la flecha (1 sube, -1 baja, 0 quieto) y si tiene corriente. */
  fijarIndicador(numero: string, flecha: number, encendido: boolean): void;
  /** El botón de llamar encendido (lo pulsé y viene). */
  fijarLlamada(encendido: boolean): void;
  /** El botón del panel encendido (el piso al que voy), por su posición en `numeros`; null, ninguno. */
  fijarBoton(indice: number | null): void;
}

/** Medidas del panel en metros (ancho a lo largo del muro y alto). */
const PANEL = { ancho: 0.16, alto: 0.42, grosor: 0.01 } as const;
const PX_PANEL = { ancho: 128, alto: 336 } as const;
/** Las hojas: cuánto se montan sobre el vano por cada lado y su grosor. */
const HOJA = { solape: 0.012, grosor: 0.025, adentro: 0.035 } as const;

/** El material de un botón que se enciende (ámbar) al pulsarlo. */
function luzBoton(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x3a362f, emissive: 0xffa040, emissiveIntensity: 0, roughness: 0.45 });
}

/** La altura (y) del botón `i` de un panel con `n` botones, el piso más alto arriba. */
export function alturaBoton(i: number, n: number): number {
  return DISPOSICION_CABINA.panel.y + ((n - 1) / 2 - i) * DISPOSICION_CABINA.entreBotones;
}

/** Dónde queda, a lo largo del muro (u), la columna de botones del panel: a la derecha de los números. */
export const U_BOTONES = DISPOSICION_CABINA.panel.u - 0.12 * PANEL.ancho;

export class ModeloAscensor implements VistaAscensor {
  readonly raiz = new Group();
  private readonly hojas: [Mesh, Mesh];
  private readonly indicadores: IndicadorPiso[] = [];
  private readonly luzLlamada: MeshStandardMaterial;
  private readonly luzBotones: MeshStandardMaterial[] = [];

  /** `numeros`: lo que dice cada botón del panel, del piso más alto al más bajo (igual en todos los pisos). */
  constructor(marco: MarcoCabina, materiales: BibliotecaMateriales, numeros: readonly string[]) {
    const C = CONFIG.celda;
    const H = CONFIG.alturaTecho;
    const HP = CONFIG.alturaPuerta;
    const A = CONFIG.anchoVano;
    const m = marco.medio;
    // Todos mis materiales quedan conservados en la biblioteca: se crean una vez y sobreviven al cambio de piso (si
    // se soltaran, el piso nuevo recompilaría sus shaders: segundos sin GPU, un tirón en un celular).
    // El acero de la cabina: la textura del metal de la biblioteca, pero mucho más mate. El juego no tiene mapa de
    // entorno, y con el metal de la biblioteca (60 % metálico) la cabina se veía negra incluso con su tubo encendido.
    const metal = materiales.conservado('ascensor:acero', () => {
      const acero = materiales.obtener('metal').clone();
      acero.name = 'acero-ascensor';
      acero.metalness = 0.22;
      acero.color.setHex(0xb9bec4);
      return acero;
    });
    this.raiz.name = 'cabina-ascensor';
    this.raiz.position.set(marco.cx, 0, marco.cz);
    this.raiz.rotation.y = marco.angulo;

    const caja = (ancho: number, alto: number, fondo: number, material: Material, x: number, y: number, z: number): Mesh => {
      const malla = new Mesh(new BoxGeometry(ancho, alto, fondo), material);
      malla.position.set(x, y, z);
      this.raiz.add(malla);
      return malla;
    };
    const plano = (ancho: number, alto: number, material: Material, x: number, y: number, z: number, giroY: number, giroX = 0): Mesh => {
      const malla = new Mesh(new PlaneGeometry(ancho, alto), material);
      malla.position.set(x, y, z);
      malla.rotation.set(giroX, giroY, 0, 'YXZ');
      malla.receiveShadow = true;
      this.raiz.add(malla);
      return malla;
    };

    // Las hojas, un poco hacia adentro del plano del muro: abiertas, se esconden detrás de él (desde el pasillo).
    const anchoHoja = A / 2 + HOJA.solape;
    const hoja = () => {
      const h = caja(anchoHoja, HP - 0.01, HOJA.grosor, metal, 0, (HP - 0.01) / 2, m - HOJA.adentro);
      h.castShadow = true;
      return h;
    };
    this.hojas = [hoja(), hoja()];

    // El marco de acero en la cara del pasillo: dos jambas y el cabezal.
    const fondoMarco = 0.02;
    for (const lado of [-1, 1]) caja(0.05, HP + 0.05, fondoMarco, metal, lado * (A / 2 + 0.025), (HP + 0.05) / 2, m + fondoMarco / 2);
    caja(A + 0.1, 0.05, fondoMarco, metal, 0, HP + 0.025, m + fondoMarco / 2);

    // El indicador de piso: sobre el marco (afuera) y sobre las puertas (adentro).
    for (const afuera of [true, false]) {
      // El lienzo del indicador viaja con su material (en userData): los dos se conservan juntos.
      const vidrio = materiales.conservado(`ascensor:indicador:${afuera ? 'afuera' : 'adentro'}`, () => {
        const nuevo = new IndicadorPiso();
        const material = new MeshBasicMaterial({ map: nuevo.textura, toneMapped: false });
        material.userData.indicador = nuevo;
        return material;
      });
      this.indicadores.push(vidrio.userData.indicador as IndicadorPiso);
      caja(0.24, 0.13, 0.03, metal, 0, HP + 0.2, afuera ? m + 0.015 : m - 0.027);
      plano(0.2, 0.1, vidrio, 0, HP + 0.2, afuera ? m + 0.031 : m - 0.043, afuera ? 0 : Math.PI);
    }

    // El botón de llamar: una placa con un botón redondo que se enciende al pulsarlo.
    const { llamar } = DISPOSICION_CABINA;
    caja(0.07, 0.14, 0.012, metal, -llamar.v, llamar.y, m + 0.006);
    this.luzLlamada = materiales.conservado('ascensor:llamar', () => luzBoton());
    const botonLlamar = new Mesh(new CylinderGeometry(0.016, 0.016, 0.012, 16), this.luzLlamada);
    botonLlamar.rotation.x = Math.PI / 2;
    botonLlamar.position.set(-llamar.v, llamar.y, m + 0.016);
    this.raiz.add(botonLlamar);

    // Adentro: el revestimiento de acero (fondo, costados, la cara de adentro del muro de las puertas y el techo).
    const r = 0.012;
    plano(C - 2 * r, H - 2 * r, metal, 0, H / 2, -m + r, 0);
    plano(C - 2 * r, H - 2 * r, metal, m - r, H / 2, 0, -Math.PI / 2);
    plano(C - 2 * r, H - 2 * r, metal, -m + r, H / 2, 0, Math.PI / 2);
    const tira = m - A / 2 - r;
    for (const lado of [-1, 1]) plano(tira, H - 2 * r, metal, lado * (A / 2 + tira / 2), H / 2, m - r, Math.PI);
    plano(A, H - HP - r, metal, 0, (HP + H - r) / 2, m - r, Math.PI);
    plano(C - 2 * r, C - 2 * r, metal, 0, H - r, 0, 0, Math.PI / 2);
    // El piso de caucho negro, gastado en el centro, y el pasamanos del fondo.
    const caucho = materiales.conservado('ascensor:caucho', () => new MeshStandardMaterial({ color: 0x151413, roughness: 0.95, side: DoubleSide }));
    plano(C - 2 * r, C - 2 * r, caucho, 0, 0.006, 0, 0, -Math.PI / 2);
    const pasamanos = new Mesh(new CylinderGeometry(0.018, 0.018, C - 0.24, 10), metal);
    pasamanos.rotation.z = Math.PI / 2;
    pasamanos.position.set(0, 0.92, -m + 0.07);
    this.raiz.add(pasamanos);
    for (const lado of [-1, 1]) caja(0.02, 0.02, 0.06, metal, lado * (C / 2 - 0.2), 0.92, -m + 0.04);

    // El panel, en el muro de la derecha de quien sale (en este espacio, -X), mirando hacia adentro (+X).
    const { panel } = DISPOSICION_CABINA;
    const xPanel = -(panel.v) + PANEL.grosor / 2;
    caja(PANEL.grosor, PANEL.alto, PANEL.ancho, metal, -(panel.v), panel.y, panel.u);
    const filaPx = (i: number) => PX_PANEL.alto / 2 - ((alturaBoton(i, numeros.length) - panel.y) / PANEL.alto) * PX_PANEL.alto;
    const cara = materiales.conservado(`ascensor:panel:${numeros.join(',')}`, () => {
      return new MeshStandardMaterial({ map: texturaPanel(numeros, PX_PANEL.ancho, PX_PANEL.alto, filaPx), roughness: 0.55, metalness: 0.35 });
    });
    plano(PANEL.ancho, PANEL.alto, cara, xPanel + 0.0008, panel.y, panel.u, Math.PI / 2);
    numeros.forEach((_, i) => {
      const luz = materiales.conservado(`ascensor:boton:${i}`, () => luzBoton());
      this.luzBotones.push(luz);
      const boton = new Mesh(new CylinderGeometry(0.014, 0.014, 0.01, 16), luz);
      boton.rotation.z = Math.PI / 2;
      boton.position.set(xPanel + 0.005, alturaBoton(i, numeros.length), U_BOTONES);
      this.raiz.add(boton);
    });

    this.fijarApertura(0);
  }

  fijarApertura(apertura: number): void {
    const a = Math.max(0, Math.min(1, apertura));
    // Con una curva suave: arrancan despacio, corren y frenan contra el muro.
    const s = a * a * (3 - 2 * a);
    const centro = (CONFIG.anchoVano / 4 + HOJA.solape / 2) + s * (CONFIG.anchoVano / 2);
    this.hojas[0].position.x = centro;
    this.hojas[1].position.x = -centro;
  }

  fijarIndicador(numero: string, flecha: number, encendido: boolean): void {
    for (const i of this.indicadores) i.pintar(numero, flecha, encendido);
  }

  fijarLlamada(encendido: boolean): void {
    this.luzLlamada.emissiveIntensity = encendido ? 2.2 : 0;
  }

  fijarBoton(indice: number | null): void {
    this.luzBotones.forEach((luz, i) => (luz.emissiveIntensity = i === indice ? 2.2 : 0));
  }
}
