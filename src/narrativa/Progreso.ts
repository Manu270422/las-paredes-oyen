// Aquí guardo el progreso de la partida: banderas (cosas que pasaron),
// inventario y documentos leídos. Todo lo demás (puertas, luces, objetivos)
// se deriva de estas banderas, así cargar una partida es trivial y robusto.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { Objetivo } from './Objetivos';
import type { ReglasPiso } from '../pisos/TiposPiso';

export interface DatosProgreso {
  banderas: string[];
  inventario: string[];
  documentos: string[];
}

export class Progreso {
  private banderas = new Set<string>();
  private inventario: string[] = [];
  private documentos: string[] = [];
  private objetivoAnterior: string | null = null;

  constructor(
    private readonly bus: BusEventos<MapaEventos>,
    /** Los objetivos del piso que se juega, en orden. */
    private readonly objetivos: readonly Objetivo[],
    /** Las banderas de la historia a las que reacciona el motor (despertar a la criatura, imitación completa). */
    private readonly reglas: ReglasPiso,
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
    if (actual) this.bus.emit('objetivo', { texto: actual.texto, nuevo: true });
  }

  exportar(): DatosProgreso {
    return { banderas: [...this.banderas], inventario: [...this.inventario], documentos: [...this.documentos] };
  }

  importar(datos: DatosProgreso | null): void {
    this.banderas = new Set(datos?.banderas ?? []);
    this.inventario = [...(datos?.inventario ?? [])];
    this.documentos = [...(datos?.documentos ?? [])];
    this.objetivoAnterior = this.objetivoActual()?.id ?? null;
  }

  /** Vuelvo a anunciar el objetivo actual (al empezar o cargar). */
  anunciarObjetivo(): void {
    const actual = this.objetivoActual();
    if (actual) this.bus.emit('objetivo', { texto: actual.texto, nuevo: false });
  }
}
