// Evento: si camino pegado a la pared, algo rasca del otro lado,
// siguiéndome a lo largo del muro. Es la forma en que el juego ENSEÑA
// su regla central sin decirla: las paredes oyen.
import type { EventoTerror } from '../TiposDirector';
import { muroCercano } from './Ayudas';

export const rasgunoCercano: EventoTerror = {
  id: 'rasguno_cercano',
  fases: ['calma', 'acumulacion', 'pico'],
  intensidad: 2,
  peso: 3,
  enfriamiento: 55,
  duracion: 5,
  puedeOcurrir: (ctx) => {
    const j = ctx.jugador.posicion;
    return ctx.nivel.rejilla.distanciaAPared(j.x, j.z) < 0.7 && ctx.jugador.rapidez > 0.3 && ctx.entidad.estado === 'paredes';
  },
  ejecutar(ctx) {
    for (let i = 0; i < 3; i++) {
      ctx.programador.despues(i * 1.1, () => {
        const j = ctx.jugador.posicion;
        const muro = muroCercano(ctx, { x: j.x, z: j.z });
        if (!muro) return;
        ctx.audio.reproducir('rasguno', { bus: 'entidad', posicion: { x: muro.x, y: 1.1, z: muro.z }, dentroPared: true, volumen: 0.75 });
        if (i === 0) ctx.bus.emit('sonido-relevante', { descripcion: 'algo rasca al otro lado de la pared', x: muro.x, z: muro.z });
      });
    }
  },
};
