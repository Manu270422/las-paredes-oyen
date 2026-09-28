// Aquí creo un diálogo de confirmación (por ejemplo: "¿Empezar de nuevo?
// Se perderá tu partida"). Devuelve una promesa con la decisión.
import { crearBoton } from './Boton';

export function confirmar(contenedor: HTMLElement, texto: string, textoAceptar: string, textoCancelar = 'Cancelar'): Promise<boolean> {
  return new Promise((resolver) => {
    const fondo = document.createElement('div');
    fondo.className = 'dialogo';
    fondo.setAttribute('role', 'alertdialog');
    fondo.setAttribute('aria-modal', 'true');
    const caja = document.createElement('div');
    caja.className = 'dialogo__caja';
    const parrafo = document.createElement('p');
    parrafo.className = 'dialogo__texto';
    parrafo.textContent = texto;
    const acciones = document.createElement('div');
    acciones.className = 'dialogo__acciones';
    const cerrar = (resultado: boolean) => {
      fondo.remove();
      resolver(resultado);
    };
    const cancelar = crearBoton(textoCancelar, () => cerrar(false), { clase: 'boton--contorno' });
    const aceptar = crearBoton(textoAceptar, () => cerrar(true), { clase: 'boton--contorno boton--peligro' });
    acciones.append(cancelar, aceptar);
    caja.append(parrafo, acciones);
    fondo.appendChild(caja);
    // Si el diálogo está abierto, el botón "volver" lo cancela.
    (fondo as HTMLElement & { alVolver?: () => void }).alVolver = () => cerrar(false);
    contenedor.appendChild(fondo);
    requestAnimationFrame(() => cancelar.focus());
  });
}
