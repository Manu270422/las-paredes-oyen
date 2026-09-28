// Evento: estoy quieto y algo respira detrás de mí, a un metro.
// Solo ocurre si llevo rato sin moverme: castiga quedarse quieto en falso
// (en contraste con la medición, donde quedarse quieto es obligatorio).
import type { EventoTerror } from '../TiposDirector';
import { detrasDelJugador } from './Ayudas';

export const respiracionDetras: EventoTerror = {
  id: 'respiracion_detras',
  fases: ['acumulacion', 'pico'],
  intensidad: 3,
  peso: 1,
  enfriamiento: 180,
  maxUsos: 2,
  duracion: 6,
  requiere: ['medido:401'],
  puedeOcurrir: (ctx) => ctx.jugador.tiempoQuieto > 2.5 && !ctx.entidad.fisica && !ctx.grabadora.midiendo,
  ejecutar(ctx) {
    const p = detrasDelJugador(ctx, 1.1);
    ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x: p.x, y: 1.9, z: p.z }, volumen: 0.55, distanciaReferencia: 0.6, reverb: 0.15 });
    ctx.bus.emit('sonido-relevante', { descripcion: 'algo respira detrás de ti', x: p.x, z: p.z });
    ctx.jugador.sumarEstres(0.35);
    return p;
  },
};
