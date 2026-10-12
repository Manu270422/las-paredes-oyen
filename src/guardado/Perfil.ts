// Aquí está el PERFIL del jugador: lo que sobrevive a todas las partidas.
// Mejores marcas y totales de toda la vida del jugador en este dispositivo.
// No es una partida (esa se borra al terminar): es su historia con el edificio.
//
// Reglas que me impuse (las mismas del resto del juego):
// - Premia jugar BIEN, no jugar más: las marcas son "mejor tiempo" y
//   "menos veces que te oyó", nunca rachas ni contadores que castiguen. El mejor tiempo es de cada piso.
// - Se entera de lo que pasa por el bus: no toca la lógica de nadie.
// - Versionado con migraciones, como la partida y los ajustes.
import { esDificultad, masDificil, type IdDificultad } from '../config/Dificultad';
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import { escribirJSON } from '../utilidades/Almacenamiento';
import { leerVersionado } from './AlmacenVersionado';
import type { Migracion } from './Versionado';

export const VERSION_PERFIL = 3;

export interface DatosPerfil {
  version: typeof VERSION_PERFIL;
  /** Fecha (ms) en que se creó el perfil. */
  creado: number;
  partidasIniciadas: number;
  /** Veces que llegó al final. */
  finales: number;
  /**
   * Tiempo de juego total de la partida al terminar un piso, el menor (s), o null si nunca terminó uno. Es la marca
   * vieja: con varios pisos mezclaba el tiempo de uno con el total de otro. El final ya no la muestra (2026-10-12):
   * muestra el mejor tiempo de cada piso (`mejoresTiempos`).
   */
  mejorTiempo: number | null;
  /** Menos muertes en una partida terminada, o null si nunca terminó. */
  menosMuertes: number | null;
  muertesTotales: number;
  encuentrosSuperados: number;
  /** Cada piso terminado (por id), con la dificultad más alta en que se terminó. */
  pisosCompletados: Readonly<Record<string, IdDificultad>>;
  /** El mejor tiempo de cada piso (por id): solo lo que tardé EN ese piso, en segundos. */
  mejoresTiempos: Readonly<Record<string, number>>;
}

/** Lo que el final dice de un piso recién terminado: si su tiempo batió el mejor que había para ese piso. */
export interface MarcaPiso {
  /** El mejor tiempo que había para ese piso, o null si es la primera vez que lo termino (no había nada que batir). */
  mejorAnterior: number | null;
  /** Lo hice más rápido que nunca (solo si había una marca anterior). */
  batido: boolean;
}

const CLAVE = 'perfil';
const MIGRACIONES: readonly Migracion[] = [
  // v1 → v2: qué pisos se completaron y en qué dificultad. Un perfil v1 que llegó al final lo hizo en el
  // Piso 4 y en el juego de siempre (Normal): los únicos que existían. Es un hecho histórico, no una regla.
  { desde: 1, migrar: (v1) => ({ ...v1, pisosCompletados: typeof v1.finales === 'number' && v1.finales > 0 ? { piso4: 'normal' } : {} }) },
  // v2 → v3: el mejor tiempo de cada piso. De un perfil v2 no se sabe de qué piso era su mejor tiempo (mezclaba el
  // tiempo del Piso 4 con el total de la partida): cada piso empieza sin marca.
  { desde: 2, migrar: (v2) => ({ ...v2, mejoresTiempos: {} }) },
];

function esPerfil(d: Record<string, unknown>): d is Record<string, unknown> & DatosPerfil {
  const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const marca = (v: unknown) => v === null || numero(v);
  const completados = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(esDificultad);
  const tiempos = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(numero);
  return (
    d.version === VERSION_PERFIL &&
    numero(d.creado) &&
    numero(d.partidasIniciadas) &&
    numero(d.finales) &&
    marca(d.mejorTiempo) &&
    marca(d.menosMuertes) &&
    numero(d.muertesTotales) &&
    numero(d.encuentrosSuperados) &&
    completados(d.pisosCompletados) &&
    tiempos(d.mejoresTiempos)
  );
}

function perfilNuevo(): DatosPerfil {
  return { version: VERSION_PERFIL, creado: Date.now(), partidasIniciadas: 0, finales: 0, mejorTiempo: null, menosMuertes: null, muertesTotales: 0, encuentrosSuperados: 0, pisosCompletados: {}, mejoresTiempos: {} };
}

export class Perfil {
  private datos: DatosPerfil;
  /** Perfil de una versión más nueva del juego: lo leo, pero no lo piso. */
  private readonly guardable: boolean;

  constructor() {
    const carga = leerVersionado<DatosPerfil>(CLAVE, VERSION_PERFIL, MIGRACIONES, esPerfil);
    this.datos = carga.estado === 'ok' ? { ...carga.datos } : perfilNuevo();
    this.guardable = carga.estado !== 'futuro';
  }

  /** Me engancho al bus una sola vez al construir el juego. */
  conectar(bus: BusEventos<MapaEventos>): void {
    bus.on('jugador-atrapado', () => this.cambiar({ muertesTotales: this.datos.muertesTotales + 1 }));
    bus.on('encuentro', (e) => {
      if (e.estado === 'superado') this.cambiar({ encuentrosSuperados: this.datos.encuentrosSuperados + 1 });
    });
  }

  registrarInicio(): void {
    this.cambiar({ partidasIniciadas: this.datos.partidasIniciadas + 1 });
  }

  /**
   * Terminé un piso: actualizo las marcas (la dificultad más alta de ese piso y su mejor tiempo) y le digo al final
   * si batí el mejor tiempo de ese piso. `tiempoTotal` y `muertes` son de toda la partida; `tiempoPiso`, solo de
   * este piso.
   */
  registrarFinal(piso: string, dificultad: IdDificultad, tiempoTotal: number, muertes: number, tiempoPiso: number): MarcaPiso {
    const previa = this.datos.pisosCompletados[piso];
    const mejorAnterior = this.datos.mejoresTiempos[piso] ?? null;
    const batido = mejorAnterior !== null && tiempoPiso < mejorAnterior;
    this.cambiar({
      pisosCompletados: { ...this.datos.pisosCompletados, [piso]: previa ? masDificil(previa, dificultad) : dificultad },
      mejoresTiempos: { ...this.datos.mejoresTiempos, [piso]: mejorAnterior === null ? tiempoPiso : Math.min(mejorAnterior, tiempoPiso) },
      finales: this.datos.finales + 1,
      mejorTiempo: this.datos.mejorTiempo === null ? tiempoTotal : Math.min(this.datos.mejorTiempo, tiempoTotal),
      menosMuertes: this.datos.menosMuertes === null ? muertes : Math.min(this.datos.menosMuertes, muertes),
    });
    return { mejorAnterior, batido };
  }

  /** El mejor tiempo de un piso (solo lo que tardé en él), o null si nunca lo terminé. */
  mejorTiempoDe(piso: string): number | null {
    return this.datos.mejoresTiempos[piso] ?? null;
  }

  /** ¿Terminó algún piso, en cualquier dificultad? Eso desbloquea Pesadilla. */
  get algunoCompletado(): boolean {
    return Object.keys(this.datos.pisosCompletados).length > 0;
  }

  /** La dificultad más alta en que se terminó ese piso, o null si nunca se terminó. */
  completado(piso: string): IdDificultad | null {
    return this.datos.pisosCompletados[piso] ?? null;
  }

  private cambiar(cambios: Partial<DatosPerfil>): void {
    this.datos = { ...this.datos, ...cambios };
    if (this.guardable) escribirJSON(CLAVE, this.datos);
  }
}
