// Aquí guardo las sesiones de prueba en el navegador y las exporto a un
// archivo .json que el probador me puede mandar. Nada viaja por internet.
// Limito cuántas sesiones guardo para no llenar el almacenamiento del celular.
import { compartirEnApp } from '../plataforma/CompartirArchivo';
import { borrar, escribirJSON, leerJSON } from '../utilidades/Almacenamiento';
import type { SesionTelemetria } from './TiposTelemetria';

/**
 * Subo una sesión vieja al formato actual. v1 → v2: el entorno dice la dificultad y la compilación; antes de la
 * Tarea 4 solo existía el juego de siempre (Normal) y no se anotaba la versión. Así ninguna sesión se pierde.
 */
function migrarSesion(s: unknown): SesionTelemetria | null {
  if (typeof s !== 'object' || s === null) return null;
  const sesion = s as { version?: unknown; entorno?: Record<string, unknown> };
  if (sesion.version === 2) return s as SesionTelemetria;
  if (sesion.version !== 1 || typeof sesion.entorno !== 'object' || sesion.entorno === null) return null;
  return { ...(sesion as object), version: 2, entorno: { dificultad: 'normal', compilacion: 'desconocida', ...sesion.entorno } } as SesionTelemetria;
}

const CLAVE = 'telemetria';
/** Sesiones que conservo como máximo (las más viejas se descartan). */
const MAXIMO_SESIONES = 12;

export class AlmacenTelemetria {
  cargar(): SesionTelemetria[] {
    const datos = leerJSON<unknown[]>(CLAVE);
    return Array.isArray(datos) ? datos.map(migrarSesion).filter((s): s is SesionTelemetria => s !== null) : [];
  }

  /** Guardo (o actualizo) una sesión. Devuelvo false si el navegador no me dejó guardar. */
  guardar(sesion: SesionTelemetria): boolean {
    const sesiones = this.cargar().filter((s) => s.id !== sesion.id);
    sesiones.push(sesion);
    while (sesiones.length > MAXIMO_SESIONES) sesiones.shift();
    return escribirJSON(CLAVE, sesiones);
  }

  contar(): number {
    return this.cargar().length;
  }

  borrarTodo(): void {
    borrar(CLAVE);
  }

  /** Descargo las sesiones como archivo .json (en PC y celulares); en la app de Android, se comparten. */
  exportar(sesiones: SesionTelemetria[] = this.cargar(), sufijo = 'todas'): boolean {
    if (sesiones.length === 0) return false;
    try {
      const contenido = JSON.stringify({ juego: 'Las Paredes Oyen', exportado: new Date().toISOString(), sesiones }, null, 1);
      const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const nombre = `las-paredes-oyen-prueba-${sufijo}-${fecha}.json`;
      if (compartirEnApp(nombre, contenido, 'Registro de la prueba')) return true;
      const blob = new Blob([contenido], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      // Libero la URL un poco después: algunos navegadores móviles tardan en empezar la descarga.
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch {
      return false;
    }
  }
}
