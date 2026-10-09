// Aquí armo el nivel completo a partir de sus DATOS: geometría, puertas,
// lámparas, muebles e interactuables. También respondo consultas del mundo
// (¿en qué habitación estoy?, ¿qué me bloquea?) y restauro su estado
// según las banderas de progreso al cargar una partida.
import { Group, Texture, type Material } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import type { BibliotecaMateriales } from '../render/Materiales';
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { Interactuable } from '../interaccion/Interactuable';
import { InteractuablePuerta } from '../interaccion/objetos/InteractuablePuerta';
import type { PaquetePiso } from '../pisos/TiposPiso';
import { Documento } from '../interaccion/objetos/Documento';
import { Recogible } from '../interaccion/objetos/Recogible';
import { Examinable } from '../interaccion/objetos/Examinable';
import { PuntoMedicion } from '../interaccion/objetos/PuntoMedicion';
import { Tablero } from '../interaccion/objetos/Tablero';
import { Radio } from '../interaccion/objetos/Radio';
import { construirGeometria } from './ConstructorGeometria';
import { construirEscaleras, type OpcionesEscalera } from './ConstructorEscalera';
import { Rejilla, type ConsultaPuertaCerrada } from './Rejilla';
import { Puerta } from './Puerta';
import { Lampara } from './Lampara';
import { colgarPlaca, pintarRotulo } from './Letreros';
import { ponerRastro, VigiaRastros } from './Rastros';
import { TramoEscalera } from '../interaccion/objetos/TramoEscalera';
import { RejaEscalera } from './RejaEscalera';
import { PoolLuces } from './PoolLuces';
import { crearMueble, type Mueble } from './Muebles';
import type { CajaColision } from './Colisiones';
import type { DefHabitacion, DefMapa, EstadoLampara, PuntoAparicion } from './datos/TiposMapa';

export class Nivel {
  readonly grupo = new Group();
  readonly rejilla: Rejilla;
  readonly puertas: Puerta[] = [];
  readonly lamparas: Lampara[] = [];
  readonly muebles: Mueble[] = [];
  readonly interactuables: Interactuable[] = [];
  readonly puntosMedicion: PuntoMedicion[] = [];
  /** Las rejas de los tramos que bajan (con cadena y candado): se abren con la llave de su tramo. */
  readonly rejas: RejaEscalera[] = [];
  radio: Radio | null = null;
  /** Avisa la primera vez que el jugador ve cada rastro del piso (para la telemetría). */
  readonly vigiaRastros: VigiaRastros;

  /** La uso en toda consulta de visión y sonido: ¿hay una puerta cerrada en esta celda? */
  readonly consultaPuertaCerrada: ConsultaPuertaCerrada = (gx, gy) => {
    const puerta = this.puertaEn(gx, gy);
    return puerta ? !puerta.abierta : false;
  };

  /** Obstáculos entre dos puntos (para la oclusión del audio y la audición de la criatura). */
  readonly consultaOclusion = (ax: number, az: number, bx: number, bz: number): number =>
    this.rejilla.contarObstaculos(ax, az, bx, bz, this.consultaPuertaCerrada);

  private readonly puertaPorCelda = new Map<number, Puerta>();
  private readonly habitacionPorCelda: Array<DefHabitacion | null>;
  private readonly cajasEstaticas: CajaColision[];
  private readonly cajasTemporales: CajaColision[] = [];
  private readonly pool: PoolLuces;

  private readonly def: DefMapa;

