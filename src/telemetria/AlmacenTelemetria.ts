// Aquí guardo las sesiones de prueba en el navegador y las exporto a un
// archivo .json que el probador me puede mandar. Nada viaja por internet.
// Limito cuántas sesiones guardo para no llenar el almacenamiento del celular.
import { borrar, escribirJSON, leerJSON } from '../utilidades/Almacenamiento';
import type { SesionTelemetria } from './TiposTelemetria';

const CLAVE = 'telemetria';
/** Sesiones que conservo como máximo (las más viejas se descartan). */
const MAXIMO_SESIONES = 12;

export class AlmacenTelemetria {
  cargar(): SesionTelemetria[] {
    const datos = leerJSON<SesionTelemetria[]>(CLAVE);
    return Array.isArray(datos) ? datos.filter((s) => s?.version === 1) : [];
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

  /** Descargo las sesiones como archivo .json (funciona en PC y en celulares). */
  exportar(sesiones: SesionTelemetria[] = this.cargar(), sufijo = 'todas'): boolean {
    if (sesiones.length === 0) return false;
    try {
      const contenido = JSON.stringify({ juego: 'Las Paredes Oyen', exportado: new Date().toISOString(), sesiones }, null, 1);
      const blob = new Blob([contenido], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      enlace.href = url;
      enlace.download = `las-paredes-oyen-prueba-${sufijo}-${fecha}.json`;
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
