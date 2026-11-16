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
import { SplashScreen } from '@capacitor/splash-screen';
import { Juego } from './nucleo/Juego';
import { conectarAppNativa } from './plataforma/AppNativa';

/**
 * Permite que el navegador pinte los cambios de la barra de progreso en el DOM
 * antes de ejecutar tareas pesadas en el hilo principal (como compilar shaders o texturas).
 */
function esperarFrame(ms = 60): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, ms);
    });
  });
}

/**
 * Oculta y elimina la pantalla de carga panorámica suavemente.
 */
function cerrarPantallaCarga(): void {
  const pantalla = document.getElementById('pantalla-carga');
  if (!pantalla) return;
  pantalla.style.opacity = '0';
  pantalla.style.pointerEvents = 'none';
  setTimeout(() => pantalla.remove(), 600);
}

function mostrarError(mensaje: string): void {
  // Si ocurre un error fatal, retiramos la pantalla de carga para que se vea el mensaje
  cerrarPantallaCarga();

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

async function iniciarJuego(): Promise<void> {
  // 1. Oculta el fondo negro nativo de Capacitor; el jugador ya ve la pantalla panorámica HTML
  try {
    await SplashScreen.hide();
  } catch {
    // Si estamos probando en navegador web de escritorio sin el plugin nativo, ignoramos con seguridad
  }

  const contenedor = document.getElementById('juego');
  if (!contenedor) {
    throw new Error('Falta el contenedor #juego en index.html');
  }

  if (!soportaWebGL2()) {
    mostrarError(
      'Tu navegador o tu tarjeta gráfica no soportan WebGL 2. Prueba con Chrome, Edge, Firefox o Safari actualizados.'
    );
    return;
  }

  const barra = document.getElementById('barra-progreso');
  const estado = document.getElementById('texto-estado');

  const actualizarProgreso = async (porcentaje: string, texto: string): Promise<void> => {
    if (barra) barra.style.width = porcentaje;
    if (estado) estado.textContent = texto;
    await esperarFrame();
  };

  try {
    // Etapa 1: Instanciación del motor, escena y texturas/geometría iniciales
    await actualizarProgreso('40%', 'GENERANDO TEXTURAS DEL EDIFICIO ALMENDROS...');
    const juego = new Juego(contenedor);
    conectarAppNativa(() => juego.atras());

    // Etapa 2: Arranque completo del juego (acústica de sala HRTF, sonidos y mundo 3D)
    await actualizarProgreso('80%', 'SINTETIZANDO ACÚSTICA DE SALA...');
    await juego.arrancar();

    // Etapa 3: Completado al 100%
    await actualizarProgreso('100%', 'LISTO');

    // 2. Desvanece la pantalla de carga suavemente hacia el menú principal
    cerrarPantallaCarga();
  } catch (error: unknown) {
    console.error(error);
    mostrarError(error instanceof Error ? error.message : String(error));
  }
}

// Arrancamos el flujo apenas carga el módulo
void iniciarJuego();