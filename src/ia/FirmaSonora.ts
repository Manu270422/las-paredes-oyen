// Aquí está la FIRMA SONORA de El Inquilino: cómo suena según lo que hace.
// El jugador casi nunca la ve, así que su estado tiene que OÍRSE:
//
// - EN LAS PAREDES: cuando va rápido hacia un ruido, algo grande roza el yeso
//   por dentro del muro. "Viene hacia donde sonó eso."
// - INVESTIGANDO: se detiene y le crujen las articulaciones. Está escuchando.
// - CAZANDO: un jadeo ronco que sale de su cuerpo. En una persecución, el
//   jadeo dice DÓNDE está: sin él, correr a ciegas es injusto.
// - ACECHANDO: casi nada. Una respiración lentísima que solo se oye de cerca,
//   y el edificio se calla a su alrededor. Su firma es el SILENCIO.
// - RETIRADA: un pie que se arrastra, cansado. En la falsa retirada el
//   arrastre para... y nunca se oye cómo se hunde en la pared. Esa es la pista.
//
// Es una tabla de datos: afinar la firma es cambiar números, no código.
// OJO: esto se afina con audífonos puestos, no mirando el código.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { FuenteSonido } from '../audio/FuenteSonido';
import type { IdSonido } from '../audio/TiposAudio';
import type { Entidad } from './Entidad';
import type { NombreEstadoIA } from './TiposIA';
import { aleatorio } from '../utilidades/Matematicas';

interface Bucle {
  id: IdSonido;
  volumen: number;
  /** Altura de la fuente (la respiración sale de la cabeza, a ~2 m). */
  altura: number;
  distanciaReferencia: number;
  caida: number;
}

interface Detalle {
  id: IdSonido;
  /** Segundos entre uno y otro (al azar dentro del rango). */
  cada: [number, number];
  volumen: number;
  altura: number;
  dentroPared?: boolean;
  /** Solo si se mueve al menos a esta velocidad (m/s). */
  velocidadMinima?: number;
  /** Solo si está quieta. */
  soloQuieta?: boolean;
  /** Más lejos que esto del jugador no suena (no gasto sonidos que nadie oye). */
  distanciaMaxima: number;
  /** Solo cuando el director permite que se note su presencia (no antes de la historia). */
  requierePresencia?: boolean;
  /** Para los subtítulos de efectos (accesibilidad). */
  descripcion: string;
}

interface Firma {
  bucle?: Bucle;
  detalles: readonly Detalle[];
  /** Cerca de ella el ambiente se apaga hasta "factor" (1 = nada, 0 = silencio total). */
  silencio?: { radio: number; factor: number };
}

const FIRMAS: Record<NombreEstadoIA, Firma> = {
  paredes: {
    detalles: [
      { id: 'friccion_muro', cada: [3, 6], volumen: 0.45, altura: 1.1, dentroPared: true, velocidadMinima: 1.2, distanciaMaxima: 12, requierePresencia: true, descripcion: 'algo grande roza el muro por dentro' },
    ],
  },
  investigando: {
    detalles: [
      { id: 'chasquido', cada: [3.5, 7], volumen: 0.5, altura: 1.95, soloQuieta: true, distanciaMaxima: 14, descripcion: 'un crujido de huesos' },
    ],
  },
  cazando: {
    bucle: { id: 'jadeo_entidad', volumen: 0.75, altura: 1.9, distanciaReferencia: 1.5, caida: 1 },
    detalles: [],
  },
  acechando: {
    bucle: { id: 'respira_acecho', volumen: 0.3, altura: 1.95, distanciaReferencia: 0.8, caida: 1.7 },
    detalles: [
      { id: 'chasquido', cada: [7, 13], volumen: 0.3, altura: 1.95, soloQuieta: true, distanciaMaxima: 9, descripcion: 'un crujido de huesos, cerca' },
    ],
    silencio: { radio: 9, factor: 0.3 },
  },
  retirada: {
    detalles: [
      { id: 'arrastre', cada: [1.4, 2.4], volumen: 0.4, altura: 0.1, velocidadMinima: 0.4, distanciaMaxima: 16, descripcion: 'algo se arrastra, alejándose' },
    ],
  },
};

