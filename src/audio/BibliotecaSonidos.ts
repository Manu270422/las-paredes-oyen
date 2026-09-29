// Aquí genero y guardo todos los buffers de audio (con sus variantes).
// Lo hago una sola vez durante la carga, luego reproducir es instantáneo.
//
// PIPELINE HÍBRIDO: primero sintetizo TODO (así el juego siempre suena, aunque
// falte un archivo). Después leo "audio/manifiesto.json" y, para cada IdSonido
// que tenga grabaciones reales, las cargo y decodifico. Si una grabación
// falla (no existe, formato raro, sin red), ese sonido se queda con su síntesis.
// Cambiar un sonido sintético por foley real = soltar el archivo y una línea
// en el manifiesto. El resto del juego no se entera.
//
// Formato del manifiesto (public/audio/manifiesto.json):
// {
//   "sonidos": {
//     "paso_granito": { "archivos": ["pasos/granito_1.ogg", "pasos/granito_2.ogg"] },
//     "golpe":        { "archivos": ["golpe_pared.ogg"], "mezcla": "sumar", "ganancia": 0.8 }
//   }
// }
// - "mezcla": "reemplazar" (por defecto) usa solo las grabaciones;
//   "sumar" las agrega como variantes extra de la síntesis.
// - "ganancia": multiplico las muestras al cargar (para igualar niveles).
import type { IdSonido } from './TiposAudio';
import { RECETAS_SONIDO } from './sintesis/RecetasSonidos';
import { cederHilo } from '../utilidades/Esperar';

const RUTA_MANIFIESTO = 'audio/manifiesto.json';
/** Si el manifiesto no responde en este tiempo, sigo solo con síntesis (no bloqueo la carga). */
const ESPERA_MANIFIESTO_MS = 4000;

interface EntradaManifiesto {
  archivos: string[];
  mezcla?: 'reemplazar' | 'sumar';
  ganancia?: number;
}

interface Manifiesto {
  sonidos?: Partial<Record<string, EntradaManifiesto>>;
}

/** De dónde salió cada sonido (para depurar y para saber qué falta grabar). */
export type OrigenSonido = 'sintesis' | 'grabacion' | 'mixto';

export class BibliotecaSonidos {
  private readonly buffers = new Map<IdSonido, AudioBuffer[]>();
  private readonly ultimaVariante = new Map<IdSonido, number>();
  readonly origen = new Map<IdSonido, OrigenSonido>();

  async generar(contexto: BaseAudioContext, alProgreso: (p: number) => void): Promise<void> {
    // Pido el manifiesto en paralelo con la síntesis: la red no espera a la CPU.
    const manifiesto = this.leerManifiesto();
    await this.sintetizar(contexto, (p) => alProgreso(p * 0.85));
    await this.cargarGrabaciones(contexto, await manifiesto, (p) => alProgreso(0.85 + p * 0.15));
    alProgreso(1);
  }

  private async sintetizar(contexto: BaseAudioContext, alProgreso: (p: number) => void): Promise<void> {
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
      this.origen.set(ids[i], 'sintesis');
      alProgreso((i + 1) / ids.length);
      if (i % 4 === 3) await cederHilo();
    }
  }

  private async leerManifiesto(): Promise<Manifiesto | null> {
    const control = new AbortController();
    const reloj = window.setTimeout(() => control.abort(), ESPERA_MANIFIESTO_MS);
    try {
      const respuesta = await fetch(RUTA_MANIFIESTO, { signal: control.signal, cache: 'no-cache' });
      if (!respuesta.ok) return null;
      return (await respuesta.json()) as Manifiesto;
    } catch {
      // Sin manifiesto (o sin red): el juego suena igual, con síntesis.
      return null;
    } finally {
      window.clearTimeout(reloj);
    }
  }

  private async cargarGrabaciones(contexto: BaseAudioContext, manifiesto: Manifiesto | null, alProgreso: (p: number) => void): Promise<void> {
    const entradas = Object.entries(manifiesto?.sonidos ?? {}).filter((e): e is [string, EntradaManifiesto] => {
      const [id, entrada] = e;
      if (!(id in RECETAS_SONIDO)) {
        console.warn(`[audio] El manifiesto nombra "${id}", que no es un sonido del juego.`);
        return false;
      }
      return Array.isArray(entrada?.archivos) && entrada.archivos.length > 0;
    });
    for (let i = 0; i < entradas.length; i++) {
      const [id, entrada] = entradas[i] as [IdSonido, EntradaManifiesto];
      const cargados = await Promise.all(entrada.archivos.map((ruta) => this.decodificar(contexto, `audio/${ruta}`, entrada.ganancia ?? 1)));
      const validos = cargados.filter((b): b is AudioBuffer => b !== null);
      alProgreso((i + 1) / entradas.length);
      if (validos.length === 0) continue;
      if (entrada.mezcla === 'sumar') {
        this.buffers.set(id, [...(this.buffers.get(id) ?? []), ...validos]);
        this.origen.set(id, 'mixto');
      } else {
        this.buffers.set(id, validos);
        this.origen.set(id, 'grabacion');
      }
      this.ultimaVariante.delete(id);
    }
  }

  private async decodificar(contexto: BaseAudioContext, ruta: string, ganancia: number): Promise<AudioBuffer | null> {
    try {
      const respuesta = await fetch(ruta);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const buffer = await contexto.decodeAudioData(await respuesta.arrayBuffer());
      if (ganancia !== 1) {
        for (let c = 0; c < buffer.numberOfChannels; c++) {
          const datos = buffer.getChannelData(c);
          for (let i = 0; i < datos.length; i++) datos[i] *= ganancia;
        }
      }
      return buffer;
    } catch (error) {
      console.warn(`[audio] No pude cargar "${ruta}"; uso la síntesis.`, error);
      return null;
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
