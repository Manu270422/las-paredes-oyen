// Aquí está la base de todas mis pantallas: un contenedor que se muestra
// y se oculta con transición, y que enfoca su primer control al abrirse
// (clave para jugar con mando o teclado sin tocar el ratón).

export abstract class Pantalla {
  readonly elemento: HTMLDivElement;
  /** Qué hacer al pulsar "volver" (Escape, botón B del mando). */
  alVolver: (() => void) | null = null;

  constructor(clases: string) {
    this.elemento = document.createElement('div');
    this.elemento.className = `pantalla pantalla--oculta ${clases}`;
  }

  get visible(): boolean {
    return !this.elemento.classList.contains('pantalla--oculta');
  }

  mostrar(): void {
    this.elemento.classList.remove('pantalla--oculta');
    this.alMostrar();
    requestAnimationFrame(() => this.enfocarPrimero());
  }

  ocultar(): void {
    this.elemento.classList.add('pantalla--oculta');
  }

  /** Cada pantalla puede refrescar su contenido al mostrarse. */
  protected alMostrar(): void {
    // Por defecto no hago nada.
  }

  enfocarPrimero(): void {
    // En táctil no enfoco nada: el anillo de foco confunde en pantallas de toque.
    if (document.documentElement.dataset.modoEntrada === 'tactil') return;
    const primero = this.elemento.querySelector<HTMLElement>('[data-navegable]:not([disabled])');
    primero?.focus({ preventScroll: true });
  }
}
