// Evento: golpes en las tuberías que se acercan. Tres golpes, cada uno más
// cerca que el anterior. "Son las tuberías", dijo el administrador.
import type { EventoTerror } from '../TiposDirector';
import { detrasDelJugador, muroCercano } from './Ayudas';

export const tuberiaGolpe: EventoTerror = {
  id: 'tuberia_golpe',
  fases: ['calma', 'acumulacion'],
  intensidad: 2,
  peso: 1,
  afinidad: { pared: 1 },
  enfriamiento: 110,
  duracion: 6,
  puedeOcurrir: () => true,
  ejecutar(ctx) {
    const desvio = (Math.random() - 0.5) * 2;
    [11, 7, 3].forEach((distancia, i) => {
      ctx.programador.despues(i * 1.6, () => {
        const p = muroCercano(ctx, detrasDelJugador(ctx, distancia, desvio)) ?? detrasDelJugador(ctx, distancia, desvio);
        ctx.audio.reproducir('tuberia', { bus: 'entidad', posicion: { x: p.x, y: 2.4, z: p.z }, dentroPared: true, volumen: 0.5 + i * 0.2 });
        if (i === 0) ctx.bus.emit('sonido-relevante', { descripcion: 'golpes en la tubería, acercándose', x: p.x, z: p.z });
      });
    });
  },
};
