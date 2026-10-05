// Aquí anuncio dónde entré: la primera vez en la partida que cruzo a un apartamento que tiene placa con
// "lugar", aparece una tarjeta discreta ("Apartamento 401"). Es para orientarse, no un momento de cine:
// pequeña, abajo y breve, para no tapar un cuarto oscuro donde puede estar la criatura.
//
// "La primera vez" la recuerda una bandera de progreso (lugar:<apartamento>): sobrevive a morir y a
// Continuar, y una partida nueva la borra con todas las demás.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { Nivel } from '../mundo/Nivel';
import type { PaquetePiso } from '../pisos/TiposPiso';
import type { Progreso } from './Progreso';

/** El prefijo de las banderas que recuerdan qué apartamentos ya se anunciaron (la telemetría las ignora). */
const PREFIJO_LUGAR = 'lugar:';

export function conectarAnuncioLugares(
  bus: BusEventos<MapaEventos>,
  piso: PaquetePiso,
  nivel: Pick<Nivel, 'habitacionPorId'>,
  progreso: Pick<Progreso, 'tiene' | 'marcar'>,
): void {
  // Cada placa con "lugar" es la de su apartamento (lo comprueba paquetesDePiso: su puerta da a él).
  const lugares = new Map((piso.placas ?? []).flatMap((p) => (p.lugar ? [[p.texto, p.lugar] as const] : [])));
  bus.on('habitacion-cambiada', ({ anterior, actual }) => {
    // Sin cuarto anterior es que acabo de aparecer (partida nueva, Continuar o reintento): no crucé nada.
    if (anterior === null) return;
    const apartamento = nivel.habitacionPorId(actual)?.apartamento;
    const lugar = apartamento ? lugares.get(apartamento) : undefined;
    if (!apartamento || !lugar) return;
    const bandera = PREFIJO_LUGAR + apartamento;
    if (progreso.tiene(bandera)) return;
    progreso.marcar(bandera);
    bus.emit('tarjeta', { titulo: lugar, subtitulo: '', estilo: 'discreta' });
  });
}
