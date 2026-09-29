// Evento: la radio del 401 se enciende sola cuando no estoy en esa sala.
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
    return ctx.memoria.habitacionActual !== 'sala401' && d > 4 && d < 20;
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
