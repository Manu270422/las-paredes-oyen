// Aquí muestro el objetivo actual unos segundos cuando cambia.
// Después desaparece: lo puedo volver a ver en el menú de pausa.

export class AvisoObjetivo {
  readonly elemento: HTMLDivElement;
  private temporizador = 0;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'objetivo';
  }

  mostrar(texto: string, nuevo: boolean): void {
    this.elemento.innerHTML = `<small>${nuevo ? 'Nuevo objetivo' : 'Objetivo'}</small>`;
    const parrafo = document.createElement('p');
    parrafo.textContent = texto;
    this.elemento.appendChild(parrafo);
    this.elemento.classList.add('objetivo--visible');
    window.clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => this.elemento.classList.remove('objetivo--visible'), 6500);
  }

  ocultar(): void {
    window.clearTimeout(this.temporizador);
    this.elemento.classList.remove('objetivo--visible');
  }
}
