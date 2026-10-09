// Aquí está el GUION DEL PISO 3 (propuesta P3-guion). Los golpes de la historia que pasan siempre:
// - Al llegar: a los 8 s, tres golpes despacio desde la pared del cuarto de Andrés ("para que yo sepa que oyó").
// - La libreta: cuando leí su cuaderno y las dos hojas que le arrancaron (en cualquier orden), marco
//   'imitacion:piso3' (la regla del paquete: desde ahí la criatura imita completo) y digo lo que se nota al
//   ponerlas juntas. Con ella revienta la única luz del piso: la emergencia de la escalera.
// - Grabar la pared del cuarto de Andrés (medido:302) y su cinta.
// - Al volver al pasillo, ella está de pie entre la escalera y yo.
// - En la escalera, a oscuras: tres golpes desde el Piso 2, y la partida termina.
// Todo se basa en banderas, así funciona igual al cargar partida.
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { AccionesGuion } from '../../narrativa/AccionesGuion';
import { reproducirCinta } from '../../narrativa/Cinta';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { GuionPiso } from '../TiposPiso';

/** Las tres partes de la libreta: el cuaderno del 302 y las dos hojas que le arrancaron. */
export const PARTES_LIBRETA = ['libreta_302', 'hoja_301', 'hoja_303'] as const;
/** La bandera que cierra la libreta. Con ella la criatura llega a la imitación completa (y la escalera se apaga). */
export const LIBRETA_COMPLETA = 'imitacion:piso3';
/** Lo que pienso al juntar las tres: la letra de la última página no es la de las otras. */
export const REFLEXION_LIBRETA = 'Las hojas son del mismo cuaderno. La última página no la escribió Andrés.';
/** Terminó de sonar la cinta del cuarto de Andrés: desde aquí ella espera en el pasillo. */
export const CINTA_302 = 'cinta:302';
/** Empezó el final, en la escalera. */
export const FINAL_PISO_3 = 'final:piso3';
/** Lo último que se oye en el piso. */
export const GOLPES_FINALES = 'Abajo, detrás de la reja, alguien golpea tres veces. Despacio. Para que sepas que oyó.';
/** Segundos de juego (no de lectura: leyendo no corre) entre cerrar la última parte y la reflexión. */
const PAUSA_REFLEXION = 1.2;
/** Segundos desde llegar hasta los tres golpes de bienvenida. */
const GOLPE_LLEGADA = 8;
/** La pared de las rayas, en el dormitorio del 302 (celdas): de ahí salen los golpes. */
const PARED_ANDRES = { x: 11.5, y: 17 };

export class GuionPiso3 implements GuionPiso {
  private readonly cancelaciones: Array<() => void> = [];
  /** Cuenta atrás hasta la reflexión. Negativa: no hay nada que decir. */
  private reflexion = -1;
  private tiempo = 0;
  private enFinal = false;

  constructor(private readonly acciones: AccionesGuion) {}

  conectar(ctx: ContextoJuego): void {
    this.cancelaciones.push(
      ctx.bus.on('bandera', ({ nombre }) => {
        if (nombre.startsWith('leyo:')) this.revisarLibreta(ctx, true);
        else if (nombre === LIBRETA_COMPLETA) ctx.programador.despues(3, () => this.apagon(ctx));
        else if (nombre === 'medido:302') reproducirCinta('302', ctx, () => ctx.progreso.marcar(CINTA_302));
      }),
    );
  }

  desconectar(): void {
    for (const cancelar of this.cancelaciones.splice(0)) cancelar();
  }

  reiniciar(ctx: ContextoJuego): void {
    this.reflexion = -1;
    this.tiempo = 0;
    this.enFinal = false;
    // Leer la última parte puede crear un punto de control, y el juego guarda ANTES de que yo oiga la bandera:
    // esa partida llega con las tres leídas y sin 'imitacion:piso3'. La marco aquí, en silencio (al cargar no
    // hay nada nuevo que anunciar: el juego anuncia el objetivo después de reiniciarme).
    this.revisarLibreta(ctx, false);
    // Lo mismo con la cinta: medir guarda antes de que suene. Si cargo ahí, la cinta ya "sonó".
    if (ctx.progreso.tiene('medido:302') && !ctx.progreso.tiene(CINTA_302)) ctx.progreso.marcarSilencioso(CINTA_302);
  }

  actualizar(dt: number, ctx: ContextoJuego): void {
    this.tiempo += dt;
    const p = ctx.progreso;
    if (this.reflexion >= 0) {
      this.reflexion -= dt;
      if (this.reflexion < 0) ctx.bus.emit('subtitulo', { texto: REFLEXION_LIBRETA, duracion: 5 });
    }
    if (this.tiempo > GOLPE_LLEGADA && !p.tiene('golpe:llegada')) this.golpesDeBienvenida(ctx);
    if (p.tiene(CINTA_302) && !p.tiene('pasillo:302') && ctx.memoria.habitacionActual === 'pasillo' && ctx.entidad.estado === 'paredes') {
      this.esperarEnElPasillo(ctx);
    }
    if (p.tiene(CINTA_302) && !this.enFinal && ctx.memoria.habitacionActual === 'escalera') this.final(ctx);
  }

