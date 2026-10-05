// Aquí está el lector de documentos: muestra la hoja con su tipografía
// propia y permite pasar páginas con flechas, botones, mando o deslizando.
import type { Documento } from '../../narrativa/Documentos';
import { crearBoton } from '../componentes/Boton';
import { sonarUI } from '../componentes/SonidoUI';
import { Pantalla } from './Pantalla';

export class LectorDocumento extends Pantalla {
  private readonly hoja: HTMLDivElement;
  private readonly titulo: HTMLHeadingElement;
  private readonly texto: HTMLParagraphElement;
  private readonly pagina: HTMLSpanElement;
  private readonly anterior: HTMLButtonElement;
  private readonly siguiente: HTMLButtonElement;
  private paginas: string[] = [];
  private indice = 0;
  private alCerrar: () => void = () => undefined;
  private inicioToqueX: number | null = null;

  constructor(private readonly buscar: (id: string) => Documento | undefined) {
    super('lector');
    this.hoja = document.createElement('div');
    this.hoja.className = 'lector__hoja';
    this.hoja.setAttribute('role', 'document');
    this.titulo = document.createElement('h2');
    this.titulo.className = 'lector__titulo';
    this.texto = document.createElement('p');
    this.texto.className = 'lector__texto';
    const cerrar = crearBoton('Cerrar documento', () => this.cerrar(), { icono: 'cerrar', clase: 'lector__cerrar' });
    const navegacion = document.createElement('div');
    navegacion.className = 'lector__navegacion';
    this.anterior = crearBoton('Página anterior', () => this.ir(-1), { icono: 'flechaIzq' });
    this.siguiente = crearBoton('Página siguiente', () => this.ir(1), { icono: 'flechaDer' });
    this.pagina = document.createElement('span');
    this.pagina.className = 'lector__pagina';
    navegacion.append(this.anterior, this.pagina, this.siguiente);
    this.hoja.append(cerrar, this.titulo, this.texto, navegacion);
    this.elemento.appendChild(this.hoja);
    this.alVolver = () => this.cerrar();

    // Deslizar con el dedo para pasar página.
    this.hoja.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.inicioToqueX = e.clientX;
    });
    this.hoja.addEventListener('pointerup', (e) => {
      if (this.inicioToqueX === null) return;
      const dx = e.clientX - this.inicioToqueX;
      this.inicioToqueX = null;
      if (Math.abs(dx) > 60) this.ir(dx < 0 ? 1 : -1);
    });
    window.addEventListener('keydown', (e) => {
      if (!this.visible || e.repeat) return;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.ir(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.ir(-1);
      if (e.code === 'KeyE') this.cerrar();
    });
  }

  abrir(id: string, alCerrar: () => void): void {
    const doc = this.buscar(id);
    if (!doc) return;
    this.alCerrar = alCerrar;
    this.paginas = doc.paginas;
    this.indice = 0;
    this.elemento.className = `pantalla lector lector--${doc.tipo}`;
    this.titulo.textContent = doc.titulo;
    this.refrescar();
    this.mostrar();
  }

  private ir(delta: number): void {
    const nuevo = Math.min(this.paginas.length - 1, Math.max(0, this.indice + delta));
    if (nuevo === this.indice) return;
    this.indice = nuevo;
    sonarUI('pasar');
    this.refrescar();
  }

  private refrescar(): void {
    this.texto.textContent = this.paginas[this.indice] ?? '';
    this.texto.scrollTop = 0;
    this.pagina.textContent = `${this.indice + 1} / ${this.paginas.length}`;
    this.anterior.disabled = this.indice === 0;
    this.siguiente.disabled = this.indice >= this.paginas.length - 1;
    const unaSola = this.paginas.length <= 1;
    this.anterior.style.visibility = unaSola ? 'hidden' : 'visible';
    this.siguiente.style.visibility = unaSola ? 'hidden' : 'visible';
  }

  private cerrar(): void {
    if (!this.visible) return;
    this.ocultar();
    this.alCerrar();
  }

  enfocarPrimero(): void {
    if (document.documentElement.dataset.modoEntrada === 'tactil') return;
    (this.siguiente.disabled ? this.hoja.querySelector<HTMLElement>('.lector__cerrar') : this.siguiente)?.focus({ preventScroll: true });
  }
}
