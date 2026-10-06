// Aquí está el menú de pausa: muestra el objetivo actual (para quien
// retoma la partida después de un rato) y las opciones.
import { crearBoton } from '../componentes/Boton';
import { Pantalla } from './Pantalla';

export interface AccionesPausa {
  objetivo(): string | null;
  reanudar(): void;
  documentos(): void;
  ajustes(): void;
  reiniciarPunto(): void;
  /** Si "volver al punto de control" es en realidad empezar de cero (Pesadilla). */
  reinicioDesdeCero(): boolean;
  salirAlMenu(): void;
}

export class MenuPausa extends Pantalla {
  private readonly objetivo: HTMLDivElement;
  private readonly reiniciar: HTMLButtonElement;

  constructor(private readonly acciones: AccionesPausa) {
    super('pausa');
    const contenido = document.createElement('div');
    contenido.className = 'pausa__contenido';
    const izquierda = document.createElement('div');
    izquierda.innerHTML = '<h2 class="pausa__titulo">Pausa</h2>';
    this.objetivo = document.createElement('div');
    this.objetivo.className = 'pausa__objetivo';
    izquierda.appendChild(this.objetivo);
    const opciones = document.createElement('nav');
    opciones.className = 'pausa__opciones';
    opciones.append(
      crearBoton('Continuar', () => acciones.reanudar(), { clase: 'boton--principal' }),
      crearBoton('Documentos', () => acciones.documentos()),
      crearBoton('Ajustes', () => acciones.ajustes()),
      (this.reiniciar = crearBoton('Volver al último punto de control', () => acciones.reiniciarPunto())),
      crearBoton('Salir al menú principal', () => acciones.salirAlMenu(), { clase: 'boton--peligro' }),
    );
    contenido.append(izquierda, opciones);
    this.elemento.appendChild(contenido);
    this.alVolver = () => acciones.reanudar();
  }

  protected alMostrar(): void {
    const texto = this.acciones.objetivo();
    this.objetivo.innerHTML = '<small>Objetivo</small>';
    this.objetivo.append(document.createTextNode(texto ?? 'Sal de aquí.'));
    this.reiniciar.textContent = this.acciones.reinicioDesdeCero() ? 'Empezar de nuevo' : 'Volver al último punto de control';
  }
}
