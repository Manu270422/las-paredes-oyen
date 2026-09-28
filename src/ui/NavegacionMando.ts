// Aquí navego los menús con el mando (y con flechas del teclado):
// arriba/abajo mueve el foco, izquierda/derecha ajusta deslizadores y
// selectores, A acepta, B vuelve. Así el juego se juega entero sin ratón.
import type { BotonMenu } from '../entrada/Mando';
import { sonarUI } from './componentes/SonidoUI';

function visibles(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>('[data-navegable]')].filter(
    (el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null && !el.closest('.pantalla--oculta'),
  );
}

export function navegar(raiz: HTMLElement, boton: BotonMenu, alVolver: () => void): void {
  // Si hay un diálogo abierto, manda él.
  const dialogo = raiz.querySelector<HTMLElement & { alVolver?: () => void }>('.dialogo');
  const ambito = dialogo ?? raiz;
  const lista = visibles(ambito);
  const activo = document.activeElement as HTMLElement | null;
  const indice = activo ? lista.indexOf(activo) : -1;

  if (boton === 'volver') {
    if (dialogo?.alVolver) dialogo.alVolver();
    else alVolver();
    sonarUI('volver');
    return;
  }
  if (boton === 'aceptar') {
    if (indice >= 0) activo?.click();
    else lista[0]?.focus();
    return;
  }
  if (lista.length === 0) return;

  // Izquierda/derecha sobre un deslizador: ajusto su valor.
  if ((boton === 'izquierda' || boton === 'derecha') && activo instanceof HTMLInputElement && activo.type === 'range') {
    const paso = Number(activo.step) || 1;
    const valor = Number(activo.value) + (boton === 'derecha' ? paso : -paso);
    activo.value = String(Math.min(Number(activo.max), Math.max(Number(activo.min), valor)));
    activo.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  const hacia = boton === 'arriba' || boton === 'izquierda' ? -1 : 1;
  const siguiente = indice < 0 ? 0 : (indice + hacia + lista.length) % lista.length;
  lista[siguiente].focus();
  lista[siguiente].scrollIntoView({ block: 'nearest' });
}
