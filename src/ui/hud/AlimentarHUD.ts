// Aquí paso el estado del juego al HUD en cada fotograma: lo que puedo usar (el indicador y el botón táctil),
// el aire, la energía, la batería, la medición y el contador de FPS. No decido nada: solo leo y paso.
import type { Interactuable } from '../../interaccion/Interactuable';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { HUD } from './HUD';

export function alimentarHUD(hud: HUD, ctx: ContextoJuego, enfocado: Interactuable | null, dtReal: number): void {
  const { entrada, jugador, linterna, grabadora } = ctx;
  const texto = enfocado ? enfocado.texto(ctx) : null;
  entrada.tactil.fijarInteraccionDisponible(texto !== null, texto ?? '');
  entrada.tactil.fijarEstadoBoton('agacharse', jugador.agachado);
  entrada.tactil.fijarEstadoBoton('linterna', linterna.encendida);
  hud.actualizar({
    interaccion: texto,
    aire: jugador.respiracion.aire,
    aguantando: jugador.respiracion.aguantando,
    energia: jugador.estamina,
    bateria: linterna.bateria,
    linterna: linterna.encendida,
    medicion: grabadora.midiendo ? grabadora.progresoMedicion : null,
    dtReal,
    escalaResolucion: ctx.renderizador.resolucionDinamica,
    ratonLibre: entrada.modo === 'teclado' && !entrada.teclado.bloqueado,
  });
}
