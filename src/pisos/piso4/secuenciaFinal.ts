// Aquí está el final del vertical slice. Mido la sala del 402 y al reproducir
// la grabación escucho pasos. Mis pasos. Acercándose al micrófono.
// Luego los pasos dejan de venir de la grabadora y vienen de atrás.
// La linterna muere. Algo respira en mi nuca. Tengo tiempo para girarme...
// o no. Cuando la luz vuelve, está frente a mí.
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { AccionesGuion } from '../../narrativa/AccionesGuion';
import type { FuenteSonido } from '../../audio/FuenteSonido';
import { detrasDelJugador } from '../../director/eventos/Ayudas';

export function ejecutarSecuenciaFinal(ctx: ContextoJuego, acciones: AccionesGuion): void {
  const g = 'final';
  const sub = (texto: string, duracion = 3) => ctx.bus.emit('subtitulo', { texto, duracion, tipo: 'efecto' });
  let siseo: FuenteSonido | null = null;
  ctx.director.bloquear(60);
  ctx.director.activo = false;
  ctx.entidad.puedeManifestarse = false;
  // Si estaba afuera (cazando, acechando...), vuelve a las paredes: el final le
  // pertenece al guion. Antes podía atraparme en los primeros segundos de la secuencia.
  if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);

  ctx.programador.secuencia(
    [
      [0.3, () => {
        sub('[Reproduces la medición del 402]', 2.5);
        ctx.audio.reproducir('bip', { bus: 'interfaz', volumen: 0.6 });
      }],
      [1.2, () => {
        siseo = ctx.audio.reproducir('siseo_cinta', { bus: 'voz', bucle: true, volumen: 0.2, variacion: 0 });
      }],
      [2.4, () => sub('[Pasos en la grabación. Se acercan al micrófono.]', 3)],
      ...[2.6, 3.3, 4.0, 4.7].map((t, i) => [t, () => ctx.audio.reproducir('paso_parque', { bus: 'voz', volumen: 0.2 + i * 0.1, tono: 0.95 })] as [number, () => void]),
      [5.4, () => {
        acciones.fijarSoloMirar(true);
        sub('[Los pasos ya no vienen de la grabadora]', 3);
        siseo?.detener(0.3);
      }],
      ...[5.6, 6.3, 7.0].map((t, i) => [t, () => {
        const p = detrasDelJugador(ctx, 5 - i * 1.5);
        ctx.audio.reproducir('paso_parque', { bus: 'entidad', posicion: { x: p.x, y: 0.1, z: p.z }, volumen: 0.6 + i * 0.15 });
      }] as [number, () => void]),
      [7.6, () => {
        ctx.linterna.forzarApagada(4.3);
        for (const l of ctx.nivel.lamparas) if (l.id !== 'emergencia') l.fijarEstado('apagada');
        ctx.audio.fijarSilencioAmbiente(0);
        ctx.bus.emit('interferencia', { intensidad: 0.5, duracion: 0.4 });
      }],
      [8.6, () => {
        const p = detrasDelJugador(ctx, 0.8);
        ctx.audio.reproducir('respira_entidad', { bus: 'entidad', posicion: { x: p.x, y: 1.9, z: p.z }, volumen: 1, distanciaReferencia: 0.5, reverb: 0.1 });
        sub('[Algo respira detrás de ti]', 3);
        ctx.jugador.sumarEstres(0.6);
      }],
      [11.9, () => acciones.mostrarSusto()],
      [12.5, () => acciones.fundido(true, 0.15)],
      [13.6, () => {
        ctx.audio.fijarSilencioAmbiente(1);
        acciones.terminarDemo();
      }],
    ],
    g,
  );
}
