// Aquí muestro la tarjeta de lugar y hora, como en el cine, al empezar.

export class TarjetaLugar {
  readonly elemento: HTMLDivElement;
  private temporizador = 0;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'tarjeta';
  }

  mostrar(titulo: string, subtitulo: string): void {
    this.elemento.replaceChildren();
    const h2 = document.createElement('h2');
    h2.textContent = titulo;
    const p = document.createElement('p');
    p.textContent = subtitulo;
    this.elemento.append(h2, p);
    this.elemento.classList.add('tarjeta--visible');
    window.clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => this.elemento.classList.remove('tarjeta--visible'), 4200);
  }

  ocultar(): void {
    window.clearTimeout(this.temporizador);
    this.elemento.classList.remove('tarjeta--visible');
  }
}
