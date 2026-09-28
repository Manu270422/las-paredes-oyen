// Evento: pasos en el piso de arriba, cruzando justo sobre mí.
// El edificio está vacío. El quinto piso también.
import type { EventoTerror } from '../TiposDirector';
import { aleatorio } from '../../utilidades/Matematicas';

export const pasosArriba: EventoTerror = {
  id: 'pasos_arriba',
  fases: ['calma', 'acumulacion'],
  intensidad: 1,
  peso: 2,
  enfriamiento: 80,
  duracion: 6,
  puedeOcurrir: () => true,
  ejecutar(ctx) {
    const j = ctx.jugador.posicion;
    const angulo = aleatorio(0, Math.PI * 2);
    const dx = Math.cos(angulo);
    const dz = Math.sin(angulo);
    for (let i = 0; i < 7; i++) {
      const d = -4 + i * 1.3;
      ctx.audio.reproducir('paso_parque', {
        bus: 'ambiente',
        posicion: { x: j.x + dx * d, y: 3.4, z: j.z + dz * d },
        dentroPared: true,
        volumen: 0.7,
        retraso: i * 0.62,
        tono: 0.8,
      });
    }
    ctx.bus.emit('sonido-relevante', { descripcion: 'pasos en el piso de arriba', x: j.x, z: j.z });
  },
};
