// Aquí manejo los ajustes del jugador (brillo, volumen, sensibilidad...).
// Se guardan en el navegador y cualquier sistema puede suscribirse para
// reaccionar en vivo cuando algo cambia en el menú.
import type { NivelCalidad } from './PerfilesCalidad';
import { leerJSON, escribirJSON } from '../utilidades/Almacenamiento';

export interface AjustesJugador {
  calidad: 'auto' | NivelCalidad;
  sensibilidad: number;
  invertirY: boolean;
  campoVision: number;
  brillo: number;
  volumenMaestro: number;
  volumenEfectos: number;
  volumenAmbiente: number;
  subtitulos: boolean;
  subtitulosEfectos: boolean;
  vibracion: boolean;
  tamanoControles: number;
  mostrarFps: boolean;
  reducirDestellos: boolean;
  movimientoCabeza: boolean;
  /** Registrar sesiones de prueba en este dispositivo (playtesting). Apagado por defecto. */
  telemetria: boolean;
}

export const AJUSTES_POR_DEFECTO: AjustesJugador = {
  calidad: 'auto',
  sensibilidad: 1,
  invertirY: false,
  campoVision: 72,
  brillo: 1,
  volumenMaestro: 0.9,
  volumenEfectos: 1,
  volumenAmbiente: 0.8,
  subtitulos: true,
  subtitulosEfectos: true,
  vibracion: true,
  tamanoControles: 1,
  mostrarFps: false,
  reducirDestellos: false,
  movimientoCabeza: true,
  telemetria: false,
};

type Oyente = (ajustes: Readonly<AjustesJugador>, clave: keyof AjustesJugador | null) => void;

export class GestorAjustes {
  private datos: AjustesJugador;
  private readonly oyentes = new Set<Oyente>();

  constructor() {
    // Mezclo lo guardado con los valores por defecto, por si agrego ajustes nuevos en el futuro.
    const guardados = leerJSON<Partial<AjustesJugador>>('ajustes');
    this.datos = { ...AJUSTES_POR_DEFECTO, ...(guardados ?? {}) };
  }

  get valores(): Readonly<AjustesJugador> {
    return this.datos;
  }

  cambiar<K extends keyof AjustesJugador>(clave: K, valor: AjustesJugador[K]): void {
    if (this.datos[clave] === valor) return;
    this.datos = { ...this.datos, [clave]: valor };
    escribirJSON('ajustes', this.datos);
    for (const oyente of this.oyentes) oyente(this.datos, clave);
  }

  restablecer(): void {
    this.datos = { ...AJUSTES_POR_DEFECTO };
    escribirJSON('ajustes', this.datos);
    for (const oyente of this.oyentes) oyente(this.datos, null);
  }

  /** Me suscribo a los cambios. Devuelvo la función para desuscribirme. */
  suscribir(oyente: Oyente): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }
}
