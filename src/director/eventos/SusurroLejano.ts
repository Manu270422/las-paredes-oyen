// Evento: un susurro en otra habitación, amortiguado por los muros.
// Parece una voz. Casi se entiende. Nunca se entiende.
import type { EventoTerror } from '../TiposDirector';
import { celdaAlAzar } from './Ayudas';

export const susurroLejano: EventoTerror = {
  id: 'susurro_lejano',
  fases: ['calma', 'acumulacion'],
  intensidad: 1,
  peso: 2,
  afinidad: { escucha: 1.5 },
  enfriamiento: 60,
  puedeOcurrir: () => true,
  ejecutar(ctx) {
    const aqui = ctx.memoria.habitacionActual;
    const p = celdaAlAzar(ctx, 5, 11, (c) => ctx.nivel.habitacionEn(c.x, c.z)?.id !== aqui);
    if (!p) return;
    ctx.audio.reproducir('susurro', { bus: 'entidad', posicion: { x: p.x, y: 1.5, z: p.z }, volumen: 0.45, tono: 0.9, reverb: 0.7 });
    ctx.bus.emit('sonido-relevante', { descripcion: 'un susurro', x: p.x, z: p.z });
    return p;
  },
};
