// Las sesiones de prueba guardadas en el navegador (telemetria/AlmacenTelemetria.ts): al cambiar el formato
// (v2: dificultad y versión de la compilación) las sesiones viejas se migran, nunca se pierden. Importa: los
// probadores del Gate 1 tienen sesiones v1 que hay que poder exportar después de actualizar el juego.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlmacenTelemetria } from '../../src/telemetria/AlmacenTelemetria';

let memoria: Map<string, string>;
beforeEach(() => {
  memoria = new Map();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, v),
      removeItem: (k: string) => void memoria.delete(k),
    },
  });
});

const sesionV1 = {
  version: 1,
  id: 'vieja',
  inicio: '2026-10-01T20:00:00.000Z',
  duracion: 600,
  duracionReal: 700,
  terminada: 'fin',
  puntoInicio: 'escalera',
  entorno: { entrada: 'teclado', tactil: false, calidad: 'alta', aspecto: 1.78, hrtf: true },
  eventos: [],
  curva: [],
  contadores: {},
  resumen: null,
};

describe('Sesiones de telemetría guardadas', () => {
  it('una sesión v1 sube a v2: jugó Normal (lo único que existía) y su versión no se anotaba', () => {
    memoria.set('las-paredes-oyen:telemetria', JSON.stringify([sesionV1]));
    const [s] = new AlmacenTelemetria().cargar();
    expect(s.version).toBe(2);
    expect(s.entorno).toEqual({ ...sesionV1.entorno, dificultad: 'normal', compilacion: 'desconocida' });
    expect(s.id).toBe('vieja');
  });

  it('las v2 quedan como están, y lo que no es una sesión se descarta', () => {
    const v2 = { ...sesionV1, id: 'nueva', version: 2, entorno: { ...sesionV1.entorno, dificultad: 'dificil', compilacion: '0.1.0+abc1234' } };
    memoria.set('las-paredes-oyen:telemetria', JSON.stringify([v2, null, 'basura', { version: 9 }]));
    expect(new AlmacenTelemetria().cargar()).toEqual([v2]);
  });
});
