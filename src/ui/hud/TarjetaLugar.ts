// Aquí muestro la tarjeta de lugar. La de cine (lugar y hora, grande y centrada) abre la partida; la
// discreta (solo el nombre, pequeña y abajo) dice a qué apartamento acabo de entrar sin tapar el cuarto; la
// de capítulo (como la de cine) resume un piso completado sobre el negro de un viaje; la nota es la línea
// suelta de algo que examino, sin panel, y se queda lo que tarda en leerse.
import type { EstiloTarjeta } from '../../nucleo/Eventos';

/** Cuánto se queda cada tarjeta en pantalla (ms), sin contar el fundido. La nota depende de lo que dice. */
const DURACION: Record<Exclude<EstiloTarjeta, 'nota'>, number> = { cine: 4200, discreta: 2500, capitulo: 3600 };
/** La nota: una base para encontrarla con la vista y un tanto por letra para leerla sin prisa. */
const NOTA = { base: 1800, porLetra: 55 };

/** Cuántos ms se queda una tarjeta con ese título y ese estilo. */
export function duracionTarjeta(estilo: EstiloTarjeta, titulo: string): number {
  return estilo === 'nota' ? NOTA.base + titulo.length * NOTA.porLetra : DURACION[estilo];
}

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
    for (const cada of ['discreta', 'capitulo', 'nota'] as const) this.elemento.classList.toggle(`tarjeta--${cada}`, estilo === cada);
    this.elemento.classList.add('tarjeta--visible');
    window.clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => this.elemento.classList.remove('tarjeta--visible'), duracionTarjeta(estilo, titulo));
  }

  ocultar(): void {
    window.clearTimeout(this.temporizador);
    this.elemento.classList.remove('tarjeta--visible');
  }
}
