// Aquí creo botones consistentes en todo el juego. Todos son navegables
// con teclado y mando (data-navegable) y suenan al pasar y al pulsar.
import { ICONOS, type NombreIcono } from '../Iconos';
import { sonarUI } from './SonidoUI';

export interface OpcionesBoton {
  clase?: string;
  icono?: NombreIcono;
  deshabilitado?: boolean;
}

export function crearBoton(texto: string, alPulsar: () => void, opciones: OpcionesBoton = {}): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `boton ${opciones.clase ?? ''}`.trim();
  boton.dataset.navegable = '';
  if (opciones.icono) {
    boton.innerHTML = ICONOS[opciones.icono];
    boton.classList.add('boton--icono');
    boton.setAttribute('aria-label', texto);
    boton.title = texto;
  } else {
    boton.textContent = texto;
  }
  boton.disabled = opciones.deshabilitado ?? false;
  boton.addEventListener('click', () => {
    sonarUI('pulsar');
    alPulsar();
  });
  // Sonido al pasar el ratón (solo con puntero fino) o al recibir foco con mando/teclado.
  boton.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') sonarUI('pasar');
  });
  boton.addEventListener('focus', () => {
    if (document.documentElement.dataset.modoEntrada === 'mando') sonarUI('pasar');
  });
  return boton;
}
