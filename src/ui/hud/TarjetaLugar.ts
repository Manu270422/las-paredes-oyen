// Aquí muestro la tarjeta de lugar. La de cine (lugar y hora, grande y centrada) abre la partida; la
// discreta (solo el nombre, pequeña y abajo) dice a qué apartamento acabo de entrar sin tapar el cuarto.
import type { EstiloTarjeta } from '../../nucleo/Eventos';

/** Cuánto se queda cada tarjeta en pantalla (ms), sin contar el fundido. */
const DURACION: Record<EstiloTarjeta, number> = { cine: 4200, discreta: 2500 };

export class TarjetaLugar {
  readonly elemento: HTMLDivElement;
  private temporizador = 0;

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'tarjeta';
  }

  mostrar(titulo: string, subtitulo: string, estilo: EstiloTarjeta = 'cine'): void {
    this.elemento.replaceChildren();
    const h2 = document.createElement('h2');
    h2.textContent = titulo;
    this.elemento.append(h2);
    if (subtitulo) {
      const p = document.createElement('p');
      p.textContent = subtitulo;
      this.elemento.append(p);
    }
    this.elemento.classList.toggle('tarjeta--discreta', estilo === 'discreta');
    this.elemento.classList.add('tarjeta--visible');
    window.clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => this.elemento.classList.remove('tarjeta--visible'), DURACION[estilo]);
  }

  ocultar(): void {
    window.clearTimeout(this.temporizador);
    this.elemento.classList.remove('tarjeta--visible');
  }
}
