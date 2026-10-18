// Aquí está el final de la partida. Dice sin ambigüedad lo que pasó ("Piso 3 completado"), las estadísticas
// de la partida en voz baja, una línea por piso si fueron varios, qué sigue y cómo volver a jugar. Sin
// fanfarria: el silencio es parte del final.
import { lineasDeAutoria } from '../../config/Creditos';
import { crearBoton } from '../componentes/Boton';
import type { PuenteTelemetria } from '../PuenteTelemetria';
import { reloj } from '../../utilidades/Reloj';
import { Pantalla } from './Pantalla';

export interface EstadisticasFin {
  /** El nombre del piso terminado ("Piso 4"), tal como lo dice su paquete. */
  piso: string;
  /** El nombre de la dificultad jugada ("Normal"). */
  dificultad: string;
  /** El piso que sigue en la historia y si ya se puede jugar; null si la historia no sigue. */
  siguiente: { nombre: string; disponible: boolean } | null;
  tiempo: number;
  /** Cosas del mundo que cambió el director: puertas, objetos, luces. */
  cambiosMundo: number;
  persecuciones: number;
  muertes: number;
  /**
   * Cada piso completado en esta partida, en orden: su nombre, lo que tardé en él, las veces que me cazó y me atrapó
   * ahí, y si batí el mejor tiempo de ese piso.
   */
  pisos: ReadonlyArray<{ nombre: string; tiempo: number; muertes: number; persecuciones: number; mejorTiempo: boolean }>;
}

/** Las veces que la criatura me atrapó, dicho como en el resto del final ("te oyó"). */
export function vecesQueTeOyo(muertes: number): string {
  return muertes === 0 ? 'no te oyó' : muertes === 1 ? 'te oyó 1 vez' : `te oyó ${muertes} veces`;
}

/** Las veces que la criatura me cazó (me haya atrapado o no). */
export function vecesQueTeCazo(persecuciones: number): string {
  return persecuciones === 0 ? 'no te cazó' : persecuciones === 1 ? 'te cazó 1 vez' : `te cazó ${persecuciones} veces`;
}

/**
 * La línea de un piso en el final: su tiempo, la marca solo si la batí (dicha en voz baja), y las veces que me cazó y
 * me atrapó ahí. El mejor tiempo es de cada piso: junto al total de la partida confundía (el creador, 2026-10-12).
 */
export function lineaDePiso(p: EstadisticasFin['pisos'][number]): string {
  const marca = p.mejorTiempo ? ' · nunca lo pasaste tan rápido' : '';
  return `${reloj(p.tiempo)}${marca} · ${vecesQueTeCazo(p.persecuciones)} · ${vecesQueTeOyo(p.muertes)}`;
}

export class PantallaFin extends Pantalla {
  private readonly titulo: HTMLHeadingElement;
  private readonly lista: HTMLUListElement;
  private readonly pisos: HTMLUListElement;
  private readonly siguiente: HTMLParagraphElement;
  /** Los créditos: solo al final del juego (cuando no hay piso siguiente). */
  private readonly creditos: HTMLDivElement;
  private readonly exportar: HTMLButtonElement;

  constructor(
    menu: () => void,
    jugarOtraVez: () => void,
    private readonly telemetria: PuenteTelemetria,
  ) {
    super('fin');
    this.titulo = document.createElement('h2');
    this.titulo.className = 'fin__titulo';
    const frase = document.createElement('p');
    frase.className = 'fin__texto';
    frase.textContent = 'Nadie dijo nada. Nunca. Y todo lo que se calló sigue ahí, escuchando.';
    this.lista = document.createElement('ul');
    this.lista.className = 'fin__estadisticas';
    this.pisos = document.createElement('ul');
    this.pisos.className = 'fin__pisos';
    this.siguiente = document.createElement('p');
    this.siguiente.className = 'subtitulo-juego fin__siguiente';
    this.creditos = document.createElement('div');
    this.creditos.className = 'fin__creditos';
    const acciones = document.createElement('div');
    acciones.className = 'fin__acciones';
    // Si esta partida fue una sesión de prueba, dejo exportarla aquí mismo.
    this.exportar = crearBoton('Exportar registro de la prueba', () => {
      this.exportar.textContent = this.telemetria.exportarUltima() ? 'Registro descargado' : 'No hay registro';
    }, { clase: 'boton--contorno' });
    acciones.append(
      crearBoton('Volver al menú', menu, { clase: 'boton--contorno boton--principal' }),
      crearBoton('Jugar otra vez', jugarOtraVez, { clase: 'boton--contorno' }),
      this.exportar,
    );
    this.elemento.append(this.titulo, frase, this.lista, this.pisos, this.siguiente, this.creditos, acciones);
    this.alVolver = menu;
  }

  fijarEstadisticas(e: EstadisticasFin): void {
    // Sin piso siguiente es el final del juego: salí del edificio.
    const finDelJuego = e.siguiente === null;
    this.titulo.textContent = finDelJuego ? 'Sobreviviste' : `${e.piso} completado`;
    this.exportar.hidden = !this.telemetria.activa();
    this.exportar.textContent = 'Exportar registro de la prueba';
    // Los totales de la partida. El mejor tiempo no va aquí: es de cada piso y va en su línea, solo si lo batí.
    const datos: Array<[string, string]> = [
      [reloj(e.tiempo), 'Tiempo'],
      [e.dificultad, 'Dificultad'],
      [String(e.cambiosMundo), 'Cosas que cambiaron'],
      [String(e.persecuciones), 'Veces que te cazó'],
      [String(e.muertes), 'Veces que te oyó'],
    ];
    this.lista.replaceChildren(
      ...datos.map(([valor, nombre]) => {
        const li = document.createElement('li');
        const fuerte = document.createElement('strong');
        fuerte.textContent = valor;
        li.append(fuerte, nombre);
        return li;
      }),
    );
    // Una línea por piso, si fueron varios. Con uno solo repetiría los datos de arriba, salvo que batiera su marca.
    this.pisos.hidden = e.pisos.length === 0 || (e.pisos.length === 1 && !e.pisos[0].mejorTiempo);
    this.pisos.replaceChildren(
      ...e.pisos.map((p) => {
        const li = document.createElement('li');
        const fuerte = document.createElement('strong');
        fuerte.textContent = p.nombre;
        li.append(fuerte, lineaDePiso(p));
        return li;
      }),
    );
    // Qué sigue, dicho con honestidad: si el próximo piso todavía no existe, se dice.
    const s = e.siguiente;
    this.siguiente.hidden = finDelJuego;
    this.siguiente.textContent = s === null ? '' : s.disponible ? `Sigue: ${s.nombre}` : `Próximamente: ${s.nombre}`;
    this.creditos.hidden = !finDelJuego;
    // El estudio primero (más visible) y, debajo, quién lo creó y dirigió. La ayuda de IA va en Créditos, en tecnología.
    this.creditos.replaceChildren(
      ...lineasDeAutoria().map((linea, i) => {
        const p = document.createElement('p');
        p.className = i === 0 ? 'fin__estudio' : '';
        p.textContent = linea;
        return p;
      }),
    );
  }
}
