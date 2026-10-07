// Aquí dibujo cada hueco de escalera: el pozo de concreto, el tramo que baja hacia la oscuridad (cerrado
// con una reja y una cadena: el piso de abajo todavía no se visita), el tramo que sube (tapado con tablas y
// escombros) y las barandas. Nadie camina por aquí: es escenario. La colisión la pone la rejilla (una celda
// 'E' bloquea como un muro) y lo que se ve coincide con ella: la reja, las tablas y la baranda están en la
// boca misma del hueco.
//
// Pensé la escalera como una de verdad, de ida y vuelta: desde la boca, un tramo baja y otro sube, los dos
// hacia el fondo; allá cada uno llega a su descanso (medio piso abajo, medio piso arriba) y da la vuelta por
// el otro lado. Entre los tramos queda el "ojo": el vacío por donde el jugador mira hacia abajo y no ve el fin.
//
// Armo todo en el marco LOCAL del hueco (u a lo largo de la boca, v hacia dentro, y hacia arriba) y luego
// lo paso al mundo. Junto todas las piezas de un mismo material en una sola malla: pocas llamadas de dibujo.
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { BibliotecaMateriales, IdMaterial } from '../render/Materiales';
import { crearGenerador, type GeneradorAleatorio } from '../utilidades/Aleatorio';
import { encontrarHuecos, marcoDelHueco, type MarcoHueco } from './HuecoEscalera';
import type { Rejilla } from './Rejilla';

/** Contrahuellas por medio piso: 8 de ~17 cm, como en un edificio de verdad. */
const ESCALONES = 8;
const GROSOR_DESCANSO = 0.2;
const GROSOR_RAMPA = 0.15;
const ALTO_BARANDA = 0.95;
/** La baranda de la boca va sobre el borde del piso de la escalera (2.5 cm antes del hueco): apoyada, no flotando. */
const BORDE_BOCA = -0.025;
/** El pozo baja más allá de lo que se alcanza a ver y sube un piso entero sobre el techo. */
const FONDO_POZO = -3.2;
/**
 * La oscuridad de abajo: capas negras semitransparentes, una sobre otra. Mirando hacia abajo se suman
 * (lo que está más hondo queda detrás de más capas) y el pozo se pierde en lo negro sin un piso que lo cierre.
 */
const CAPAS_OSCURIDAD = [-1.6, -1.95, -2.3, -2.65];
const OPACIDAD_CAPA = 0.36;
const FONDO_NEGRO = -3.0;

// Estos dos materiales no llevan textura ni luz: los creo una sola vez y los comparto.
let materialCapa: MeshBasicMaterial | null = null;
let materialNegro: MeshBasicMaterial | null = null;
function materialesOscuridad(): { capa: MeshBasicMaterial; negro: MeshBasicMaterial } {
  materialCapa ??= new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: OPACIDAD_CAPA, depthWrite: false });
  materialNegro ??= new MeshBasicMaterial({ color: 0x000000 });
  return { capa: materialCapa, negro: materialNegro };
}

/** Junto las piezas por material, ya puestas en el mundo. */
class Piezas {
  readonly porMaterial = new Map<IdMaterial, BufferGeometry[]>();
  readonly capas: BufferGeometry[] = [];
  readonly negras: BufferGeometry[] = [];

  constructor(private readonly aMundo: Matrix4) {}

  agregar(id: IdMaterial, geometria: BufferGeometry, local: Matrix4): void {
    geometria.applyMatrix4(local).applyMatrix4(this.aMundo);
    let lista = this.porMaterial.get(id);
    if (!lista) {
      lista = [];
      this.porMaterial.set(id, lista);
    }
    lista.push(geometria);
  }

  /** Una caja (ancho en u, alto en y, fondo en v) con su centro en (u, y, v) y un giro opcional. */
  caja(id: IdMaterial, ancho: number, alto: number, fondo: number, u: number, y: number, v: number, giro?: Quaternion): void {
    const local = new Matrix4().compose(new Vector3(u, y, v), giro ?? new Quaternion(), new Vector3(1, 1, 1));
    this.agregar(id, new BoxGeometry(ancho, alto, fondo), local);
  }

