// Aquí está la pantalla de muerte. No dice "Game Over": dice qué pasó.
// Antes elegía una pista al azar (que muchas veces no tenía nada que ver con
// lo que me mató). Ahora el juego me dice lo que ELLA oyó, y el consejo solo
// aparece la primera vez por cada causa. Morir enseña, pero sin sermones.
import { crearBoton } from '../componentes/Boton';
import { Pantalla } from './Pantalla';

export interface DatosMuerte {
  titulo: string;
  linea: string;
  /** null si ya di este consejo antes: basta con la línea y el sonido. */
  consejo: string | null;
}

export class PantallaMuerte extends Pantalla {
  private readonly titulo: HTMLHeadingElement;
  private readonly linea: HTMLParagraphElement;
  private readonly consejo: HTMLParagraphElement;

  constructor(reintentar: () => void, menu: () => void) {
    super('muerte');
    this.titulo = document.createElement('h2');
    this.titulo.className = 'muerte__titulo';
    this.linea = document.createElement('p');
    this.linea.className = 'muerte__linea';
    this.consejo = document.createElement('p');
    this.consejo.className = 'muerte__pista';
    const acciones = document.createElement('div');
    acciones.className = 'muerte__acciones';
    acciones.append(
      crearBoton('Reintentar', reintentar, { clase: 'boton--contorno boton--principal' }),
      crearBoton('Menú principal', menu, { clase: 'boton--contorno' }),
    );
    this.elemento.append(this.titulo, this.linea, this.consejo, acciones);
    this.alVolver = menu;
  }

  fijarDatos(datos: DatosMuerte): void {
    this.titulo.textContent = datos.titulo;
    this.linea.textContent = datos.linea;
    this.consejo.textContent = datos.consejo ?? '';
    this.consejo.hidden = datos.consejo === null;
  }
}
