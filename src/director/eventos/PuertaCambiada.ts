// Evento: una puerta que el jugador vio (o usó) cambia de estado cuando no mira.
// Nada de sonido. Solo la duda: "¿esa puerta no la había cerrado?"
import type { EventoTerror } from '../TiposDirector';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Puerta } from '../../mundo/Puerta';
import { elegir } from '../../utilidades/Matematicas';
import { fueraDeVista } from './Ayudas';

function candidatas(ctx: ContextoJuego): Puerta[] {
  const j = ctx.jugador.posicion;
  return ctx.nivel.puertas.filter((p) => {
    const d = p.centro.distanceTo(j);
    const conocida = p.vecesVista > 2 || ctx.memoria.puertaConocida(p.id);
    return !p.cerradaConLlave && !p.enMovimiento && conocida && d > 4 && d < 18 && fueraDeVista(ctx, { x: p.centro.x, z: p.centro.z });
  });
}

export const puertaCambiada: EventoTerror = {
  id: 'puerta_cambiada',
  cambia: 'puerta',
  fases: ['acumulacion', 'pico'],
  intensidad: 2,
  peso: 2,
  afinidad: { acampa: 1 },
  enfriamiento: 70,
  puedeOcurrir: (ctx) => candidatas(ctx).length > 0,
  ejecutar(ctx) {
    const puerta = elegir(candidatas(ctx));
    if (!puerta) return;
    // Si estaba cerrada, queda entreabierta: más inquietante que abierta del todo.
    puerta.fijarInstantaneo(!puerta.abierta, 0.45);
    return { x: puerta.centro.x, z: puerta.centro.z };
  },
};