export class FirmaSonora {
  private estado: NombreEstadoIA | null = null;
  private bucle: FuenteSonido | null = null;
  private temporizadores: number[] = [];
  private readonly anterior = { x: 0, z: 0 };
  private velocidad = 0;

  actualizar(dt: number, entidad: Entidad, ctx: ContextoJuego): void {
    const p = entidad.posicion;
    // Mido mi velocidad real (en las paredes no uso "avanzar", así que no la tengo de otra forma).
    const recorrido = Math.hypot(p.x - this.anterior.x, p.z - this.anterior.z);
    this.velocidad = dt > 0 && recorrido < 5 ? recorrido / dt : 0;
    this.anterior.x = p.x;
    this.anterior.z = p.z;

    const estado = entidad.estado;
    if (estado !== this.estado) this.cambiar(estado);
    if (!estado) return;
    const firma = FIRMAS[estado];
    const distancia = entidad.distanciaAlJugador(ctx);

    this.actualizarBucle(firma, entidad, ctx);
    this.actualizarDetalles(dt, firma, entidad, ctx, distancia);

    // El silencio que la rodea: más fuerte cuanto más cerca estoy.
    const s = firma.silencio;
    const cercania = s && entidad.fisica && distancia < s.radio ? 1 - distancia / s.radio : 0;
    ctx.audio.fijarSilencioEntidad(s ? 1 - (1 - s.factor) * Math.min(1, cercania * 1.6) : 1);
  }

  /** Apago todo lo que suena (reinicio, muerte, menú). */
  detener(ctx: ContextoJuego): void {
    this.bucle?.detener(0.3);
    this.bucle = null;
    this.estado = null;
    this.temporizadores = [];
    ctx.audio.fijarSilencioEntidad(1);
  }

  private cambiar(estado: NombreEstadoIA | null): void {
    this.estado = estado;
    this.bucle?.detener(0.4);
    this.bucle = null;
    // El primer detalle no suena de inmediato: dejo que el cambio de estado se note por sí solo.
    this.temporizadores = estado ? FIRMAS[estado].detalles.map((d) => aleatorio(d.cada[0] * 0.5, d.cada[1] * 0.5)) : [];
  }

  private actualizarBucle(firma: Firma, entidad: Entidad, ctx: ContextoJuego): void {
    const b = firma.bucle;
    if (!b || !entidad.fisica) {
      if (this.bucle) {
        this.bucle.detener(0.4);
        this.bucle = null;
      }
      return;
    }
    const p = entidad.posicion;
    // Si alguien detuvo todos los sonidos (recarga, muerte), lo vuelvo a crear.
    if (!this.bucle || this.bucle.terminada) {
      this.bucle = ctx.audio.reproducir(b.id, {
        bus: 'entidad',
        bucle: true,
        volumen: b.volumen,
        posicion: { x: p.x, y: b.altura, z: p.z },
        distanciaReferencia: b.distanciaReferencia,
        caida: b.caida,
        reverb: 0.35,
        variacion: 0.05,
      });
      return;
    }
    this.bucle.moverA(p.x, b.altura, p.z);
  }

  private actualizarDetalles(dt: number, firma: Firma, entidad: Entidad, ctx: ContextoJuego, distancia: number): void {
    const quieta = this.velocidad < 0.1;
    firma.detalles.forEach((d, i) => {
      this.temporizadores[i] -= dt;
      if (this.temporizadores[i] > 0) return;
      this.temporizadores[i] = aleatorio(...d.cada);
      if (distancia > d.distanciaMaxima) return;
      if (d.velocidadMinima !== undefined && this.velocidad < d.velocidadMinima) return;
      if (d.soloQuieta && !quieta) return;
      if (d.requierePresencia && !ctx.director.permitePresencia) return;
      if (d.dentroPared) {
        entidad.sonarEnPared(d.id, ctx, d.volumen, d.descripcion);
        return;
      }
      const p = entidad.posicion;
      ctx.audio.reproducir(d.id, { bus: 'entidad', posicion: { x: p.x, y: d.altura, z: p.z }, volumen: d.volumen, reverb: 0.45 });
      ctx.bus.emit('sonido-relevante', { descripcion: d.descripcion, x: p.x, z: p.z });
    });
  }
}
