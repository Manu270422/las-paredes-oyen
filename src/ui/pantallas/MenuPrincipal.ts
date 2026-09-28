// Aquí está el menú principal. Se dibuja sobre el pasillo real del juego,
// en vivo: la luz de emergencia, el fondo que se pierde en la oscuridad...
// y de vez en cuando, algo de pie al fondo.
import { crearBoton } from '../componentes/Boton';
import { Pantalla } from './Pantalla';

export interface AccionesMenuPrincipal {
  hayPartida(): boolean;
  continuar(): void;
  nuevaPartida(): void;
  ajustes(): void;
  creditos(): void;
}

export class MenuPrincipal extends Pantalla {
  private readonly opciones: HTMLElement;

  constructor(private readonly acciones: AccionesMenuPrincipal) {
    super('menu');
    const cabecera = document.createElement('header');
    cabecera.className = 'menu__cabecera';
    cabecera.innerHTML = `
      <h1 class="titulo-juego"><span>Las paredes</span><span class="titulo-juego__acento">oyen</span></h1>
      <p class="subtitulo-juego">Edificio Almendros · Piso 4</p>`;
    this.opciones = document.createElement('nav');
    this.opciones.className = 'menu__opciones';
    this.opciones.setAttribute('aria-label', 'Menú principal');
    const pie = document.createElement('footer');
    pie.className = 'menu__pie';
    pie.innerHTML = '<span>Usa audífonos</span><span>Vertical slice · v0.1</span>';
    this.elemento.append(cabecera, this.opciones, pie);
  }

  protected alMostrar(): void {
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
