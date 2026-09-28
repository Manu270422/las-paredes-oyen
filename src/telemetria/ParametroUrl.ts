// Aquí leo el parámetro "?telemetria=1" de la dirección del juego.
// Así puedo mandarle a cada probador un enlace que ya trae la telemetría
// encendida, sin pedirle que busque la opción en los ajustes.
// "?telemetria=0" la vuelve a apagar. El valor se guarda en los ajustes.
import type { GestorAjustes } from '../config/Ajustes';

export function aplicarParametroTelemetria(ajustes: GestorAjustes): void {
  try {
    const valor = new URLSearchParams(window.location.search).get('telemetria');
    if (valor === '1') ajustes.cambiar('telemetria', true);
    else if (valor === '0') ajustes.cambiar('telemetria', false);
  } catch {
    // Si la URL no se puede leer (entornos raros de empaquetado), no pasa nada.
  }
}
