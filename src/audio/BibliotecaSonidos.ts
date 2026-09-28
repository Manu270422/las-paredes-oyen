// Aquí genero y guardo todos los buffers de audio (con sus variantes).
// Lo hago una sola vez durante la carga, luego reproducir es instantáneo.
import type { IdSonido } from './TiposAudio';
import { RECETAS_SONIDO } from './sintesis/RecetasSonidos';
import { cederHilo } from '../utilidades/Esperar';

export class BibliotecaSonidos {
  private readonly buffers = new Map<IdSonido, AudioBuffer[]>();
  private readonly ultimaVariante = new Map<IdSonido, number>();

  async generar(contexto: BaseAudioContext, alProgreso: (p: number) => void): Promise<void> {
    const tasa = contexto.sampleRate;
    const ids = Object.keys(RECETAS_SONIDO) as IdSonido[];
    for (let i = 0; i < ids.length; i++) {
      const receta = RECETAS_SONIDO[ids[i]];
      const variantes: AudioBuffer[] = [];
      for (let v = 0; v < receta.variantes; v++) {
        const muestras = receta.generar(tasa, v);
        const buffer = contexto.createBuffer(1, muestras.length, tasa);
        buffer.copyToChannel(muestras as Float32Array<ArrayBuffer>, 0);
        variantes.push(buffer);
      }
      this.buffers.set(ids[i], variantes);
      alProgreso((i + 1) / ids.length);
      if (i % 4 === 3) await cederHilo();
    }
  }

  /** Devuelvo una variante al azar, pero nunca la misma dos veces seguidas. */
  obtener(id: IdSonido): AudioBuffer | null {
    const lista = this.buffers.get(id);
    if (!lista || lista.length === 0) return null;
    if (lista.length === 1) return lista[0];
    const anterior = this.ultimaVariante.get(id) ?? -1;
    let indice = Math.floor(Math.random() * lista.length);
    if (indice === anterior) indice = (indice + 1) % lista.length;
    this.ultimaVariante.set(id, indice);
    return lista[indice];
  }
}
