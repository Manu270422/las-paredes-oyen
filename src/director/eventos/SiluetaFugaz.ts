// Evento: la silueta. Aparece un cuarto de segundo en el borde de la vista,
// iluminada, y desaparece. Sin sonido. El silencio después es lo que asusta.
// "Yo acabo de ver eso." Máximo tres veces: si se repite, deja de funcionar.
import type { EventoTerror } from '../TiposDirector';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import { anguloDesdeMirada, mitadCampoHorizontal, puntoEnVista, puntoIluminado } from '../Visibilidad';
import { celdaAlAzar, type Punto } from './Ayudas';

function buscarPunto(ctx: ContextoJuego): Punto | null {
  const campo = mitadCampoHorizontal(ctx);
  return celdaAlAzar(ctx, 5, 11, (p) => {
    const angulo = anguloDesdeMirada(ctx, p.x, 1.5, p.z);
    // En la periferia de la vista: ni al centro ni fuera.
    return angulo > campo * 0.35 && angulo < campo * 0.85 && puntoEnVista(ctx, p.x, 1.5, p.z, 0) && puntoIluminado(ctx, p.x, 1.4, p.z);
  });
}

export const siluetaFugaz: EventoTerror = {
  id: 'silueta_fugaz',
  fases: ['acumulacion', 'pico'],
  intensidad: 3,
  peso: 1.5,
  enfriamiento: 120,
  maxUsos: 3,
  duracion: 6,
  requiere: ['medido:401'],
  puedeOcurrir: (ctx) => ctx.entidad.estado === 'paredes' && buscarPunto(ctx) !== null,
  ejecutar(ctx) {
    const p = buscarPunto(ctx);
    if (!p) return;
    const modelo = ctx.entidad.modelo;
    const j = ctx.jugador.posicion;
    modelo.raiz.position.set(p.x, 0, p.z);
    modelo.raiz.rotation.y = Math.atan2(j.x - p.x, j.z - p.z);
    modelo.forzarPose('quieto');
    modelo.fijarVisible(true);
    ctx.programador.despues(0.22, () => {
      if (!ctx.entidad.fisica) modelo.fijarVisible(false);
      ctx.bus.emit('interferencia', { intensidad: 0.35, duracion: 0.25 });
      ctx.jugador.sumarEstres(0.3);
    });
    return p;
  },
};
