// Aquí creo un interruptor (sí/no) accesible con role="switch".
import { crearFila } from './FilaAjuste';
import { sonarUI } from './SonidoUI';

export interface OpcionesInterruptor {
  etiqueta: string;
  ayuda?: string;
  valor: boolean;
  alCambiar: (valor: boolean) => void;
}

export function crearInterruptor(o: OpcionesInterruptor): HTMLDivElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'interruptor';
  boton.dataset.navegable = '';
  boton.setAttribute('role', 'switch');
  boton.setAttribute('aria-label', o.etiqueta);
  let valor = o.valor;
  const refrescar = () => boton.setAttribute('aria-checked', String(valor));
  boton.addEventListener('click', () => {
    valor = !valor;
    refrescar();
    sonarUI('pulsar');
    o.alCambiar(valor);
  });
  refrescar();
  return crearFila(o.etiqueta, o.ayuda, boton);
}
