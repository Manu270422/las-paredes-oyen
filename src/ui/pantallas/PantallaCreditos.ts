// Aquí están los créditos y la nota técnica del proyecto.
import { crearBoton } from '../componentes/Boton';
import { Pantalla } from './Pantalla';

export class PantallaCreditos extends Pantalla {
  constructor(alCerrar: () => void) {
    super('panel');
    const caja = document.createElement('div');
    caja.className = 'panel__caja';
    const cabecera = document.createElement('div');
    cabecera.className = 'panel__cabecera';
    cabecera.innerHTML = '<h2 class="panel__titulo">Créditos</h2>';
    cabecera.appendChild(crearBoton('Cerrar', alCerrar, { icono: 'cerrar' }));
    const cuerpo = document.createElement('div');
    cuerpo.className = 'panel__cuerpo creditos__texto';
    cuerpo.innerHTML = `
      <h3>Las paredes oyen</h3>
      <p>Un juego de terror psicológico sobre lo que se oye y se calla.</p>
      <h3>Tecnología</h3>
      <p>Construido sin motor comercial: TypeScript, WebGL 2 (Three.js como librería de dibujo) y Web Audio API.</p>
      <h3>Contenido procedural</h3>
      <p>Todas las texturas y todos los sonidos del vertical slice se generan por código al iniciar el juego.</p>
      <h3>Gracias</h3>
      <p>A quien juega con audífonos, a oscuras y hasta el final.</p>`;
    caja.append(cabecera, cuerpo);
    this.elemento.appendChild(caja);
    this.alVolver = alCerrar;
  }
}
