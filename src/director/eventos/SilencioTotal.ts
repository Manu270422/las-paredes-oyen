// Evento: el edificio se calla. Todo el ambiente cae a cero durante unos
// segundos. El silencio absoluto es antinatural y el jugador lo nota.
// Luego, un solo crujido, muy cerca.
import type { EventoTerror } from '../TiposDirector';
import { detrasDelJugador } from './Ayudas';

export const silencioTotal: EventoTerror = {
  id: 'silencio_total',
  fases: ['acumulacion'],
  intensidad: 2,
  peso: 1,
  enfriamiento: 160,
  duracion: 12,
  puedeOcurrir: (ctx) => !ctx.entidad.fisica,
  ejecutar(ctx) {
    ctx.audio.fijarSilencioAmbiente(0.02);
    ctx.programador.despues(9, () => {
      const p = detrasDelJugador(ctx, 1.8, 0.6);
      ctx.audio.reproducir('crujido_madera', { posicion: { x: p.x, y: 0.2, z: p.z }, volumen: 0.8, reverb: 0.3 });
      ctx.bus.emit('sonido-relevante', { descripcion: 'un crujido junto a ti', x: p.x, z: p.z });
    });
    ctx.programador.despues(10.5, () => ctx.audio.fijarSilencioAmbiente(1));
  },
};
