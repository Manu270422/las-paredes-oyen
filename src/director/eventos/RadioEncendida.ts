// Evento: la radio se enciende sola cuando no estoy en el cuarto donde está.
// Estática y una voz. Además es ruido REAL: atrae a la criatura hacia allá.
// ¿La dejo sonar (distracción) o voy a apagarla (arriesgarme)?
import type { EventoTerror } from '../TiposDirector';

export const radioEncendida: EventoTerror = {
  id: 'radio_encendida',
  fases: ['calma', 'acumulacion'],
  intensidad: 2,
  peso: 2,
  afinidad: { acampa: 1 },
  enfriamiento: 150,
  maxUsos: 3,
  puedeOcurrir: (ctx) => {
    const radio = ctx.nivel.radio;
    if (!radio || radio.estaEncendida) return false;
    const d = radio.objeto.position.distanceTo(ctx.jugador.posicion);
    // El cuarto de la radio sale de su propia posición en el mapa: no hace falta saber cuál es.
    const cuartoDeLaRadio = ctx.nivel.habitacionEn(radio.objeto.position.x, radio.objeto.position.z)?.id;
    return ctx.memoria.habitacionActual !== cuartoDeLaRadio && d > 4 && d < 20;
  },
  ejecutar(ctx) {
    const radio = ctx.nivel.radio;
    if (!radio) return;
    radio.encender(ctx);
    const p = radio.objeto.position;
    ctx.bus.emit('sonido-relevante', { descripcion: 'una radio se enciende', x: p.x, z: p.z });
    return { x: p.x, z: p.z };
  },
};
