// Aquí creo un selector de opciones (grupo de botones exclusivos).
import { crearFila } from './FilaAjuste';
import { sonarUI } from './SonidoUI';

export interface OpcionSelector<T extends string> {
  valor: T;
  texto: string;
}

export interface OpcionesSelector<T extends string> {
  etiqueta: string;
  ayuda?: string;
  opciones: readonly OpcionSelector<T>[];
  valor: T;
  alCambiar: (valor: T) => void;
}

export function crearSelector<T extends string>(o: OpcionesSelector<T>): HTMLDivElement {
  const grupo = document.createElement('div');
  grupo.className = 'selector';
  grupo.setAttribute('role', 'radiogroup');
  grupo.setAttribute('aria-label', o.etiqueta);
  const botones: HTMLButtonElement[] = [];
  let actual = o.valor;
  const refrescar = () => botones.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.valor === actual)));
  for (const opcion of o.opciones) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'selector__opcion';
    boton.dataset.navegable = '';
    boton.dataset.valor = opcion.valor;
    boton.setAttribute('role', 'radio');
    boton.textContent = opcion.texto;
    boton.addEventListener('click', () => {
      actual = opcion.valor;
      refrescar();
      sonarUI('pulsar');
      o.alCambiar(opcion.valor);
    });
    botones.push(boton);
    grupo.appendChild(boton);
  }
  refrescar();
  return crearFila(o.etiqueta, o.ayuda, grupo);
}
