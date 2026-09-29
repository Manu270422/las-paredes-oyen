// Evento: un mueble que el jugador ya vio cambió cuando no estaba.
// La silla del 401 ahora mira hacia la puerta. La sábana con forma de
// persona del 402... ya no está. O está en otro lugar.
// "Esa habitación no era así."
import type { EventoTerror } from '../TiposDirector';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Mueble } from '../../mundo/Muebles';
import { elegir } from '../../utilidades/Matematicas';
import { fueraDeVista } from './Ayudas';

function candidatos(ctx: ContextoJuego): Mueble[] {
  const aqui = ctx.memoria.habitacionActual;
  return ctx.nivel.muebles.filter((m) => {
    if (!m.movible) return false;
    const p = m.objeto.position;
    const habitacion = ctx.nivel.habitacionEn(p.x, p.z);
    if (!habitacion || habitacion.id === aqui || ctx.memoria.visitas(habitacion.id) === 0) return false;
    return fueraDeVista(ctx, { x: p.x, z: p.z }, 1);
  });
}

export const objetoMovido: EventoTerror = {
  id: 'objeto_movido',
  fases: ['acumulacion', 'pico'],
  intensidad: 2,
  peso: 2,
  afinidad: { acampa: 2 },
  enfriamiento: 80,
  puedeOcurrir: (ctx) => candidatos(ctx).length > 0,
  ejecutar(ctx) {
    const mueble = elegir(candidatos(ctx));
    if (!mueble) return;
    const p = mueble.objeto.position;
    if (mueble.tipo === 'figura') {
      // La figura cubierta desaparece... o reaparece un poco más cerca de la puerta.
      mueble.objeto.visible = !mueble.objeto.visible;
    } else {
      // La silla se gira hacia donde está el jugador ahora.
      const j = ctx.jugador.posicion;
      mueble.objeto.rotation.y = Math.atan2(j.x - p.x, j.z - p.z) + Math.PI;
    }
    mueble.recalcularCaja();
    return { x: p.x, z: p.z };
  },
};