  /** Una barra de sección cuadrada entre dos puntos (u, y, v). */
  barra(id: IdMaterial, grosor: number, a: Vector3, b: Vector3): void {
    const direccion = new Vector3().subVectors(b, a);
    const largo = direccion.length();
    const giro = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direccion.normalize());
    const centro = new Vector3().addVectors(a, b).multiplyScalar(0.5);
    this.caja(id, grosor, grosor, largo, centro.x, centro.y, centro.z, giro);
  }

  /** Un plano horizontal que mira hacia arriba (para la oscuridad del pozo). */
  plano(destino: BufferGeometry[], ancho: number, fondo: number, y: number): void {
    const local = new Matrix4().makeTranslation(ancho / 2, y, fondo / 2).multiply(new Matrix4().makeRotationX(-Math.PI / 2));
    destino.push(new PlaneGeometry(ancho, fondo).applyMatrix4(local).applyMatrix4(this.aMundo));
  }
}

/**
 * Coordenadas de textura en metros del MUNDO, con la misma regla que el resto del edificio (pisos con x/z,
 * muros con (x+z)/y): así el concreto del pozo continúa sin costura el de la escalera.
 */
function texturaEnMundo(geometria: BufferGeometry, escala: number): void {
  const p = geometria.getAttribute('position');
  const n = geometria.getAttribute('normal');
  const uv = geometria.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const horizontal = Math.abs(n.getY(i)) >= Math.max(Math.abs(n.getX(i)), Math.abs(n.getZ(i)));
    if (horizontal) uv.setXY(i, x / escala, z / escala);
    else uv.setXY(i, (x + z) / escala, y / escala);
  }
  uv.needsUpdate = true;
}

/** Construyo todos los huecos de escalera del mapa. Si no hay ninguno, devuelvo un grupo vacío. */
export interface OpcionesEscalera {
  rejaAbajo?: boolean;
  escombrosArriba?: boolean;
}

export function construirEscaleras(rejilla: Rejilla, materiales: BibliotecaMateriales, opciones: OpcionesEscalera = {}): Group {
  const grupo = new Group();
  grupo.name = 'escaleras';
  encontrarHuecos(rejilla).forEach((hueco, i) => {
    const marco = marcoDelHueco(hueco, CONFIG.celda);
    grupo.add(construirHueco(marco, materiales, crearGenerador(9041 + i * 131), opciones));
  });
  return grupo;
}

function construirHueco(m: MarcoHueco, materiales: BibliotecaMateriales, azar: GeneradorAleatorio, opciones: OpcionesEscalera = {}): Group {
  const H = CONFIG.alturaTecho;
  const A = m.ancho;
  const L = m.fondo;
  const aMundo = new Matrix4().makeRotationY(m.angulo).setPosition(m.origenX, 0, m.origenZ);
  const piezas = new Piezas(aMundo);

  // Medidas: dos tramos de 1.3 m (o lo que quepa) y el ojo en medio; huellas de ~24 cm y el descanso al fondo.
  const contrahuella = H / 2 / ESCALONES;
  const anchoTramo = Math.min(1.3, (A - 0.6) / 2);
  const huella = Math.min(0.27, (L - 0.9) / (ESCALONES - 1));
  const inicioDescanso = (ESCALONES - 1) * huella;
  const izquierda = { u0: 0, u1: anchoTramo, baranda: anchoTramo - 0.04 };
  const derecha = { u0: A - anchoTramo, u1: A, baranda: A - anchoTramo + 0.04 };

  construirPozo(piezas, A, L, H);
  construirOscuridad(piezas, A, L);

  // Los dos descansos, a medio piso abajo y a medio piso arriba, de muro a muro.
  for (const nivel of [-H / 2, H / 2]) {
    piezas.caja('pisoConcreto', A, GROSOR_DESCANSO, L - inicioDescanso, A / 2, nivel - GROSOR_DESCANSO / 2, (inicioDescanso + L) / 2);
    barandaRecta(piezas, izquierda.baranda, derecha.baranda, inicioDescanso + 0.03, nivel);
  }
  // La baranda de la boca, sobre el ojo: es lo que el jugador tiene delante al asomarse.
  barandaRecta(piezas, izquierda.baranda, derecha.baranda, BORDE_BOCA, 0);

  const medidas = { contrahuella, huella, inicioDescanso };
  // Desde la boca: a la izquierda baja, a la derecha sube.
  tramo(piezas, medidas, izquierda, { vInicio: 0, yInicio: 0, sentidoV: 1, sentidoY: -1, extraInicio: 0, extraFin: 0.1 });
  tramo(piezas, medidas, derecha, { vInicio: 0, yInicio: 0, sentidoV: 1, sentidoY: 1, extraInicio: 0, extraFin: 0.1 });
  // Desde los descansos, de vuelta hacia la boca: el que llega al piso de abajo (derecha) y el que llega al de
  // arriba (izquierda). Este último lo recorto en la boca: si no, su losa asomaría bajo el techo de la escalera.
  tramo(piezas, medidas, derecha, { vInicio: inicioDescanso, yInicio: -H / 2, sentidoV: -1, sentidoY: -1, extraInicio: 0.1, extraFin: 0 });
  tramo(piezas, medidas, izquierda, { vInicio: inicioDescanso, yInicio: H / 2, sentidoV: -1, sentidoY: 1, extraInicio: 0.1, extraFin: -0.1 });

  if (opciones.rejaAbajo !== false) construirReja(piezas, izquierda.u0 + 0.02, izquierda.baranda - 0.06, 0.09, -contrahuella);
  if (opciones.escombrosArriba !== false) {
    construirTablas(piezas, derecha.baranda, A, 0.07);
    construirEscombros(piezas, azar, A, L, H, anchoTramo, medidas);
  }

  return crearMallas(piezas, materiales);
}