  constructor(
    private readonly piso: PaquetePiso,
    materiales: BibliotecaMateriales,
    lucesMaximas: number,
  ) {
    const def = piso.mapa;
    this.def = def;
    this.grupo.name = 'nivel';
    this.rejilla = new Rejilla(def.rejilla);

    // Precalculo a qué habitación pertenece cada celda (consulta muy frecuente).
    this.habitacionPorCelda = new Array(this.rejilla.ancho * this.rejilla.alto).fill(null);
    for (const h of def.habitaciones) {
      for (let y = h.y0; y <= h.y1; y++) for (let x = h.x0; x <= h.x1; x++) this.habitacionPorCelda[y * this.rejilla.ancho + x] = h;
    }

    const { grupo, cajasEstaticas } = construirGeometria(this.rejilla, (gx, gy) => this.habitacionDeCelda(gx, gy), materiales);
    this.cajasEstaticas = cajasEstaticas;
    this.grupo.add(grupo);
    // Los huecos de escalera (celdas 'E'): el pozo, los tramos, la reja y los escombros (opcionales por piso).
    const escaleras = construirEscaleras(this.rejilla, materiales, piso.opcionesEscalera as OpcionesEscalera | undefined);
    this.grupo.add(escaleras);
    escaleras.traverse((o) => {
      if (o.name === 'reja') this.rejas.push(new RejaEscalera(o as Group));
    });

    for (const d of def.puertas) {
      const pasoEnZ = this.rejilla.esMuro(d.x - 1, d.y) && this.rejilla.esMuro(d.x + 1, d.y);
      const puerta = new Puerta(d, pasoEnZ, materiales.obtener('madera'));
      this.puertas.push(puerta);
      this.puertaPorCelda.set(this.clave(d.x, d.y), puerta);
      this.grupo.add(puerta.pivote);
      this.interactuables.push(new InteractuablePuerta(puerta));
    }

    // Los letreros: la placa de cada apartamento cuelga de la hoja de su puerta (se mueve con ella).
    for (const d of piso.placas ?? []) {
      const puerta = this.puertas.find((p) => p.id === d.puerta);
      if (!puerta) throw new Error(`La placa "${d.texto}" nombra la puerta "${d.puerta}", que no existe.`);
      colgarPlaca(d, puerta);
    }
    for (const d of piso.rotulos ?? []) this.grupo.add(pintarRotulo(d));
    // Los rastros de lo que pasó: sangre vieja, lápiz, rayas. Se descubren con la linterna.
    for (const d of piso.rastros ?? []) this.grupo.add(ponerRastro(d, materiales.detalle));
    this.vigiaRastros = new VigiaRastros(piso.rastros ?? [], this.rejilla, this.lamparas, this.consultaPuertaCerrada);

    for (const d of def.lamparas) {
      const lampara = new Lampara(d);
      this.lamparas.push(lampara);
      this.grupo.add(lampara.objeto);
    }

    for (const d of def.muebles) {
      const mueble = crearMueble(d, materiales);
      this.muebles.push(mueble);
      this.grupo.add(mueble.objeto);
    }

    for (const d of def.interactuables) {
      let objeto: Interactuable;
      switch (d.tipo) {
        case 'documento':
          objeto = new Documento(d, piso.documentos);
          break;
        case 'recogible':
          objeto = new Recogible(d, piso.objetos);
          break;
        case 'examinable':
          objeto = new Examinable(d, piso.examinables ?? {});
          break;
        case 'medicion': {
          const punto = new PuntoMedicion(d);
          this.puntosMedicion.push(punto);
          objeto = punto;
          break;
        }
        case 'tablero':
          objeto = new Tablero(d);
          break;
        case 'radio':
          this.radio = new Radio(d);
          objeto = this.radio;
          break;
      }
      this.interactuables.push(objeto);
      this.grupo.add(objeto.objeto);
    }

    // Los tramos de escalera: zonas que llevan a otro piso al pulsar E. Uno cerrado (pide algo) se queda con la
    // reja que tiene delante, si hay una a menos de 2 m: esa es la que se abre con su llave.
    for (const d of piso.escaleras ?? []) {
      const tramo = new TramoEscalera(d);
      if (d.requiere) {
        const p = tramo.objeto.position;
        const cerca = this.rejas
          .map((reja) => ({ reja, d: Math.hypot(reja.posicion().x - p.x, reja.posicion().z - p.z) }))
          .filter((r) => r.d < 2)
          .sort((a, b) => a.d - b.d)[0];
        if (cerca) tramo.enlazarReja(cerca.reja);
      }
      this.interactuables.push(tramo);
      this.grupo.add(tramo.objeto);
    }

    this.pool = new PoolLuces(this.grupo, lucesMaximas);
  }

  private clave(gx: number, gy: number): number {
    return gy * 1000 + gx;
  }

  habitacionDeCelda(gx: number, gy: number): DefHabitacion | null {
    if (gx < 0 || gy < 0 || gx >= this.rejilla.ancho || gy >= this.rejilla.alto) return null;
    return this.habitacionPorCelda[gy * this.rejilla.ancho + gx];
  }

  habitacionEn(x: number, z: number): DefHabitacion | null {
    return this.habitacionDeCelda(this.rejilla.aCelda(x), this.rejilla.aCelda(z));
  }

  habitacionPorId(id: string): DefHabitacion | undefined {
    return this.def.habitaciones.find((h) => h.id === id);
  }

  puertaEn(gx: number, gy: number): Puerta | undefined {
    return this.puertaPorCelda.get(this.clave(gx, gy));
  }

  mueblePorId(id: string): Mueble | undefined {
    return this.muebles.find((m) => m.id === id);
  }