  /** Si ya están leídas las tres partes y la libreta no está cerrada, la cierro. */
  private revisarLibreta(ctx: ContextoJuego, enVivo: boolean): void {
    const p = ctx.progreso;
    if (p.tiene(LIBRETA_COMPLETA) || !PARTES_LIBRETA.every((id) => p.tiene(`leyo:${id}`))) return;
    if (!enVivo) {
      p.marcarSilencioso(LIBRETA_COMPLETA);
      return;
    }
    p.marcar(LIBRETA_COMPLETA);
    this.reflexion = PAUSA_REFLEXION;
  }

  /** Tres golpes, despacio, desde la pared del cuarto de Andrés: lejos y apagados por los muros, con su dirección. */
  private golpesDeBienvenida(ctx: ContextoJuego): void {
    ctx.progreso.marcarSilencioso('golpe:llegada');
    const C = CONFIG.celda;
    const x = PARED_ANDRES.x * C;
    const z = PARED_ANDRES.y * C;
    ctx.bus.emit('sonido-relevante', { descripcion: 'tres golpes, despacio, lejos', x, z });
    for (let i = 0; i < 3; i++) {
      ctx.audio.reproducir('golpe', { bus: 'entidad', posicion: { x, y: 1.2, z }, dentroPared: true, volumen: 1, retraso: i * 0.9 });
    }
  }

  /** La única luz del piso revienta, lejos, en la escalera. No la veo: lo descubro al volver. */
  private apagon(ctx: ContextoJuego): void {
    const luz = ctx.nivel.lamparas.find((l) => l.id === 'emergencia');
    if (!luz || luz.estado === 'rota') return;
    luz.interferir(0.3);
    const p = luz.posicion;
    ctx.audio.reproducir('chispa', { posicion: { x: p.x, y: p.y, z: p.z }, volumen: 1 });
    ctx.bus.emit('sonido-relevante', { descripcion: 'algo revienta, lejos, en la escalera', x: p.x, z: p.z });
    ctx.bus.emit('interferencia', { intensidad: 0.35, duracion: 0.6 });
    ctx.linterna.forzarApagada(0.7);
    ctx.programador.despues(0.3, () => ctx.nivel.aplicarLuzDe(LIBRETA_COMPLETA));
  }

  /**
   * Al volver al pasillo después de la cinta, ella está de pie entre la escalera y yo, acechando. El pasillo mide
   * una celda: no se pasa a su lado. Hay que alejarla con la grabadora, o iluminarla quieto hasta que se retire.
   */
  private esperarEnElPasillo(ctx: ContextoJuego): void {
    const j = ctx.jugador.posicion;
    const C = CONFIG.celda;
    const z = 10.5 * C;
    const x = Math.max(5.5 * C, j.x - 7);
    if (j.x - x < 4.5) return;
    const salida = ctx.entidad.buscarPuntoSalida(x, z, ctx, 5, 2) ?? { x, z };
    ctx.progreso.marcar('pasillo:302');
    ctx.entidad.puedeManifestarse = true;
    ctx.entidad.manifestar(salida.x, salida.z, ctx);
    ctx.entidad.cambiarEstado('acechando', ctx);
    ctx.director.bloquear(30);
    ctx.bus.emit('sonido-relevante', { descripcion: 'algo espera en el pasillo, hacia la escalera', x: salida.x, z: salida.z });
    ctx.bus.emit('pista', { id: 'pasillo302', texto: 'Está entre tú y la escalera. Deja la grabadora ({senuelo}) lejos de ella, o ilumínala quieto hasta que se vaya.' });
  }

  /** En la escalera, a oscuras: tres golpes desde abajo, detrás de la reja del Piso 2. Y la partida termina. */
  private final(ctx: ContextoJuego): void {
    this.enFinal = true;
    ctx.progreso.marcar(FINAL_PISO_3);
    ctx.director.bloquear(60);
    ctx.director.activo = false;
    ctx.entidad.puedeManifestarse = false;
    if (ctx.entidad.estado !== 'paredes') ctx.entidad.cambiarEstado('paredes', ctx);
    this.acciones.fijarSoloMirar(true);
    const C = CONFIG.celda;
    const abajo = { x: 1.5 * C, y: -1.5, z: 11.8 * C };
    ctx.programador.secuencia(
      [
        ...[1.2, 2.1, 3.0].map((t) => [t, () => ctx.audio.reproducir('golpe', { bus: 'entidad', posicion: abajo, volumen: 0.9 })] as [number, () => void]),
        [3.6, () => ctx.bus.emit('subtitulo', { texto: GOLPES_FINALES, duracion: 5, tipo: 'efecto' })],
        [8.2, () => this.acciones.fundido(true, 1.5)],
        [10.2, () => {
          this.acciones.fijarSoloMirar(false);
          this.acciones.terminarPartida();
        }],
      ],
      'final',
    );
  }
}
