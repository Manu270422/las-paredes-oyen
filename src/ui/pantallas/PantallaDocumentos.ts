// Aquí está la lista de documentos leídos (desde la pausa), para releerlos.
// En un juego basado en pistas, poder releer es respeto por el jugador.
import type { Documento } from '../../narrativa/TiposNarrativa';
import { crearBoton } from '../componentes/Boton';
import { Pantalla } from './Pantalla';

export class PantallaDocumentos extends Pantalla {
  private readonly lista: HTMLDivElement;

  constructor(
    private readonly leidos: () => readonly string[],
    private readonly abrir: (id: string) => void,
    alCerrar: () => void,
    private readonly buscar: (id: string) => Documento | undefined,
  ) {
    super('panel');
    const caja = document.createElement('div');
    caja.className = 'panel__caja';
    const cabecera = document.createElement('div');
    cabecera.className = 'panel__cabecera';
    cabecera.innerHTML = '<h2 class="panel__titulo">Documentos</h2>';
    cabecera.appendChild(crearBoton('Cerrar', alCerrar, { icono: 'cerrar' }));
    const cuerpo = document.createElement('div');
    cuerpo.className = 'panel__cuerpo';
    this.lista = document.createElement('div');
    this.lista.className = 'lista-documentos';
    cuerpo.appendChild(this.lista);
    caja.append(cabecera, cuerpo);
    this.elemento.appendChild(caja);
    this.alVolver = alCerrar;
  }

  protected alMostrar(): void {
    this.lista.replaceChildren();
    const ids = this.leidos();
    if (ids.length === 0) {
      const vacia = document.createElement('p');
      vacia.className = 'lista-documentos__vacia';
      vacia.textContent = 'Todavía no has encontrado nada.';
      this.lista.appendChild(vacia);
      return;
    }
    for (const id of ids) {
      const doc = this.buscar(id);
      if (doc) this.lista.appendChild(crearBoton(doc.titulo, () => this.abrir(id)));
    }
  }
}
