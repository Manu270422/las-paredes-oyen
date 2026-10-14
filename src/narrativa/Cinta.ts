// Aquí reproduzco la cinta de una medición: las líneas de la historia (las del paquete del piso) MÁS lo que el
// micrófono captó de verdad mientras medía (la segunda realidad, CapturaGrabadora). Lo usan los guiones de los
// pisos; el motor no sabe qué apartamento es.
import type { ContextoJuego } from '../nucleo/ContextoJuego';

export function reproducirCinta(id: string, ctx: ContextoJuego, alTerminar: () => void): void {
  const guion = ctx.piso.transcripciones[id] ?? [];
  const lineas = [...guion, ...ctx.grabadora.captura.lineas(guion)].sort((a, b) => a.t - b.t);
  let final = 0;
  for (const linea of lineas) final = Math.max(final, linea.t);
  ctx.director.bloquear(final + 5);
  const siseo = ctx.audio.reproducir('siseo_cinta', { bus: 'voz', bucle: true, volumen: 0.15, variacion: 0 });
  for (const linea of lineas) {
    ctx.programador.despues(linea.t, () => {
      if (linea.texto) ctx.bus.emit('subtitulo', { texto: linea.texto, duracion: 3.2, tipo: 'efecto' });
      const sonido = linea.sonido;
      if (!sonido) return;
      // Suena "desde la cinta": un poco más grave, y apagado si se captó a través del muro.
      for (let i = 0; i < (linea.repeticiones ?? 1); i++) {
        ctx.audio.reproducir(sonido, { bus: 'voz', volumen: linea.volumen ?? 0.5, retraso: i * 0.36, tono: 0.97, dentroPared: linea.dentroPared });
      }
    });
  }
  ctx.programador.despues(final + 3, () => {
    siseo?.detener(0.3);
    alTerminar();
  });
}