  /** El punto de control con ese nombre; si no existe (una partida vieja), el de respaldo (el inicial del piso). */
  puntoControl(nombre: string, respaldo: string): PuntoAparicion {
    return this.def.puntosControl[nombre] ?? this.def.puntosControl[respaldo];
  }

  /** Reúno las cajas de colisión cercanas a un punto (muros, huecos de escalera, jambas, puertas cerradas, muebles). */
  cajasCercanas(x: number, z: number, radio = 1.2): readonly CajaColision[] {
    const C = CONFIG.celda;
    const salida = this.cajasTemporales;
    salida.length = 0;
    const gx = this.rejilla.aCelda(x);
    const gy = this.rejilla.aCelda(z);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const cx = gx + ox;
        const cy = gy + oy;
        // Un hueco de escalera bloquea igual que un muro: por ahí no se camina (se cae).
        if (!this.rejilla.esTransitable(cx, cy)) salida.push({ minX: cx * C, maxX: (cx + 1) * C, minZ: cy * C, maxZ: (cy + 1) * C });
        const puerta = this.puertaEn(cx, cy);
        const caja = puerta?.cajaColision();
        if (caja) salida.push(caja);
      }
    }
    const cerca = (c: CajaColision) => x > c.minX - radio && x < c.maxX + radio && z > c.minZ - radio && z < c.maxZ + radio;
    for (const c of this.cajasEstaticas) if (cerca(c)) salida.push(c);
    for (const m of this.muebles) if (m.caja && cerca(m.caja)) salida.push(m.caja);
    return salida;
  }

  /** Enciendo, apago o rompo todas las lámparas de un circuito. */
  fijarCircuito(circuito: string, estado: EstadoLampara): void {
    for (const l of this.lamparas) if (l.circuito === circuito) l.fijarEstado(estado);
  }

  /** Aplico los cambios de luz que el paquete del piso asocia a una bandera de progreso. */
  aplicarLuzDe(bandera: string): void {
    const cambio = this.piso.luzPorBandera[bandera];
    if (!cambio) return;
    for (const [circuito, estado] of Object.entries(cambio.circuitos ?? {})) this.fijarCircuito(circuito, estado);
    for (const [id, estado] of Object.entries(cambio.lamparas ?? {})) this.lampara(id)?.fijarEstado(estado);
  }

  lampara(id: string): Lampara | undefined {
    return this.lamparas.find((l) => l.id === id);
  }

  actualizar(dt: number, ctx: ContextoJuego | null, jugadorX: number, jugadorZ: number): void {
    for (const puerta of this.puertas) puerta.actualizar(dt);
    for (const lampara of this.lamparas) lampara.actualizar(dt);
    this.pool.actualizar(this.lamparas, jugadorX, jugadorZ);
    if (ctx) this.radio?.actualizar(dt, ctx);
    if (ctx) this.vigiaRastros.actualizar(dt, ctx);
    if (ctx) for (const reja of this.rejas) reja.actualizar(dt, ctx);
  }

  /** Se marcó una bandera en plena partida: aviso a los objetos que dependen de ella. */
  alBandera(nombre: string, ctx: ContextoJuego): void {
    for (const i of this.interactuables) i.alBandera?.(nombre, ctx);
  }

  /** Dejo el mundo como corresponde a las banderas de progreso actuales. */
  restablecer(ctx: ContextoJuego): void {
    const p = ctx.progreso;
    for (const puerta of this.puertas) {
      puerta.restablecer();
      if (p.tiene(`abierta:${puerta.id}`)) puerta.desbloquear();
    }
    for (const lampara of this.lamparas) lampara.restablecer();
    for (const mueble of this.muebles) mueble.restablecer();
    for (const i of this.interactuables) i.restablecer?.(ctx);

    for (const bandera of Object.keys(this.piso.luzPorBandera)) if (p.tiene(bandera)) this.aplicarLuzDe(bandera);
  }

  /**
   * Libero la memoria de la GPU que le pertenece a este nivel. Llamo esto al cambiar de piso.
   * Solo dispongo los recursos propios; los materiales de BibliotecaMateriales son compartidos.
   */
  destruir(materiales: BibliotecaMateriales): void {
    this.grupo.traverse((objeto) => {
      const mesh = objeto as { geometry?: { dispose(): void }; material?: Material | Material[] };
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          // Solo dispongo lo que NO pertenece a la biblioteca compartida.
          if (!materiales.esPropio(m)) {
            // Dispongo todas las ranuras de textura del material, no solo map.
            for (const valor of Object.values(m as unknown as Record<string, unknown>)) {
              if (valor instanceof Texture && !materiales.esPropio(valor)) valor.dispose();
            }
            m.dispose();
          }
        }
      }
    });
  }
}
