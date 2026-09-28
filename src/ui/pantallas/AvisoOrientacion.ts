// Aquí está el aviso de "gira tu dispositivo". El juego solo se juega en
// horizontal; en vertical tapo todo y el juego queda en pausa.
import { ICONOS } from '../Iconos';

export class AvisoOrientacion {
  readonly elemento: HTMLDivElement;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'aviso-orientacion';
    this.elemento.setAttribute('role', 'alert');
    this.elemento.innerHTML = `${ICONOS.girar}<p>Gira tu dispositivo.</p><small>Las paredes oyen se juega en horizontal.</small>`;
  }

  fijarVisible(visible: boolean): void {
    this.elemento.classList.toggle('aviso-orientacion--visible', visible);
  }
}
