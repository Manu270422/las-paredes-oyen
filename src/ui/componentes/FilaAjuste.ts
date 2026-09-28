// Aquí creo la estructura común de una fila de ajustes: etiqueta, ayuda
// opcional a la izquierda y el control a la derecha (se apilan en pantallas estrechas).

export function crearFila(etiqueta: string, ayuda: string | undefined, control: HTMLElement): HTMLDivElement {
  const fila = document.createElement('div');
  fila.className = 'fila-ajuste';
  const texto = document.createElement('div');
  texto.className = 'fila-ajuste__texto';
  const nombre = document.createElement('span');
  nombre.className = 'fila-ajuste__etiqueta';
  nombre.textContent = etiqueta;
  texto.appendChild(nombre);
  if (ayuda) {
    const detalle = document.createElement('span');
    detalle.className = 'fila-ajuste__ayuda';
    detalle.textContent = ayuda;
    texto.appendChild(detalle);
  }
  const contenedor = document.createElement('div');
  contenedor.className = 'fila-ajuste__control';
  contenedor.appendChild(control);
  fila.append(texto, contenedor);
  return fila;
}
