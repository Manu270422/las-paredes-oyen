// Aquí manejo los ajustes del jugador (brillo, volumen, sensibilidad...).
// Se guardan en el navegador y cualquier sistema puede suscribirse para
// reaccionar en vivo cuando algo cambia en el menú.
import type { NivelCalidad } from './PerfilesCalidad';
import { DIFICULTAD_POR_DEFECTO, esDificultad, type IdDificultad } from './Dificultad';
import { escribirJSON } from '../utilidades/Almacenamiento';
import { leerVersionado } from '../guardado/AlmacenVersionado';
import type { Migracion } from '../guardado/Versionado';

const CLAVE = 'ajustes';
const VERSION_AJUSTES = 1;

interface AjustesGuardados {
  version: typeof VERSION_AJUSTES;
  valores: Record<string, unknown>;
}

/** v0 (hasta el Sprint 2) guardaba los valores sueltos, sin versión: los envuelvo. */
const MIGRACIONES: readonly Migracion[] = [{ desde: 0, migrar: (viejo) => ({ valores: viejo }) }];

function sonAjustes(d: Record<string, unknown>): d is Record<string, unknown> & AjustesGuardados {
  return d.version === VERSION_AJUSTES && typeof d.valores === 'object' && d.valores !== null;
}

/** Solo acepto claves que existen y con el tipo correcto: un valor raro no rompe el juego. */
function sanear(valores: Record<string, unknown>): Partial<AjustesJugador> {
  const limpio: Record<string, unknown> = {};
  for (const [clave, porDefecto] of Object.entries(AJUSTES_POR_DEFECTO)) {
    if (typeof valores[clave] === typeof porDefecto) limpio[clave] = valores[clave];
  }
  // La dificultad es un texto, pero no cualquiera: una que no existe vuelve a la de por defecto.
  if (!esDificultad(limpio.dificultad)) delete limpio.dificultad;
  return limpio as Partial<AjustesJugador>;
}

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
  /** La dificultad que viene marcada al empezar una partida nueva: la última que eligió el jugador. */
  dificultad: IdDificultad;
  /** Mostrar el indicador del aire aunque la dificultad lo oculte (accesibilidad). */
  indicadorAireSiempre: boolean;
  /** Al morir y en el final: sin su cara ni el grito fuerte, un fundido (accesibilidad). */
  sinSustosFuertes: boolean;
  /** Con poco aire: el borde de la pantalla late y un subtítulo avisa antes del jadeo (accesibilidad). */
  ayudaVisualAire: boolean;
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
  dificultad: DIFICULTAD_POR_DEFECTO,
  indicadorAireSiempre: false,
  sinSustosFuertes: false,
  ayudaVisualAire: false,
};

type Oyente = (ajustes: Readonly<AjustesJugador>, clave: keyof AjustesJugador | null) => void;

export class GestorAjustes {
  private datos: AjustesJugador;
  private readonly oyentes = new Set<Oyente>();
  /** Ajustes de una versión más nueva del juego: juego con los valores por defecto, pero no los piso. */
  private readonly guardable: boolean;

  constructor() {
    // Mezclo lo guardado con los valores por defecto, por si agrego ajustes nuevos en el futuro.
    const carga = leerVersionado<AjustesGuardados>(CLAVE, VERSION_AJUSTES, MIGRACIONES, sonAjustes);
    this.datos = { ...AJUSTES_POR_DEFECTO, ...(carga.estado === 'ok' ? sanear(carga.datos.valores) : {}) };
    this.guardable = carga.estado !== 'futuro';
  }

  get valores(): Readonly<AjustesJugador> {
    return this.datos;
  }

  cambiar<K extends keyof AjustesJugador>(clave: K, valor: AjustesJugador[K]): void {
    if (this.datos[clave] === valor) return;
    this.datos = { ...this.datos, [clave]: valor };
    this.guardar();
    for (const oyente of this.oyentes) oyente(this.datos, clave);
  }

  restablecer(): void {
    this.datos = { ...AJUSTES_POR_DEFECTO };
    this.guardar();
    for (const oyente of this.oyentes) oyente(this.datos, null);
  }

  /** Me suscribo a los cambios. Devuelvo la función para desuscribirme. */
  suscribir(oyente: Oyente): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  private guardar(): void {
    if (this.guardable) escribirJSON(CLAVE, { version: VERSION_AJUSTES, valores: this.datos });
  }
}
