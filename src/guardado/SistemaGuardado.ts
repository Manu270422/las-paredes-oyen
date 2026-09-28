// Aquí guardo y cargo la partida (localmente, en el navegador).
// El formato lleva versión: si en el futuro cambio la estructura, puedo
// migrar partidas viejas en vez de romperlas. Este mismo formato podrá
// sincronizarse con la nube más adelante sin cambiar nada del juego.
import type { DatosProgreso } from '../narrativa/Progreso';
import { borrar, escribirJSON, leerJSON } from '../utilidades/Almacenamiento';

export interface DatosPartida {
  version: 1;
  puntoControl: string;
  progreso: DatosProgreso;
  bateria: number;
  tiempoJugado: number;
  fecha: number;
  estadisticas: { persecuciones: number; muertes: number; sustos: number };
}

const CLAVE = 'partida';

export class SistemaGuardado {
  hayPartida(): boolean {
    return this.cargar() !== null;
  }

  cargar(): DatosPartida | null {
    const datos = leerJSON<DatosPartida>(CLAVE);
    if (!datos || datos.version !== 1) return null;
    return datos;
  }

  guardar(datos: Omit<DatosPartida, 'version' | 'fecha'>): void {
    escribirJSON(CLAVE, { ...datos, version: 1, fecha: Date.now() });
  }

  borrar(): void {
    borrar(CLAVE);
  }
}
