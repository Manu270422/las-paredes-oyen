// Aquí está la dificultad de la partida en curso: la actual, con la que empezó y la más baja que se jugó. La
// más baja es la que cuentan el final y el perfil: bajar no se castiga, pero el registro es honesto.
//
// También decide qué pasa con el guardado (un solo hueco, ver guardado/SistemaGuardado):
// - una partida que no guarda (Pesadilla) no escribe ni borra nada;
// - si se baja desde Pesadilla en plena partida, se empieza a guardar en el PRÓXIMO punto de control (el
//   juego lo hace al marcarlo); hasta entonces, morir sigue siendo empezar de cero.
import { DIFICULTAD_POR_DEFECTO, masFacil, NOMBRE_DIFICULTAD, TABLA_DIFICULTAD, type IdDificultad } from '../config/Dificultad';
import type { DatosPartida, SistemaGuardado } from '../guardado/SistemaGuardado';
import type { ContextoJuego } from './ContextoJuego';

export class DificultadPartida {
  actual: IdDificultad = DIFICULTAD_POR_DEFECTO;
  private inicial: IdDificultad = DIFICULTAD_POR_DEFECTO;
  private masBajaJugada: IdDificultad = DIFICULTAD_POR_DEFECTO;

  constructor(private readonly guardado: SistemaGuardado) {}

  /**
   * Una partida nueva. "desdeCero": es empezar de cero tras morir sin guardado propio (Pesadilla, o recién
   * bajada de Pesadilla): sigo sin guardar hasta el primer punto de control, como estaba.
   */
  empezar(id: IdDificultad, ctx: ContextoJuego, desdeCero: boolean): void {
    this.actual = this.inicial = this.masBajaJugada = id;
    ctx.dificultad = TABLA_DIFICULTAD[id];
    if (!desdeCero) this.guardado.fijarSinGuardado(ctx.dificultad.puntosControl === 'ninguno');
  }

  /** Retomo una partida guardada ("Continuar" o reintentar): su dificultad y su historia. */
  retomar(datos: DatosPartida, ctx: ContextoJuego): void {
    this.actual = datos.dificultad;
    this.inicial = datos.dificultadInicial;
    this.masBajaJugada = datos.dificultadMasBaja;
    ctx.dificultad = TABLA_DIFICULTAD[this.actual];
    this.guardado.fijarSinGuardado(false);
  }

  /**
   * La cambio en plena partida (Ajustes). Se aplica al instante. Si la partida ya tiene guardado propio, lo
   * actualizo ahora: así morir o "Continuar" no me devuelven a la anterior.
   */
  cambiar(id: IdDificultad, ctx: ContextoJuego): void {
    if (id === this.actual) return;
    const sinGuardadoPropio = this.guardado.sinGuardado;
    this.actual = id;
    this.masBajaJugada = masFacil(this.masBajaJugada, id);
    ctx.dificultad = TABLA_DIFICULTAD[id];
    // Sin guardado propio (Pesadilla) el guardado no escribe nada: la partida guardada es de otra y no se toca.
    const guardada = this.guardado.cargar();
    if (guardada) this.guardado.guardar({ ...guardada, ...this.campos });
    const desdeAhora = sinGuardadoPropio && ctx.dificultad.puntosControl !== 'ninguno' ? ' La partida se guarda desde el próximo punto de control.' : '';
    ctx.bus.emit('subtitulo', { texto: `Ahora juegas en ${NOMBRE_DIFICULTAD[id]}.${desdeAhora}`, duracion: 5 });
  }

  /** Lo que se guarda en la partida. */
  get campos(): Pick<DatosPartida, 'dificultad' | 'dificultadInicial' | 'dificultadMasBaja'> {
    return { dificultad: this.actual, dificultadInicial: this.inicial, dificultadMasBaja: this.masBajaJugada };
  }

  /** La que cuenta en el final y en el perfil. */
  get masBaja(): IdDificultad {
    return this.masBajaJugada;
  }

  /** Para el final: "Difícil", o "Difícil → Normal" si se bajó. */
  get texto(): string {
    const inicial = NOMBRE_DIFICULTAD[this.inicial];
    return this.masBajaJugada === this.inicial ? inicial : `${inicial} → ${NOMBRE_DIFICULTAD[this.masBajaJugada]}`;
  }
}