/** Las cuatro paredes del pozo, su techo y las caras que tapan los pisos de arriba y de abajo en la boca. */
function construirPozo(piezas: Piezas, A: number, L: number, H: number): void {
  const tope = 2 * H;
  const alto = tope - FONDO_POZO;
  const medio = (tope + FONDO_POZO) / 2;
  const g = 0.2;
  piezas.caja('paredConcreto', g, alto, L, -g / 2, medio, L / 2);
  piezas.caja('paredConcreto', g, alto, L, A + g / 2, medio, L / 2);
  piezas.caja('paredConcreto', A + 2 * g, alto, g, A / 2, medio, L + g / 2);
  // En la boca, bajo el piso de la escalera y sobre su techo (1 cm de margen para no pelear con ellos).
  piezas.caja('paredConcreto', A, -0.01 - FONDO_POZO, g, A / 2, (FONDO_POZO - 0.01) / 2, -g / 2);
  piezas.caja('paredConcreto', A, tope - H - 0.01, g, A / 2, (tope + H + 0.01) / 2, -g / 2);
  piezas.caja('techo', A, g, L, A / 2, tope + g / 2, L / 2);
}

function construirOscuridad(piezas: Piezas, A: number, L: number): void {
  for (const y of CAPAS_OSCURIDAD) piezas.plano(piezas.capas, A, L, y);
  piezas.plano(piezas.negras, A, L, FONDO_NEGRO);
}

interface Medidas {
  contrahuella: number;
  huella: number;
  inicioDescanso: number;
}

interface Lado {
  u0: number;
  u1: number;
  /** Dónde va la baranda del lado del ojo. */
  baranda: number;
}

interface Recorrido {
  /** Dónde empieza el tramo (en la boca o en un descanso) y a qué altura está ese piso. */
  vInicio: number;
  yInicio: number;
  /** Hacia dónde avanza (+1: hacia el fondo) y si sube (+1) o baja (−1). */
  sentidoV: 1 | -1;
  sentidoY: 1 | -1;
  /** Cuánto alargo (o recorto, si es negativo) la losa inclinada en cada punta. */
  extraInicio: number;
  extraFin: number;
}

