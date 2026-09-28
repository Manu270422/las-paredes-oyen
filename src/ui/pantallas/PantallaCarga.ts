// Aquí está la pantalla de carga. Mientras genero texturas y sonidos, muestro
// el título y frases cortas del mundo del juego (no "Cargando shaders...").
import { Pantalla } from './Pantalla';

const FRASES = [
  'El edificio está desocupado desde marzo.',
  'Si oye golpes, son las tuberías.',
  'Todo lo que se calla se queda en algún lado.',
  'Camine por el centro de los cuartos.',
];

export class PantallaCarga extends Pantalla {
  private readonly barra: HTMLDivElement;
  private readonly texto: HTMLDivElement;

  constructor() {
    super('carga');
    this.elemento.innerHTML = `
      <h1 class="titulo-juego" style="text-align:center"><span>Las paredes</span><span class="titulo-juego__acento">oyen</span></h1>
      <div class="carga__barra" role="progressbar" aria-label="Progreso de carga"><div class="carga__progreso"></div></div>
      <div class="carga__texto"></div>`;
    this.barra = this.elemento.querySelector('.carga__progreso') as HTMLDivElement;
    this.texto = this.elemento.querySelector('.carga__texto') as HTMLDivElement;
    this.texto.textContent = FRASES[Math.floor(Math.random() * FRASES.length)];
  }

  fijarProgreso(fraccion: number): void {
    this.barra.style.width = `${Math.round(Math.min(1, Math.max(0, fraccion)) * 100)}%`;
  }
}
