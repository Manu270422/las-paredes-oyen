// Aquí muestro los subtítulos: textos narrativos y, si el jugador lo activa,
// descripciones de sonidos importantes con su dirección (accesibilidad para
// personas sordas o que juegan sin audio). Máximo 3 líneas a la vez.

const MAXIMO = 3;

export class Subtitulos {
  readonly elemento: HTMLDivElement;
  private ultimoTexto = '';
  private ultimoMomento = 0;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'subtitulos';
    this.elemento.setAttribute('aria-live', 'polite');
  }

  mostrar(texto: string, duracion = 3, efecto = false): void {
    if (!texto) return;
    // Evito repetir el mismo texto en ráfaga.
    const ahora = performance.now();
    if (texto === this.ultimoTexto && ahora - this.ultimoMomento < 1500) return;
    this.ultimoTexto = texto;
    this.ultimoMomento = ahora;

    const linea = document.createElement('div');
    linea.className = `subtitulo${efecto ? ' subtitulo--efecto' : ''}`;
    linea.textContent = texto;
    this.elemento.appendChild(linea);
    while (this.elemento.children.length > MAXIMO) this.elemento.firstElementChild?.remove();
    window.setTimeout(() => linea.classList.add('subtitulo--saliendo'), duracion * 1000);
    window.setTimeout(() => linea.remove(), duracion * 1000 + 450);
  }

  limpiar(): void {
    this.elemento.replaceChildren();
  }
}
