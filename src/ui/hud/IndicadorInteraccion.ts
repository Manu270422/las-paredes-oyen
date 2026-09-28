// Aquí está el punto de mira y el texto de interacción ("[E] Abrir la puerta").
// La mira es casi invisible y solo se enciende cuando apunto a algo útil.
import type { ModoEntrada } from '../../entrada/AccionesEntrada';
import { glifo } from '../../entrada/Glifos';

export class IndicadorInteraccion {
  readonly mira: HTMLDivElement;
  readonly elemento: HTMLDivElement;
  private readonly glifo: HTMLSpanElement;
  private readonly texto: HTMLSpanElement;
  private ultimo = '';

  constructor() {
    this.mira = document.createElement('div');
    this.mira.className = 'mira';
    this.elemento = document.createElement('div');
    this.elemento.className = 'interaccion';
    this.glifo = document.createElement('span');
    this.glifo.className = 'interaccion__glifo';
    this.texto = document.createElement('span');
    this.elemento.append(this.glifo, this.texto);
  }

  actualizar(texto: string | null, modo: ModoEntrada): void {
    const clave = `${texto}|${modo}`;
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    const visible = texto !== null;
    this.mira.classList.toggle('mira--activa', visible);
    this.elemento.classList.toggle('interaccion--visible', visible);
    if (visible) {
      this.glifo.textContent = glifo(modo, 'interactuar');
      this.texto.textContent = texto;
    }
  }
}
