// Aquí guardo y cargo la partida (localmente, en el navegador).
// El formato lleva versión y pasa por las migraciones de Versionado.ts:
// cuando cambie la estructura, agrego un paso "vN → vN+1" en MIGRACIONES y
// las partidas viejas siguen cargando. Si encuentro una partida de una versión
// MÁS NUEVA del juego (se volvió a publicar una versión vieja), no la toco.
import type { DatosProgreso } from '../narrativa/Progreso';
import { borrar, escribirJSON } from '../utilidades/Almacenamiento';
import { leerVersionado } from './AlmacenVersionado';
import type { Migracion } from './Versionado';

export const VERSION_PARTIDA = 2;

export interface DatosPartida {
  version: typeof VERSION_PARTIDA;
  /** El id del piso (paquete) de esta partida: 'piso4'. */
  piso: string;
  puntoControl: string;
  progreso: DatosProgreso;
  bateria: number;
  tiempoJugado: number;
  fecha: number;
  estadisticas: { persecuciones: number; muertes: number; sustos: number };
}

/** Pasos para subir partidas viejas a la versión actual. */
const MIGRACIONES: readonly Migracion[] = [
  // v1 → v2: la partida dice de qué piso es. Toda partida v1 es del Piso 4 (el único que existía
  // hasta el Sprint 4): ese id aquí es un hecho histórico, no una regla del motor.
  { desde: 1, migrar: (v1) => ({ ...v1, piso: 'piso4' }) },
];

const CLAVE = 'partida';

function esPartida(d: Record<string, unknown>): d is Record<string, unknown> & DatosPartida {
  const e = d.estadisticas as Record<string, unknown> | undefined;
  return (
    d.version === VERSION_PARTIDA &&
    typeof d.piso === 'string' &&
    typeof d.puntoControl === 'string' &&
    typeof d.progreso === 'object' &&
    d.progreso !== null &&
    typeof d.bateria === 'number' &&
    typeof d.tiempoJugado === 'number' &&
    typeof e === 'object' &&
    e !== null &&
    typeof e.muertes === 'number'
  );
}

export class SistemaGuardado {
  /** Hay una partida de una versión más nueva: no la sobrescribo ni la borro. */
  private protegida = false;

  hayPartida(): boolean {
    return this.cargar() !== null;
  }

  cargar(): DatosPartida | null {
    const carga = leerVersionado<DatosPartida>(CLAVE, VERSION_PARTIDA, MIGRACIONES, esPartida);
    this.protegida = carga.estado === 'futuro';
    return carga.estado === 'ok' ? carga.datos : null;
  }

  guardar(datos: Omit<DatosPartida, 'version' | 'fecha'>): void {
    if (this.protegida) return;
    escribirJSON(CLAVE, { ...datos, version: VERSION_PARTIDA, fecha: Date.now() });
  }

  borrar(): void {
    if (this.protegida) return;
    borrar(CLAVE);
  }
}
