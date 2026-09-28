// Aquí creo un deslizador (slider) con su valor visible. Uso el input range
// nativo: funciona con ratón, dedo, teclado y lectores de pantalla.
import { crearFila } from './FilaAjuste';

export interface OpcionesDeslizador {
  etiqueta: string;
  ayuda?: string;
  minimo: number;
  maximo: number;
  paso: number;
  valor: number;
  formato: (valor: number) => string;
  alCambiar: (valor: number) => void;
}

export function crearDeslizador(o: OpcionesDeslizador): HTMLDivElement {
  const envoltura = document.createElement('div');
  envoltura.style.display = 'flex';
  envoltura.style.alignItems = 'center';
  envoltura.style.gap = '10px';

  const entrada = document.createElement('input');
  entrada.type = 'range';
  entrada.className = 'deslizador';
  entrada.dataset.navegable = '';
  entrada.min = String(o.minimo);
  entrada.max = String(o.maximo);
  entrada.step = String(o.paso);
  entrada.value = String(o.valor);
  entrada.setAttribute('aria-label', o.etiqueta);

  const texto = document.createElement('span');
  texto.className = 'deslizador__valor';

  const refrescar = () => {
    const v = Number(entrada.value);
    texto.textContent = o.formato(v);
    const porcentaje = ((v - o.minimo) / (o.maximo - o.minimo)) * 100;
    entrada.style.setProperty('--relleno', `${porcentaje}%`);
  };
  entrada.addEventListener('input', () => {
    refrescar();
    o.alCambiar(Number(entrada.value));
  });
  refrescar();
  envoltura.append(entrada, texto);
  return crearFila(o.etiqueta, o.ayuda, envoltura);
}
