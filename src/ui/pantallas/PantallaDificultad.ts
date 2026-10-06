// Aquí se elige cómo jugar al empezar una partida nueva ("Nueva partida" en el menú o "Jugar otra vez" en el
// final). Una línea clara por dificultad, y la que está bloqueada dice por qué. Se elige y luego se pulsa
// "Empezar": así se alcanza a leer la línea, y con mando o teclado no se arranca por error.
import { DIFICULTADES, NOMBRE_DIFICULTAD, TABLA_DIFICULTAD, type IdDificultad } from '../../config/Dificultad';
import { crearBoton } from '../componentes/Boton';
import { sonarUI } from '../componentes/SonidoUI';
import { Pantalla } from './Pantalla';

export interface AccionesDificultad {
  /** La que viene marcada: la última que eligió el jugador. */
  preferida(): IdDificultad;
  pesadillaDesbloqueada(): boolean;
  /** El nombre del piso que desbloquea Pesadilla al terminarlo (del paquete). */
  nombrePiso(): string;
  empezar(id: IdDificultad): void;
  volver(): void;
}

/** Qué cambia en cada una, en palabras de jugador. */
const LINEA: Readonly<Record<IdDificultad, string>> = {
  historia: 'Ella tarda más en lanzarse y la linterna dura más. Para vivir la historia.',
  normal: 'El juego como fue pensado. Recomendada para la primera vez.',
  dificil: 'Te oye mejor y caza más rápido. Solo guarda al medir un apartamento. Sin pistas ni indicador del aire.',
  pesadilla: 'Sin puntos de control: si mueres o sales, empiezas de cero. No guarda.',
};

/** La que no guarda se gana: hay que terminar un piso antes. */
const seGana = (id: IdDificultad) => TABLA_DIFICULTAD[id].puntosControl === 'ninguno';

export class PantallaDificultad extends Pantalla {
  private readonly opciones: HTMLDivElement;
  private elegida: IdDificultad = 'normal';

  constructor(private readonly acciones: AccionesDificultad) {
    super('dificultad');
    const titulo = document.createElement('h2');
    titulo.className = 'dificultad__titulo';
    titulo.textContent = '¿Cómo quieres jugar?';
    const nota = document.createElement('p');
    nota.className = 'dificultad__nota';
    nota.textContent = 'Puedes cambiarla cuando quieras en Ajustes, y bajarla no te quita nada de lo que llevas en la partida.';
    this.opciones = document.createElement('div');
    this.opciones.className = 'dificultad__opciones';
    this.opciones.setAttribute('role', 'radiogroup');
    this.opciones.setAttribute('aria-label', 'Dificultad');
    // La accesibilidad no depende de la dificultad: lo digo aquí, donde se decide.
    const accesibilidad = document.createElement('p');
    accesibilidad.className = 'dificultad__accesibilidad';
    accesibilidad.textContent = 'La accesibilidad no depende de la dificultad: subtítulos, menos destellos e indicador del aire siempre visible, en Ajustes → Accesibilidad.';
    const botones = document.createElement('div');
    botones.className = 'dificultad__acciones';
    botones.append(
      crearBoton('Empezar', () => this.acciones.empezar(this.elegida), { clase: 'boton--contorno boton--principal' }),
      crearBoton('Volver', () => this.acciones.volver(), { clase: 'boton--contorno' }),
    );
    this.elemento.append(titulo, nota, this.opciones, accesibilidad, botones);
    this.alVolver = () => this.acciones.volver();
  }

  protected alMostrar(): void {
    const desbloqueada = this.acciones.pesadillaDesbloqueada();
    const preferida = this.acciones.preferida();
    this.elegida = seGana(preferida) && !desbloqueada ? 'normal' : preferida;
    this.opciones.replaceChildren(
      ...DIFICULTADES.map((id) => {
        const bloqueada = seGana(id) && !desbloqueada;
        const opcion = document.createElement('button');
        opcion.type = 'button';
        opcion.className = 'dificultad__opcion';
        opcion.dataset.navegable = '';
        opcion.dataset.valor = id;
        opcion.setAttribute('role', 'radio');
        opcion.setAttribute('aria-checked', String(id === this.elegida));
        opcion.disabled = bloqueada;
        const nombre = document.createElement('span');
        nombre.className = 'dificultad__nombre';
        nombre.textContent = NOMBRE_DIFICULTAD[id];
        const linea = document.createElement('span');
        linea.className = 'dificultad__linea';
        linea.textContent = bloqueada ? `Bloqueada: se desbloquea al terminar el ${this.acciones.nombrePiso()}, en cualquier dificultad.` : LINEA[id];
        opcion.append(nombre, linea);
        opcion.addEventListener('click', () => {
          this.elegida = id;
          for (const otra of this.opciones.querySelectorAll('[role="radio"]')) otra.setAttribute('aria-checked', String(otra === opcion));
          sonarUI('pulsar');
        });
        return opcion;
      }),
    );
  }

  /** Con mando o teclado, el foco empieza en la que viene marcada. */
  enfocarPrimero(): void {
    if (document.documentElement.dataset.modoEntrada === 'tactil') return;
    this.opciones.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
  }
}
