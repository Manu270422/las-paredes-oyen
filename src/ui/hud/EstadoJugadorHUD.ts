// Aquí están los indicadores del jugador: aire (al contener la respiración),
// energía (al correr) y batería (cuando está baja). Aparecen solo cuando
// importan. Nada de barras fijas llenando la pantalla.
import { ICONOS } from '../Iconos';

class Indicador {
  readonly elemento: HTMLDivElement;
  private readonly relleno: HTMLDivElement;

  constructor(icono: string, etiqueta: string) {
    this.elemento = document.createElement('div');
    this.elemento.className = 'indicador';
    this.elemento.setAttribute('aria-label', etiqueta);
    this.elemento.innerHTML = `${icono}<div class="indicador__barra"><div class="indicador__relleno"></div></div>`;
    this.relleno = this.elemento.querySelector('.indicador__relleno') as HTMLDivElement;
  }

  fijar(valor: number, visible: boolean, critico: boolean): void {
    this.elemento.classList.toggle('indicador--visible', visible);
    this.elemento.classList.toggle('indicador--critico', critico);
    this.relleno.style.transform = `scaleX(${Math.max(0, Math.min(1, valor))})`;
  }
}

export class EstadoJugadorHUD {
  readonly elemento: HTMLDivElement;
  private readonly aire = new Indicador(ICONOS.respiracion, 'Aire');
  private readonly energia = new Indicador(ICONOS.agacharse, 'Energía');
  private readonly bateria = new Indicador(ICONOS.bateria, 'Batería');

  constructor() {
    this.elemento = document.createElement('div');
    this.elemento.className = 'estado-jugador';
    this.elemento.append(this.aire.elemento, this.energia.elemento, this.bateria.elemento);
  }

  actualizar(aire: number, aguantando: boolean, energia: number, bateria: number, linterna: boolean): void {
    this.aire.fijar(aire, aguantando || aire < 0.98, aire < 0.3);
    this.energia.fijar(energia, energia < 0.98, energia < 0.25);
    this.bateria.fijar(bateria, linterna && bateria < 0.3, bateria < 0.15);
  }
}
