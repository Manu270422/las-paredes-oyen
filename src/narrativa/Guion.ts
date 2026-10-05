// Aquí están los momentos escritos a mano (el "guion"), separados del
// director procedural. El director improvisa; el guion marca los golpes
// de la historia que deben ocurrir siempre:
// - La primera medición y los tres golpes que la interrumpen.
// - Lo que aparece en cada grabación.
// - La luz que vuelve... y el apagón que avanza hacia mí.
// - El final en el 402.
// Todo se basa en condiciones y banderas, así funciona igual al cargar partida.
import type { ContextoJuego } from '../nucleo/ContextoJuego';
import type { AccionesGuion } from './AccionesGuion';
import { ejecutarSecuenciaFinal } from './SecuenciaFinal';
import { muroCercano } from '../director/eventos/Ayudas';
import { CONFIG } from '../config/ConfiguracionJuego';

export class Guion {
  private tiempo = 0;
  private tiempoTablero = -1;
  private readonly hechos = new Set<string>();
  private readonly cancelaciones: Array<() => void> = [];

  constructor(private readonly acciones: AccionesGuion) {}

  /** Me engancho a los eventos del bus. Lo hago una vez al construir el juego. */
  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('medicion', (m) => {
        if (m.estado === 'inicio') this.alIniciarMedicion(m.apartamento, ctx);
      }),
      ctx.bus.on('bandera', ({ nombre }) => this.alBandera(nombre, ctx)),
    );
  }

  reiniciar(ctx: ContextoJuego): void {
    this.tiempo = 0;
    this.tiempoTablero = ctx.progreso.tiene('tablero_activado') ? 0 : -1;
    this.hechos.clear();
  }

  private unaVez(id: string): boolean {
    if (this.hechos.has(id)) return false;
    this.hechos.add(id);
    return true;
  }

  private pista(ctx: ContextoJuego, id: string, texto: string): void {
    if (ctx.progreso.tiene(`pista:${id}`)) return;
    ctx.progreso.marcar(`pista:${id}`);
    ctx.bus.emit('pista', { id, texto });
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.tiempo += dt;
    const p = ctx.progreso;

    if (this.tiempo > 1 && this.unaVez('tarjeta') && !p.tiene('leyo:orden_trabajo')) {
      ctx.bus.emit('tarjeta', { titulo: 'Edificio Almendros', subtitulo: 'Piso 4 · 11:48 p. m.' });
    }
    if (this.tiempo > 6 && !ctx.linterna.encendida) this.pista(ctx, 'linterna', 'Pulsa {linterna} para encender la linterna.');
    if (this.tiempo > 12 && p.tiene('leyo:orden_trabajo')) this.pista(ctx, 'agacharse', 'Agachado ({agacharse}) haces menos ruido y abres las puertas despacio.');

    // El apagón: la luz volvió, y al entrar al pasillo las lámparas mueren una por una hacia mí.
    if (this.tiempoTablero >= 0) this.tiempoTablero += dt;
    if (
      p.tiene('tablero_activado') &&
      !p.tiene('apagon_pasillo') &&
      this.tiempoTablero > 9 &&
      ctx.memoria.habitacionActual === 'pasillo' &&
      this.unaVez('apagon')
    ) {
      this.apagon(ctx);
    }
  }

  private alIniciarMedicion(apartamento: string, ctx: ContextoJuego): void {
    if (apartamento === '401' && !ctx.progreso.tiene('medido:401')) {
      this.pista(ctx, 'respirar', 'No te muevas. Si respiras agitado, la grabadora lo capta: mantén {aguantar} para contener la respiración.');
      // La lección: tres golpes, justo a mi lado, mientras no me puedo mover.
      ctx.programador.despues(2.6, () => {
        if (!ctx.grabadora.midiendo) return;
        const j = ctx.jugador.posicion;
        const muro = muroCercano(ctx, { x: j.x, z: j.z });
        if (!muro) return;
        ctx.bus.emit('sonido-relevante', { descripcion: 'tres golpes en la pared', x: muro.x, z: muro.z });
        for (let i = 0; i < 3; i++) {
          ctx.audio.reproducir('golpe', { bus: 'entidad', posicion: { x: muro.x, y: 1.3, z: muro.z }, dentroPared: true, volumen: 0.9, retraso: i * 0.36 });
        }
        ctx.jugador.sumarEstres(0.25);
      });
    }
  }

  private alBandera(nombre: string, ctx: ContextoJuego): void {
    switch (nombre) {
      case 'leyo:orden_trabajo':
        ctx.director.activo = true;
        break;
      case 'medido:401':
        this.reproducirTranscripcion('401', ctx, () => {
          ctx.entidad.puedeManifestarse = true;
          this.pista(ctx, 'paredes', 'Las paredes llevan el sonido. Camina por el centro de los cuartos.');
          ctx.programador.despues(20, () => this.pista(ctx, 'senuelo', 'Pulsa {senuelo} para dejar la grabadora reproduciendo tus pasos. Te buscará a ella.'));
        });
        break;
      case 'medido:403':
        this.reproducirTranscripcion('403', ctx, () => {
          this.pista(ctx, 'escuchar', 'Mantén {escuchar} para escuchar con atención: oirás a través de los muros.');
        });
        break;
      case 'tablero_activado':
        this.tiempoTablero = 0;
        ctx.nivel.aplicarLuzDe(nombre);
        ctx.bus.emit('subtitulo', { texto: 'La luz vuelve. Por un momento, el edificio parece solo un edificio.', duracion: 4 });
        break;
      case 'medido:402':
        ejecutarSecuenciaFinal(ctx, this.acciones);
        break;
    }
  }

  /**
   * Reproduzco la cinta: las líneas de la historia MÁS lo que el micrófono
   * captó de verdad durante la medición (la segunda realidad).
   */
  private reproducirTranscripcion(id: string, ctx: ContextoJuego, alTerminar: () => void): void {
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

  /** Las lámparas del pasillo revientan una a una, desde la más lejana hacia mí. */
  private apagon(ctx: ContextoJuego): void {
    const j = ctx.jugador.posicion;
    // Las lámparas que revientan son las que el paquete rompe con esta bandera.
    const reventadas = ctx.piso.luzPorBandera.apagon_pasillo?.lamparas ?? {};
    const lamparas = ctx.nivel.lamparas
      .filter((l) => l.id in reventadas)
      .sort((a, b) => b.posicion.distanceTo(j) - a.posicion.distanceTo(j));
    ctx.director.bloquear(20);
    lamparas.forEach((lampara, i) => {
      ctx.programador.despues(1 + i * 0.95, () => {
        lampara.interferir(0.3);
        const p = lampara.posicion;
        ctx.audio.reproducir('chispa', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 0.9 });
        ctx.programador.despues(0.3, () => lampara.fijarEstado('rota'));
      });
    });
    const final = 1 + lamparas.length * 0.95 + 0.8;
    ctx.programador.despues(final, () => {
      ctx.progreso.marcar('apagon_pasillo');
      // Aparece en el extremo del pasillo más lejano al jugador.
      const C = CONFIG.celda;
      const extremos = [{ x: 5.5 * C, z: 10.5 * C }, { x: 26.5 * C, z: 10.5 * C }];
      const pj = ctx.jugador.posicion;
      const lejos = extremos.sort((a, b) => Math.hypot(b.x - pj.x, b.z - pj.z) - Math.hypot(a.x - pj.x, a.z - pj.z))[0];
      ctx.entidad.puedeManifestarse = true;
      ctx.entidad.manifestar(lejos.x, lejos.z, ctx);
      ctx.entidad.cambiarEstado('acechando', ctx);
      ctx.director.forzarFase('pico', ctx);
      this.pista(ctx, 'verla', 'Si la ves, no hagas ruido.');
    });
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones) cancelar();
    this.cancelaciones.length = 0;
  }
}
