// Aquí muestro las pistas de tutorial, una a la vez y en cola.
// El texto trae marcas como {linterna} que traduzco al botón correcto
// según el dispositivo actual (tecla, botón del mando o botón táctil).
import type { ModoEntrada } from '../../entrada/AccionesEntrada';
import { traducirTexto } from '../../entrada/Glifos';

export class Pistas {
  readonly elemento: HTMLDivElement;
  private readonly cola: string[] = [];
  private mostrando = false;

  constructor(private readonly modo: () => ModoEntrada) {
    this.elemento = document.createElement('div');
    this.elemento.className = 'pista';
    this.elemento.setAttribute('aria-live', 'polite');
  }

  agregar(texto: string): void {
    this.cola.push(texto);
    if (!this.mostrando) this.siguiente();
  }

  private siguiente(): void {
    const texto = this.cola.shift();
    if (!texto) {
      this.mostrando = false;
      return;
    }
    this.mostrando = true;
    // Resalto las teclas en negrita.
    const traducido = traducirTexto(texto, this.modo());
    this.elemento.replaceChildren();
    for (const parte of traducido.split(/(\[[^\]]+\])/g)) {
      if (!parte) continue;
      if (parte.startsWith('[')) {
        const b = document.createElement('b');
        b.textContent = parte;
        this.elemento.appendChild(b);
      } else {
        this.elemento.appendChild(document.createTextNode(parte));
      }
    }
    this.elemento.classList.add('pista--visible');
    window.setTimeout(() => {
      this.elemento.classList.remove('pista--visible');
      window.setTimeout(() => this.siguiente(), 700);
    }, 6500);
  }

  limpiar(): void {
    this.cola.length = 0;
  }
}