/** Un tramo de 7 huellas (la 8.ª contrahuella sube o baja al descanso), su losa inclinada y su baranda. */
function tramo(piezas: Piezas, med: Medidas, lado: Lado, r: Recorrido): void {
  const { contrahuella: c, huella: h } = med;
  const ancho = lado.u1 - lado.u0;
  const uCentro = (lado.u0 + lado.u1) / 2;
  const huellaEn = (i: number) => {
    const va = r.vInicio + r.sentidoV * (i - 1) * h;
    const vb = r.vInicio + r.sentidoV * i * h;
    return { v: (va + vb) / 2, va, vb, y: r.yInicio + r.sentidoY * i * c };
  };

  for (let i = 1; i < ESCALONES; i++) {
    const p = huellaEn(i);
    piezas.caja('pisoConcreto', ancho, c, h, uCentro, p.y - c / 2, p.v);
  }

  // La losa: su cara de arriba pasa por las esquinas de abajo de los escalones; por debajo se ve lisa.
  const base = r.yInicio + (r.sentidoY > 0 ? 0 : -c);
  const p0 = new Vector3(0, base, r.vInicio);
  const p1 = new Vector3(0, base + r.sentidoY * (ESCALONES - 1) * c, r.vInicio + r.sentidoV * (ESCALONES - 1) * h);
  const direccion = new Vector3().subVectors(p1, p0).normalize();
  const desde = p0.clone().addScaledVector(direccion, -r.extraInicio);
  const hasta = p1.clone().addScaledVector(direccion, r.extraFin);
  // La normal "hacia abajo" de la losa (perpendicular a la pendiente).
  const abajo = new Vector3(0, -direccion.z, direccion.y);
  if (abajo.y > 0) abajo.negate();
  const centro = new Vector3().addVectors(desde, hasta).multiplyScalar(0.5).addScaledVector(abajo, GROSOR_RAMPA / 2);
  const giro = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direccion);
  piezas.caja('pisoConcreto', ancho, GROSOR_RAMPA, desde.distanceTo(hasta), uCentro, centro.y, centro.z, giro);

  // La baranda del lado del ojo: pasamanos inclinado y dos balaustres por huella, apoyados en ella.
  const yFinal = r.yInicio + r.sentidoY * (ESCALONES * c);
  const vFinal = r.vInicio + r.sentidoV * (ESCALONES - 1) * h;
  const vBoca = Math.min(r.vInicio, vFinal);
  const a = new Vector3(lado.baranda, r.yInicio + ALTO_BARANDA, r.vInicio === vBoca ? BORDE_BOCA : r.vInicio);
  const b = new Vector3(lado.baranda, yFinal + ALTO_BARANDA, vFinal === vBoca ? BORDE_BOCA : vFinal);
  piezas.barra('metal', 0.05, a, b);
  const alturaPasamanos = (v: number) => a.y + ((v - a.z) / (b.z - a.z)) * (b.y - a.y);
  for (let i = 1; i < ESCALONES; i++) {
    const p = huellaEn(i);
    for (const t of [0.25, 0.75]) {
      const v = p.va + (p.vb - p.va) * t;
      piezas.barra('metal', 0.022, new Vector3(lado.baranda, p.y, v), new Vector3(lado.baranda, alturaPasamanos(v), v));
    }
  }
}

/** Una baranda recta y horizontal a lo ancho del ojo, sobre un piso a la altura "piso". */
function barandaRecta(piezas: Piezas, u0: number, u1: number, v: number, piso: number): void {
  piezas.barra('metal', 0.05, new Vector3(u0, piso + ALTO_BARANDA, v), new Vector3(u1, piso + ALTO_BARANDA, v));
  piezas.barra('metal', 0.03, new Vector3(u0, piso + 0.1, v), new Vector3(u1, piso + 0.1, v));
  const cuantos = Math.round((u1 - u0) / 0.12);
  for (let k = 0; k <= cuantos; k++) {
    const u = u0 + ((u1 - u0) * k) / cuantos;
    piezas.barra('metal', 0.022, new Vector3(u, piso, v), new Vector3(u, piso + ALTO_BARANDA, v));
  }
}

/**
 * La reja que cierra el tramo que baja: dos hojas de barrotes que se juntan en el centro, amarradas con una
 * cadena y un candado. Se ve el primer escalón a través de ella... y nada más.
 */
function construirReja(piezas: Piezas, u0: number, u1: number, v: number, piso: number): void {
  const arriba = 2.05;
  const centro = (u0 + u1) / 2;
  const columna = (u: number, grosor: number, y0: number, y1: number) =>
    piezas.barra('metal', grosor, new Vector3(u, y0, v), new Vector3(u, y1, v));
  const travesano = (y: number) => piezas.barra('metal', 0.035, new Vector3(u0, y, v), new Vector3(u1, y, v));

  columna(u0 + 0.025, 0.05, piso, arriba + 0.05);
  columna(u1 - 0.025, 0.05, piso, arriba + 0.05);
  columna(centro - 0.02, 0.035, piso + 0.02, arriba);
  columna(centro + 0.02, 0.035, piso + 0.02, arriba);
  travesano(piso + 0.1);
  travesano(1.0);
  travesano(arriba - 0.03);
  const cuantos = Math.round((u1 - u0) / 0.11);
  for (let k = 1; k < cuantos; k++) {
    const u = u0 + ((u1 - u0) * k) / cuantos;
    if (Math.abs(u - centro) < 0.05) continue;
    // Los barrotes sobresalen un poco arriba, como lanzas.
    columna(u, 0.016, piso + 0.02, arriba + 0.09);
  }
  construirCadena(piezas, centro, 1.0, v);
}

