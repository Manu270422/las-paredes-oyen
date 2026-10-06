// Aquí está el menú principal. Se dibuja sobre el pasillo real del juego,
// en vivo: la luz de emergencia, el fondo que se pierde en la oscuridad...
// y de vez en cuando, algo de pie al fondo.
import { NOMBRE_DIFICULTAD, type IdDificultad } from '../../config/Dificultad';
import { crearBoton } from '../componentes/Boton';
import { COMPILACION } from '../../config/Compilacion';
import { Pantalla } from './Pantalla';

export interface AccionesMenuPrincipal {
  hayPartida(): boolean;
  continuar(): void;
  nuevaPartida(): void;
  ajustes(): void;
  creditos(): void;
  /** El piso que se juega: su nombre y la dificultad más alta en que se terminó (null si nunca). */
  piso(): { nombre: string; completado: IdDificultad | null };
}

export class MenuPrincipal extends Pantalla {
  private readonly opciones: HTMLElement;
  private readonly lugar: HTMLParagraphElement;

  constructor(private readonly acciones: AccionesMenuPrincipal) {
    super('menu');
    const cabecera = document.createElement('header');
    cabecera.className = 'menu__cabecera';
    cabecera.innerHTML = `
      <h1 class="titulo-juego"><span>Las paredes</span><span class="titulo-juego__acento">oyen</span></h1>`;
    this.lugar = document.createElement('p');
    this.lugar.className = 'subtitulo-juego';
    cabecera.append(this.lugar);
    this.opciones = document.createElement('nav');
    this.opciones.className = 'menu__opciones';
    this.opciones.setAttribute('aria-label', 'Menú principal');
    const pie = document.createElement('footer');
    pie.className = 'menu__pie';
    pie.innerHTML = '<span>Usa audífonos</span><span class="menu__version"></span>';
    pie.querySelector('.menu__version')!.textContent = `Versión ${COMPILACION}`;
    this.elemento.append(cabecera, this.opciones, pie);
  }

  protected alMostrar(): void {
    // El piso, y en voz baja si ya lo terminó (y en qué dificultad).
    const { nombre, completado } = this.acciones.piso();
    this.lugar.textContent = `Edificio Almendros · ${nombre}`;
    if (completado) {
      const marca = document.createElement('span');
      marca.className = 'menu__completado';
      marca.textContent = ` · completado en ${NOMBRE_DIFICULTAD[completado]}`;
      this.lugar.append(marca);
    }
    // Reconstruyo las opciones: "Continuar" solo existe si hay partida guardada.
    this.opciones.replaceChildren();
    if (this.acciones.hayPartida()) this.opciones.appendChild(crearBoton('Continuar', () => this.acciones.continuar(), { clase: 'boton--principal' }));
    this.opciones.append(
      crearBoton('Nueva partida', () => this.acciones.nuevaPartida(), { clase: this.acciones.hayPartida() ? '' : 'boton--principal' }),
      crearBoton('Ajustes', () => this.acciones.ajustes()),
      crearBoton('Créditos', () => this.acciones.creditos()),
    );
  }
}
