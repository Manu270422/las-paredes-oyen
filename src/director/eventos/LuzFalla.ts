// Evento: la luz más cercana falla. A veces vuelve. A veces explota y ya no.
// La luz de emergencia de la escalera también parpadea, pero nunca muere:
// quiero que el jugador DUDE de su zona segura, no que la pierda.
import type { EventoTerror } from '../TiposDirector';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';

function lamparaCercana(ctx: ContextoJuego) {
  const j = ctx.jugador.posicion;
  return ctx.nivel.lamparas
    .filter((l) => l.brillo > 0.3 && l.posicion.distanceTo(j) < 12)
    .sort((a, b) => a.posicion.distanceTo(j) - b.posicion.distanceTo(j))[0];
}

export const luzFalla: EventoTerror = {
  id: 'luz_falla',
  fases: ['calma', 'acumulacion'],
  intensidad: 1,
  peso: 2,
  enfriamiento: 50,
  duracion: 4,
  puedeOcurrir: (ctx) => lamparaCercana(ctx) !== undefined,
  ejecutar(ctx) {
    const lampara = lamparaCercana(ctx);
    if (!lampara) return;
    lampara.interferir(2.5);
    const p = lampara.posicion;
    ctx.audio.reproducir('chispa', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.35 });
    if (lampara.tipo !== 'emergencia' && Math.random() < 0.4) {
      ctx.programador.despues(2.5, () => {
        lampara.fijarEstado('rota');
        ctx.audio.reproducir('chispa', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.8 });
        ctx.bus.emit('sonido-relevante', { descripcion: 'un bombillo revienta', x: p.x, z: p.z });
      });
    }
    return { x: p.x, z: p.z };
  },
};
