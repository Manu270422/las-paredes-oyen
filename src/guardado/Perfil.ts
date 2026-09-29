// Aquí está el PERFIL del jugador: lo que sobrevive a todas las partidas.
// Mejores marcas y totales de toda la vida del jugador en este dispositivo.
// No es una partida (esa se borra al terminar): es su historia con el edificio.
//
// Reglas que me impuse (las mismas del resto del juego):
// - Premia jugar BIEN, no jugar más: las marcas son "mejor tiempo" y
//   "menos veces que te oyó", nunca rachas ni contadores que castiguen.
// - Se entera de lo que pasa por el bus: no toca la lógica de nadie.
// - Versionado con migraciones, como la partida y los ajustes.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import { escribirJSON } from '../utilidades/Almacenamiento';
import { leerVersionado } from './AlmacenVersionado';
import type { Migracion } from './Versionado';

export const VERSION_PERFIL = 1;

export interface DatosPerfil {
  version: typeof VERSION_PERFIL;
  /** Fecha (ms) en que se creó el perfil. */
  creado: number;
  partidasIniciadas: number;
  /** Veces que llegó al final. */
  finales: number;
  /** Mejor tiempo de juego hasta el final (s), o null si nunca terminó. */
  mejorTiempo: number | null;
  /** Menos muertes en una partida terminada, o null si nunca terminó. */
  menosMuertes: number | null;
  muertesTotales: number;
  encuentrosSuperados: number;
}

/** Lo que el final le muestra al jugador. */
export interface MarcasFinal {
  mejorTiempo: number;
  nuevoMejorTiempo: boolean;
  finales: number;
}

const CLAVE = 'perfil';
const MIGRACIONES: readonly Migracion[] = [];

function esPerfil(d: Record<string, unknown>): d is Record<string, unknown> & DatosPerfil {
  const numero = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const marca = (v: unknown) => v === null || numero(v);
  return (
    d.version === VERSION_PERFIL &&
    numero(d.creado) &&
    numero(d.partidasIniciadas) &&
    numero(d.finales) &&
    marca(d.mejorTiempo) &&
    marca(d.menosMuertes) &&
    numero(d.muertesTotales) &&
    numero(d.encuentrosSuperados)
  );
}

function perfilNuevo(): DatosPerfil {
  return { version: VERSION_PERFIL, creado: Date.now(), partidasIniciadas: 0, finales: 0, mejorTiempo: null, menosMuertes: null, muertesTotales: 0, encuentrosSuperados: 0 };
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

  /** Llegó al final: actualizo las marcas y le digo al final qué mostrar. */
  registrarFinal(tiempo: number, muertes: number): MarcasFinal {
    const anterior = this.datos.mejorTiempo;
    const nuevoMejorTiempo = anterior === null || tiempo < anterior;
    this.cambiar({
      finales: this.datos.finales + 1,
      mejorTiempo: nuevoMejorTiempo ? tiempo : anterior,
      menosMuertes: this.datos.menosMuertes === null ? muertes : Math.min(this.datos.menosMuertes, muertes),
    });
    return { mejorTiempo: this.datos.mejorTiempo ?? tiempo, nuevoMejorTiempo, finales: this.datos.finales };
  }

  private cambiar(cambios: Partial<DatosPerfil>): void {
    this.datos = { ...this.datos, ...cambios };
    if (this.guardable) escribirJSON(CLAVE, this.datos);
  }
}
