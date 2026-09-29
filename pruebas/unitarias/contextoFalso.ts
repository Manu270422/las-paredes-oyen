// Un contexto de juego mínimo para probar lógica sin navegador: bus real,
// reloj controlado y un audio que solo anota lo que se pidió reproducir.
// Cada prueba agrega (con "extra") solo las piezas que necesita.
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import type { MapaEventos, Ruido } from '../../src/nucleo/Eventos';
import type { IdSonido, OpcionesSonido } from '../../src/audio/TiposAudio';
import type { ObservadorSonido } from '../../src/audio/MotorAudio';
import { BusEventos } from '../../src/nucleo/BusEventos';

export interface Falso {
  ctx: ContextoJuego;
  bus: BusEventos<MapaEventos>;
  reloj: { ahora: number };
  sonidos: IdSonido[];
  ruidos: Ruido[];
  /** Hago sonar algo "en el mundo" (lo reciben los observadores del audio, como la grabadora). */
  sonar(id: IdSonido, opciones: OpcionesSonido): void;
}

export function crearContextoFalso(extra: Record<string, unknown> = {}): Falso {
  const bus = new BusEventos<MapaEventos>();
  const reloj = { ahora: 0 };
  const sonidos: IdSonido[] = [];
  const ruidos: Ruido[] = [];
  const observadores = new Set<ObservadorSonido>();
  bus.on('ruido', (r) => ruidos.push(r));
  const audio = {
    reproducir: (id: IdSonido) => {
      sonidos.push(id);
      return null;
    },
    observar: (o: ObservadorSonido) => {
      observadores.add(o);
      return () => observadores.delete(o);
    },
  };
  const programador = {
    get ahora() {
      return reloj.ahora;
    },
  };
  const jugador = { posicion: { x: 0, y: 0, z: 0 }, yaw: 0, sumarEstres: () => undefined };
  const ctx = { bus, audio, programador, jugador, ...extra } as unknown as ContextoJuego;
  return {
    ctx,
    bus,
    reloj,
    sonidos,
    ruidos,
    sonar: (id, opciones) => {
      for (const o of observadores) o(id, opciones);
    },
  };
}
