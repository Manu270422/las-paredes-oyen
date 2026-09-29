// Evento: mis pasos tienen "eco"... un eco que viene de atrás y va un poco
// tarde. Sin cuerpo: es sonido puro, la criatura sigue dentro de los muros.
// Cada vez que el jugador lo vive, la imitación avanza de etapa:
// 1ª vez: parece un eco (acústica del pasillo, ¿no?).
// 2ª vez: cuando me detengo, da UN paso más.
// Después de que la grabadora del 403 me mostró mis pasos estando quieto:
// me detengo... y repite mi ritmo entero, acercándose.
// "La primera vez pensé que escuché pasos. La segunda entendí que eran los míos.
//  La tercera, siguieron después de que me detuve."
import type { EventoTerror } from '../TiposDirector';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { EtapaImitacion } from '../../ia/Imitador';
import { detrasDelJugador } from './Ayudas';

function etapaSiguiente(ctx: ContextoJuego): EtapaImitacion {
  if (ctx.memoria.exposicionesImitacion === 0) return 1;
  return ctx.progreso.tiene('medido:403') ? 3 : 2;
}

export const pasosEco: EventoTerror = {
  id: 'pasos_eco',
  fases: ['acumulacion'],
  intensidad: 2,
  peso: 2,
  afinidad: { corre: 2 },
  enfriamiento: 100,
  duracion: 16,
  puedeOcurrir: (ctx) => ctx.jugador.rapidez > 0.5 && ctx.entidad.estado === 'paredes' && !ctx.entidad.imitador.imitando,
  ejecutar(ctx) {
    ctx.entidad.imitador.iniciar(ctx, {
      etapa: etapaSiguiente(ctx),
      // Los pasos salen de 6 m detrás de mí, siguiéndome.
      fuente: () => detrasDelJugador(ctx, 6),
      conCuerpo: false,
      duracion: 15,
    });
  },
};
