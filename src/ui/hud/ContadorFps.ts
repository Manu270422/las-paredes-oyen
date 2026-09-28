// Aquí cuento los FPS reales (promedio de medio segundo) y la resolución dinámica.

export class ContadorFps {
  readonly elemento: HTMLDivElement;
  private acumulado = 0;
  private cuadros = 0;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'fps';
  }

  actualizar(dtReal: number, visible: boolean, escala: number): void {
    this.elemento.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    this.acumulado += dtReal;
    this.cuadros++;
    if (this.acumulado < 0.5) return;
    const fps = Math.round(this.cuadros / this.acumulado);
    this.elemento.textContent = `${fps} FPS · ${Math.round(escala * 100)}%`;
    this.acumulado = 0;
    this.cuadros = 0;
  }
}
