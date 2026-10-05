// La tarjeta discreta de lugar: sale UNA vez por apartamento al cruzar a él, nunca al aparecer, y una
// partida nueva (que borra las banderas) la vuelve a mostrar. Con los datos reales del Piso 4.
import { describe, expect, it } from 'vitest';
import { BusEventos } from '../../src/nucleo/BusEventos';
import type { MapaEventos } from '../../src/nucleo/Eventos';
import { conectarAnuncioLugares } from '../../src/narrativa/AnuncioLugares';
import { Progreso } from '../../src/narrativa/Progreso';
import { PISO_INICIAL as PISO } from '../../src/pisos/catalogo';
import type { PaquetePiso } from '../../src/pisos/TiposPiso';

function armar(piso: PaquetePiso = PISO) {
  const bus = new BusEventos<MapaEventos>();
  const progreso = new Progreso(bus, piso.objetivos, piso.reglas);
  const nivel = { habitacionPorId: (id: string) => piso.mapa.habitaciones.find((h) => h.id === id) };
  conectarAnuncioLugares(bus, piso, nivel, progreso);
  const tarjetas: MapaEventos['tarjeta'][] = [];
  bus.on('tarjeta', (t) => tarjetas.push(t));
  const cruzar = (anterior: string | null, actual: string) => bus.emit('habitacion-cambiada', { anterior, actual });
  return { progreso, tarjetas, cruzar };
}

describe('Anuncio de lugar al entrar a un apartamento', () => {
  it('al cruzar del pasillo a la sala del 401 sale "Apartamento 401", discreta y sin subtítulo', () => {
    const { tarjetas, cruzar, progreso } = armar();
    cruzar('pasillo', 'sala401');
    expect(tarjetas).toEqual([{ titulo: 'Apartamento 401', subtitulo: '', estilo: 'discreta' }]);
    expect(progreso.tiene('lugar:401')).toBe(true);
  });

  it('sale una sola vez: volver a entrar, o pasar a otro cuarto del mismo apartamento, no la repite', () => {
    const { tarjetas, cruzar } = armar();
    cruzar('pasillo', 'sala401');
    cruzar('sala401', 'dormitorio401');
    cruzar('dormitorio401', 'sala401');
    cruzar('sala401', 'pasillo');
    cruzar('pasillo', 'sala401');
    expect(tarjetas.map((t) => t.titulo)).toEqual(['Apartamento 401']);
  });

  it('cada apartamento tiene la suya', () => {
    const { tarjetas, cruzar } = armar();
    cruzar('pasillo', 'sala401');
    cruzar('pasillo', 'sala403');
    cruzar('pasillo', 'sala402');
    expect(tarjetas.map((t) => t.titulo)).toEqual(['Apartamento 401', 'Apartamento 403', 'Apartamento 402']);
  });

  it('al aparecer (sin cuarto anterior: partida nueva, Continuar, reintento) no sale nada', () => {
    const { tarjetas, cruzar } = armar();
    cruzar(null, 'sala401');
    expect(tarjetas).toEqual([]);
  });

  it('los cuartos que no son de un apartamento no anuncian nada', () => {
    const { tarjetas, cruzar } = armar();
    cruzar('escalera', 'pasillo');
    cruzar('pasillo', 'servicio');
    expect(tarjetas).toEqual([]);
  });

  it('una placa sin "lugar" no tiene tarjeta', () => {
    const sinLugar: PaquetePiso = { ...PISO, placas: PISO.placas?.map(({ puerta, texto }) => ({ puerta, texto })) };
    const { tarjetas, cruzar } = armar(sinLugar);
    cruzar('pasillo', 'sala401');
    expect(tarjetas).toEqual([]);
  });

  it('una partida nueva borra lugar:401 con las demás banderas, y la tarjeta vuelve a salir', () => {
    const { tarjetas, cruzar, progreso } = armar();
    cruzar('pasillo', 'sala401');
    progreso.importar(null); // lo que hace Juego.cargarDesdePunto con una partida nueva
    expect(progreso.tiene('lugar:401')).toBe(false);
    cruzar('pasillo', 'sala401');
    expect(tarjetas.map((t) => t.titulo)).toEqual(['Apartamento 401', 'Apartamento 401']);
  });
});
