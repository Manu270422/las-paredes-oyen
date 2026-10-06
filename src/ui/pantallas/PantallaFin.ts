// Aquí está el cierre de un piso. Dice sin ambigüedad lo que pasó ("Piso 4 completado"), las estadísticas
// de la partida en voz baja, qué sigue y cómo volver a jugar. Sin fanfarria: el silencio es parte del final.
import { crearBoton } from '../componentes/Boton';
import type { PuenteTelemetria } from '../PuenteTelemetria';
import type { MarcasFinal } from '../../guardado/Perfil';
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
  /** Las mejores marcas del perfil (sobreviven a todas las partidas). */
  marcas: MarcasFinal;
}

const reloj = (segundos: number) => `${Math.floor(segundos / 60)}:${Math.floor(segundos % 60).toString().padStart(2, '0')}`;

export class PantallaFin extends Pantalla {
  private readonly titulo: HTMLHeadingElement;
  private readonly lista: HTMLUListElement;
  private readonly siguiente: HTMLParagraphElement;
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
    this.siguiente = document.createElement('p');
    this.siguiente.className = 'subtitulo-juego fin__siguiente';
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
    this.elemento.append(this.titulo, frase, this.lista, this.siguiente, acciones);
    this.alVolver = menu;
  }

  fijarEstadisticas(e: EstadisticasFin): void {
    this.titulo.textContent = `${e.piso} completado`;
    this.exportar.hidden = !this.telemetria.activa();
    this.exportar.textContent = 'Exportar registro de la prueba';
    const m = e.marcas;
    // Sin fanfarria: la marca es un dato más, dicho en voz baja.
    const mejor: [string, string] =
      m.finales <= 1 ? [reloj(m.mejorTiempo), 'Tu primera vez hasta el final'] : m.nuevoMejorTiempo ? [reloj(m.mejorTiempo), 'Tu mejor tiempo. Nunca saliste tan rápido'] : [reloj(m.mejorTiempo), 'Tu mejor tiempo'];
    const datos: Array<[string, string]> = [
      [reloj(e.tiempo), 'Tiempo'],
      [e.dificultad, 'Dificultad'],
      [String(e.cambiosMundo), 'Cosas que cambiaron'],
      [String(e.persecuciones), 'Veces que te cazó'],
      [String(e.muertes), 'Veces que te oyó'],
      mejor,
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
    // Qué sigue, dicho con honestidad: si el próximo piso todavía no existe, se dice.
    const s = e.siguiente;
    this.siguiente.textContent = s === null ? 'Por ahora, la historia termina aquí' : s.disponible ? `Sigue: ${s.nombre}` : `Próximamente: ${s.nombre}`;
  }
}
