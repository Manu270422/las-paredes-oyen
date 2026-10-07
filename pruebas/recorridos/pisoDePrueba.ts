// Un piso de prueba para el motor de cambio de piso: el plano del Piso 4 con otro id, sin guion ni rastros, con
// un objetivo propio y una escalera que sube de vuelta al Piso 4. NO está en el catálogo (nadie lo juega):
// lo usa cambioPiso.spec.ts, que lo carga en la página con import() y baja a él con el viaje por escalera
// del juego (ViajeEscalera). Así pruebo el
// motor sin esperar al Piso 3 (y sin que un error del Piso 3 se confunda con uno del motor).
import { PISO_4 } from '../../src/pisos/piso4';
import type { PaquetePiso } from '../../src/pisos/TiposPiso';

export const PISO_DE_PRUEBA: PaquetePiso = {
  ...PISO_4,
  id: 'pruebaAbajo',
  nombre: 'Piso de prueba',
  objetivos: [{ id: 'prueba', texto: 'Subir de vuelta por la escalera', bandera: 'hizo:prueba' }],
  // El director y la criatura no despiertan aquí: lo que pruebo es el viaje, no un encuentro.
  reglas: { directorDesde: 'nunca', despiertaCon: 'nunca', imitacionCompletaCon: 'nunca' },
  puntosControl: {},
  puntosControlMayores: [],
  luzPorBandera: {},
  rastros: [],
  guion: undefined,
  siguiente: undefined,
  // El tramo que sube (el de la derecha, al este del descanso): arranca en la celda (3, 10), al borde del hueco.
  escaleras: [{ id: 'subida', hacia: 'piso4', llegada: 'escalera', x: 3.5, y: 10.8, texto: 'Subir al Piso 4' }],
};