/** Eslabones alrededor de los dos largueros del centro, y un tramo colgando con el candado. */
function construirCadena(piezas: Piezas, u: number, y: number, v: number): void {
  const eslabon = () => new TorusGeometry(0.02, 0.006, 6, 10).scale(1.5, 1, 1);
  const arriba = new Vector3(0, 1, 0);
  const poner = (centro: Vector3, tangente: Vector3, acostado: boolean) => {
    const t = tangente.clone().normalize();
    const lateral = new Vector3().crossVectors(arriba, t).normalize();
    // Un eslabón sí y otro no va acostado: así se ven trabados.
    const base = acostado
      ? new Matrix4().makeBasis(t, lateral, arriba)
      : new Matrix4().makeBasis(t, arriba, new Vector3().crossVectors(t, arriba));
    piezas.agregar('metal', eslabon(), base.setPosition(centro));
  };

  const vueltas = 12;
  const radioU = 0.07;
  const radioV = 0.045;
  for (let k = 0; k < vueltas; k++) {
    const a = (k / vueltas) * Math.PI * 2;
    const centro = new Vector3(u + Math.cos(a) * radioU, y + Math.sin(a * 2) * 0.008, v + Math.sin(a) * radioV);
    poner(centro, new Vector3(-Math.sin(a) * radioU, 0, Math.cos(a) * radioV), k % 2 === 0);
  }
  // Lo que cuelga, del lado del jugador.
  const delante = v - radioV;
  for (let k = 1; k <= 4; k++) {
    const centro = new Vector3(u + 0.01 * k, y - 0.045 * k, delante);
    const tangente = new Vector3(0.2, -1, 0);
    const t = tangente.clone().normalize();
    const base = k % 2 === 0
      ? new Matrix4().makeBasis(t, new Vector3(0, 0, 1), new Vector3().crossVectors(t, new Vector3(0, 0, 1)))
      : new Matrix4().makeBasis(t, new Vector3().crossVectors(new Vector3(0, 0, 1), t).normalize(), new Vector3(0, 0, 1));
    piezas.agregar('metal', eslabon(), base.setPosition(centro));
  }
  const yCandado = y - 0.045 * 5 - 0.03;
  const uCandado = u + 0.05;
  piezas.caja('metal', 0.05, 0.06, 0.022, uCandado, yCandado, delante);
  const arco = new TorusGeometry(0.015, 0.004, 5, 10, Math.PI);
  piezas.agregar('metal', arco, new Matrix4().makeTranslation(uCandado, yCandado + 0.03, delante));
}

/** Tablas clavadas de la baranda al muro: alguien cerró el tramo que sube, y no fue con cuidado. */
function construirTablas(piezas: Piezas, u0: number, u1: number, v: number): void {
  const giroZ = (angulo: number) => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angulo);
  const largo = u1 - u0 + 0.06;
  const centro = (u0 + u1) / 2;
  piezas.caja('madera', largo, 0.11, 0.025, centro, 0.42, v, giroZ(0.05));
  piezas.caja('madera', largo, 0.12, 0.025, centro, 0.9, v, giroZ(-0.04));
  piezas.caja('madera', largo, 0.1, 0.025, centro, 1.42, v, giroZ(0.025));
  const diagonal = Math.atan2(1.0, u1 - u0);
  piezas.caja('madera', Math.hypot(u1 - u0, 1.0), 0.1, 0.025, centro, 0.82, v + 0.03, giroZ(diagonal));
}

/**
 * Escombros: el techo del descanso de arriba cedió. Una losa rota apoyada en el tramo que sigue subiendo,
 * un montón de pedazos en el descanso y unos cuantos que rodaron por las últimas huellas. Uso un azar con
 * semilla: los escombros caen siempre igual.
 */
