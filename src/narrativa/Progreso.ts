// Aquí guardo el progreso de la partida: banderas (cosas que pasaron),
// inventario y documentos leídos. Todo lo demás (puertas, luces, objetivos)
// se deriva de estas banderas, así cargar una partida es trivial y robusto.
//
// Con varios pisos, las banderas y los documentos son DEL PISO: al bajar guardo los del piso que dejo y
// tomo los del piso al que llego (vacíos la primera vez). Si vuelvo a subir, todo sigue como lo dejé. El
// inventario no: lo que llevo en el bolsillo baja y sube conmigo.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { Objetivo } from './TiposNarrativa';
import type { PaquetePiso, ReglasPiso } from '../pisos/TiposPiso';

export interface DatosProgreso {
  banderas: string[];
  inventario: string[];
  documentos: string[];
}

/** Lo que queda guardado de un piso que no estoy jugando: lo que pasó en él y lo que leí ahí. */
export interface DatosPisoVisitado {
  banderas: string[];
  documentos: string[];
}

/** Lo que necesito de un piso para seguir su historia: cuál es, sus objetivos y sus reglas. */
export type PisoDeProgreso = Pick<PaquetePiso, 'id' | 'objetivos' | 'reglas'>;

/**
 * Segundos de juego con el mismo objetivo antes de recordarlo solo. En la ronda 1, el de Difícil (sin pistas) vio
 * el objetivo 6.5 s, se le olvidó y se perdió 3 min: el aviso se repite en todas las dificultades, en voz baja.
 */
export const RECORDAR_OBJETIVO_CADA = 90;

export class Progreso {
  private banderas = new Set<string>();
  /** Segundos de juego desde la última vez que se mostró el objetivo. */
  private sinRecordar = 0;
  private inventario: string[] = [];
  private documentos: string[] = [];
  private objetivoAnterior: string | null = null;
  /** Las banderas y documentos de los pisos que no estoy jugando, por id de piso. */
  private otros = new Map<string, DatosPisoVisitado>();

  constructor(
    private readonly bus: BusEventos<MapaEventos>,
    /** Los objetivos del piso que se juega, en orden (cambian al cambiar de piso). */
    private objetivos: readonly Objetivo[],
    /** Las banderas de la historia a las que reacciona el motor (despertar a la criatura, imitación completa). */
    private reglas: ReglasPiso,
  ) {}

  /** ¿Ya despertó la criatura? Desde ahí sale de las paredes y se puede dejar el señuelo. */
  get criaturaDespierta(): boolean {
    return this.banderas.has(this.reglas.despiertaCon);
  }

  /** ¿Ya sé cómo me imita? Desde ahí su imitación llega a la etapa 3. */
  get imitacionCompleta(): boolean {
    return this.banderas.has(this.reglas.imitacionCompletaCon);
  }

  tiene(bandera: string): boolean {
    return this.banderas.has(bandera);
  }

  /** Marco una bandera. Si es nueva, aviso a todos y reviso el objetivo. */
  marcar(bandera: string): void {
    if (this.banderas.has(bandera)) return;
    this.banderas.add(bandera);
    this.bus.emit('bandera', { nombre: bandera });
    this.revisarObjetivo();
  }

  /** Marco una bandera sin avisar al bus ni revisar objetivos: solo para banderas de arranque del piso. */
  marcarSilencioso(bandera: string): void {
    this.banderas.add(bandera);
  }

  tieneObjeto(id: string): boolean {
    return this.inventario.includes(id);
  }

  agregarObjeto(id: string): void {
    if (!this.inventario.includes(id)) this.inventario.push(id);
    this.marcar(`objeto:${id}`);
  }

  registrarDocumento(id: string): void {
    if (!this.documentos.includes(id)) this.documentos.push(id);
    this.marcar(`leyo:${id}`);
  }

  get documentosLeidos(): readonly string[] {
    return this.documentos;
  }

  objetivoActual(): Objetivo | null {
    return this.objetivos.find((o) => !this.banderas.has(o.bandera)) ?? null;
  }

  private revisarObjetivo(): void {
    const actual = this.objetivoActual();
    const id = actual?.id ?? null;
    if (id === this.objetivoAnterior) return;
    this.objetivoAnterior = id;
    this.sinRecordar = 0;
    if (actual) this.bus.emit('objetivo', { texto: actual.texto, nuevo: true });
  }

  /** Cada fotograma de juego: si el objetivo lleva mucho sin mostrarse, lo recuerdo. */
  actualizar(dt: number): void {
    this.sinRecordar += dt;
    if (this.sinRecordar >= RECORDAR_OBJETIVO_CADA) this.anunciarObjetivo();
  }

  exportar(): DatosProgreso {
    return { banderas: [...this.banderas], inventario: [...this.inventario], documentos: [...this.documentos] };
  }

  /** Lo de los otros pisos que visité, para la partida guardada (copias: nadie me lo cambia desde fuera). */
  exportarOtros(): Record<string, DatosPisoVisitado> {
    const salida: Record<string, DatosPisoVisitado> = {};
    for (const [id, d] of this.otros) salida[id] = { banderas: [...d.banderas], documentos: [...d.documentos] };
    return salida;
  }

  /** Retomo una partida: lo del piso que se juega y, si los hay, lo de los otros pisos que visité. */
  importar(datos: DatosProgreso | null, otros: Readonly<Record<string, DatosPisoVisitado>> = {}): void {
    this.banderas = new Set(datos?.banderas ?? []);
    this.inventario = [...(datos?.inventario ?? [])];
    this.documentos = [...(datos?.documentos ?? [])];
    this.otros = new Map(Object.entries(otros).map(([id, d]) => [id, { banderas: [...d.banderas], documentos: [...d.documentos] }]));
    this.objetivoAnterior = this.objetivoActual()?.id ?? null;
  }

  /** Juego en otro piso sin cambiar las banderas (al cargar una partida de ese piso, antes de importarla). */
  usarPiso(piso: PisoDeProgreso): void {
    this.objetivos = piso.objetivos;
    this.reglas = piso.reglas;
    this.objetivoAnterior = this.objetivoActual()?.id ?? null;
  }

  /**
   * Cambio de piso: guardo lo del piso que dejo (`desde`) y retomo lo del piso al que llego, vacío si es la
   * primera vez. No aviso nada por el bus: el piso nuevo no "marca" banderas, solo las recuerda.
   */
  cambiarPiso(desde: string, hacia: PisoDeProgreso): void {
    this.otros.set(desde, { banderas: [...this.banderas], documentos: [...this.documentos] });
    const recordado = this.otros.get(hacia.id);
    this.otros.delete(hacia.id);
    this.banderas = new Set(recordado?.banderas ?? []);
    this.documentos = [...(recordado?.documentos ?? [])];
    this.usarPiso(hacia);
  }

  /** Vuelvo a anunciar el objetivo actual (al empezar o cargar). */
  anunciarObjetivo(): void {
    this.sinRecordar = 0;
    const actual = this.objetivoActual();
    if (actual) this.bus.emit('objetivo', { texto: actual.texto, nuevo: false });
  }
}
