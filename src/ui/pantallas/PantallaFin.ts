// Aquí está el cierre del vertical slice: una frase, las estadísticas de la
// partida y la vuelta al menú. Sin fanfarria: el silencio es parte del final.
import { crearBoton } from '../componentes/Boton';
import type { PuenteTelemetria } from '../PuenteTelemetria';
import { Pantalla } from './Pantalla';

export interface EstadisticasFin {
  tiempo: number;
  sustos: number;
  persecuciones: number;
  muertes: number;
}

export class PantallaFin extends Pantalla {
  private readonly lista: HTMLUListElement;
  private readonly exportar: HTMLButtonElement;

  constructor(
    menu: () => void,
    private readonly telemetria: PuenteTelemetria,
  ) {
    super('fin');
    this.elemento.innerHTML = `
      <h2 class="titulo-juego" style="text-align:center"><span>Las paredes</span><span class="titulo-juego__acento">oyen</span></h2>
      <p class="fin__texto">Nadie dijo nada. Nunca. Y todo lo que se calló sigue ahí, escuchando.</p>`;
    this.lista = document.createElement('ul');
    this.lista.className = 'fin__estadisticas';
    const acciones = document.createElement('div');
    acciones.className = 'fin__acciones';
    // Si esta partida fue una sesión de prueba, dejo exportarla aquí mismo.
    this.exportar = crearBoton('Exportar registro de la prueba', () => {
      this.exportar.textContent = this.telemetria.exportarUltima() ? 'Registro descargado' : 'No hay registro';
    }, { clase: 'boton--contorno' });
    acciones.append(crearBoton('Volver al menú', menu, { clase: 'boton--contorno boton--principal' }), this.exportar);
    const nota = document.createElement('p');
    nota.className = 'subtitulo-juego';
    nota.textContent = 'Fin del vertical slice';
    this.elemento.append(this.lista, nota, acciones);
    this.alVolver = menu;
  }

  fijarEstadisticas(e: EstadisticasFin): void {
    this.exportar.hidden = !this.telemetria.activa();
    this.exportar.textContent = 'Exportar registro de la prueba';
    const minutos = Math.floor(e.tiempo / 60);
    const segundos = Math.floor(e.tiempo % 60).toString().padStart(2, '0');
    const datos: Array<[string, string]> = [
      [`${minutos}:${segundos}`, 'Tiempo'],
      [String(e.sustos), 'Cosas que cambiaron'],
      [String(e.persecuciones), 'Veces que te cazó'],
      [String(e.muertes), 'Veces que te oyó'],
    ];
    this.lista.replaceChildren(
      ...datos.map(([valor, nombre]) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${valor}</strong>${nombre}`;
        return li;
      }),
    );
  }
}
