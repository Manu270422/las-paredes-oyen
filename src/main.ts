// Este es mi punto de entrada. Cargo los estilos en orden y arranco el juego.
// Si algo falla al iniciar (por ejemplo, un navegador sin WebGL 2), muestro
// un mensaje claro en vez de una pantalla negra.
import './estilos/variables.css';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/pantallas.css';
import './estilos/documento.css';
import './estilos/hud.css';
import './estilos/tactil.css';
import './estilos/orientacion.css';
import { Juego } from './nucleo/Juego';

function mostrarError(mensaje: string): void {
  const ui = document.getElementById('ui');
  if (!ui) return;
  ui.innerHTML = `<div class="pantalla carga" style="pointer-events:auto">
    <p class="inicio__texto">No se pudo iniciar el juego.</p>
    <p class="inicio__nota"></p></div>`;
  const nota = ui.querySelector('.inicio__nota');
  if (nota) nota.textContent = mensaje;
}

function soportaWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

const contenedor = document.getElementById('juego');
if (!contenedor) {
  throw new Error('Falta el contenedor #juego en index.html');
}
if (!soportaWebGL2()) {
  mostrarError('Tu navegador o tu tarjeta gráfica no soportan WebGL 2. Prueba con Chrome, Edge, Firefox o Safari actualizados.');
} else {
  const juego = new Juego(contenedor);
  juego.arrancar().catch((error: unknown) => {
    console.error(error);
    mostrarError(error instanceof Error ? error.message : String(error));
  });
}