function construirEscombros(piezas: Piezas, azar: GeneradorAleatorio, A: number, L: number, H: number, anchoTramo: number, med: Medidas): void {
  const entre = (a: number, b: number) => a + (b - a) * azar();
  const giroAzar = (fuerza: number) =>
    new Quaternion().setFromAxisAngle(new Vector3(entre(-1, 1), entre(-1, 1), entre(-1, 1)).normalize(), entre(-fuerza, fuerza));
  const pedazo = (u: number, piso: number, v: number, tamano: number) => {
    const a = tamano * entre(0.7, 1.3);
    const b = tamano * entre(0.4, 0.8);
    const c = tamano * entre(0.7, 1.2);
    piezas.caja('paredConcreto', a, b, c, u, piso + b * 0.35, v, giroAzar(0.7));
  };

  const descanso = H / 2;
  // El montón: más alto contra el muro del fondo y hacia el tramo que sigue subiendo (a la izquierda).
  for (let k = 0; k < 26; k++) {
    const u = entre(0.1, A - 0.1);
    const v = entre(med.inicioDescanso + 0.1, L - 0.1);
    const hacia = 1 - u / A;
    const altura = entre(0, 0.55) * (0.4 + hacia);
    pedazo(u, descanso + altura, v, entre(0.14, 0.42));
  }
  // Lo que rodó por las últimas cuatro huellas del tramo que sube.
  for (let i = ESCALONES - 4; i < ESCALONES; i++) {
    const cuantos = 1 + Math.floor(azar() * 2);
    for (let k = 0; k < cuantos; k++) {
      const v = (i - 0.5) * med.huella + entre(-0.06, 0.06);
      pedazo(entre(A - anchoTramo + 0.15, A - 0.12), i * med.contrahuella, v, entre(0.1, 0.26));
    }
  }
  // Lo que quedó sobre las primeras huellas del tramo que sigue subiendo.
  for (let i = 1; i <= 4; i++) {
    const v = med.inicioDescanso - (i - 0.5) * med.huella;
    pedazo(entre(0.15, anchoTramo - 0.2), descanso + i * med.contrahuella, v, entre(0.12, 0.3));
  }
  // La losa rota: cayó con una punta en el descanso y la otra sobre ese tramo. Tapa el paso por completo.
  const bajo = new Vector3(anchoTramo / 2 - 0.04, descanso + 0.07, med.inicioDescanso + 0.5);
  const alto = new Vector3(anchoTramo / 2 - 0.04, descanso + 0.95, med.inicioDescanso - 0.95);
  const eje = new Vector3().subVectors(alto, bajo);
  const losa = new Quaternion()
    .setFromUnitVectors(new Vector3(0, 0, 1), eje.clone().normalize())
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.12));
  const medio = new Vector3().addVectors(bajo, alto).multiplyScalar(0.5);
  piezas.caja('paredConcreto', anchoTramo * 0.95, 0.14, eje.length(), medio.x, medio.y, medio.z, losa);
  // Varillas torcidas que salen de la losa y del montón.
  for (let k = 0; k < 6; k++) {
    const largo = entre(0.5, 1.1);
    const varilla = new CylinderGeometry(0.007, 0.007, largo, 5);
    const giro = giroAzar(1.2);
    const lugar = new Vector3(entre(0.2, A * 0.6), descanso + entre(0.3, 1.1), entre(med.inicioDescanso, L - 0.2));
    piezas.agregar('metal', varilla, new Matrix4().compose(lugar, giro, new Vector3(1, 1, 1)));
  }
}

function crearMallas(piezas: Piezas, materiales: BibliotecaMateriales): Group {
  const grupo = new Group();
  grupo.name = 'hueco-escalera';
  const fijar = (malla: Mesh) => {
    malla.matrixAutoUpdate = false;
    malla.updateMatrix();
    grupo.add(malla);
  };
  for (const [id, lista] of piezas.porMaterial) {
    const escala = materiales.escala(id);
    for (const g of lista) texturaEnMundo(g, escala);
    const malla = new Mesh(mergeGeometries(lista, false), materiales.obtener(id));
    malla.name = `escalera-${id}`;
    malla.castShadow = true;
    malla.receiveShadow = true;
    fijar(malla);
  }
  const { capa, negro } = materialesOscuridad();
  const capas = new Mesh(mergeGeometries(piezas.capas, false), capa);
  capas.name = 'escalera-oscuridad';
  // Las dibujo después de todo lo opaco de la escalera (ya lo hace three.js con lo transparente).
  fijar(capas);
  const fondo = new Mesh(mergeGeometries(piezas.negras, false), negro);
  fondo.name = 'escalera-fondo';
  fijar(fondo);
  for (const lista of [...piezas.porMaterial.values(), piezas.capas, piezas.negras]) for (const g of lista) g.dispose();
  return grupo;
}
