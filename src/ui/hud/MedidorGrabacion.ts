// Aquí está el indicador de grabación ("● REC 00:04"). Es el único momento
// en que el HUD muestra un temporizador: seis segundos que se sienten eternos.

export class MedidorGrabacion {
  readonly elemento: HTMLDivElement;
  private readonly tiempo: HTMLSpanElement;
  private readonly relleno: HTMLDivElement;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'medidor';
    this.elemento.innerHTML = `
      <div class="medidor__rec">REC <span>00:00</span></div>
      <div class="medidor__barra"><div class="medidor__relleno"></div></div>
      <div class="medidor__ayuda">No te muevas. No hagas ruido.</div>`;
    this.tiempo = this.elemento.querySelector('.medidor__rec span') as HTMLSpanElement;
    this.relleno = this.elemento.querySelector('.medidor__relleno') as HTMLDivElement;
  }

  actualizar(progreso: number | null): void {
    const visible = progreso !== null;
    this.elemento.classList.toggle('medidor--visible', visible);
    if (!visible) return;
    const segundos = Math.floor(progreso * 6);
    this.tiempo.textContent = `00:0${segundos}`;
    this.relleno.style.transform = `scaleX(${progreso})`;
  }
}
