// Evento: tres golpes en la pared, detrás o al lado del jugador.
// Variación: a veces solo suenan dos... y el tercero llega segundos después,
// mucho más cerca. El jugador aprende el patrón y el juego lo rompe.
import type { EventoTerror } from '../TiposDirector';
import { detrasDelJugador, muroCercano } from './Ayudas';

export const golpesEnPared: EventoTerror = {
  id: 'golpes_pared',
  fases: ['calma', 'acumulacion'],
  intensidad: 1,
  peso: 3,
  afinidad: { pared: 2 },
  enfriamiento: 45,
  duracion: 5,
  puedeOcurrir: (ctx) => muroCercano(ctx, detrasDelJugador(ctx, 2.5, (Math.random() - 0.5) * 1.5)) !== null,
  ejecutar(ctx) {
    const muro = muroCercano(ctx, detrasDelJugador(ctx, 2.5, (Math.random() - 0.5) * 1.5));
    if (!muro) return;
    const golpe = (volumen: number, p = muro) =>
      ctx.audio.reproducir('golpe', { bus: 'entidad', posicion: { x: p.x, y: 1.3, z: p.z }, dentroPared: true, volumen, reverb: 0.4 });
    ctx.bus.emit('sonido-relevante', { descripcion: 'tres golpes en la pared', x: muro.x, z: muro.z });
    const incompleto = Math.random() < 0.3;
    ctx.programador.secuencia([
      [0, () => golpe(0.8)],
      [0.36, () => golpe(0.8)],
      ...(incompleto ? [] : ([[0.72, () => golpe(0.8)]] as Array<[number, () => void]>)),
    ]);
    if (incompleto) {
      // El tercer golpe llega tarde, y desde la pared más cercana al jugador.
      ctx.programador.despues(4.5, () => {
        const cerca = muroCercano(ctx, { x: ctx.jugador.posicion.x, z: ctx.jugador.posicion.z });
        if (cerca) {
          golpe(1, cerca);
          ctx.jugador.sobresaltar(0.3);
          ctx.bus.emit('sonido-relevante', { descripcion: 'el tercer golpe, muy cerca', x: cerca.x, z: cerca.z });
        }
      });
    }
    return muro;
  },
};
