// El guion del Piso 2 (P2-guion) sin navegador: grabar el cuarto sordo trae su cinta y con ella la llave, y una
// partida guardada al medir carga con la cinta ya sonada. La cabina detenida (que completa el piso) se prueba en
// cabinaDetenida.test.ts y, caminando, en cabinaDetenida.spec y piso1.spec.
import { describe, expect, it } from 'vitest';
import { Progreso } from '../../src/narrativa/Progreso';
import type { ContextoJuego } from '../../src/nucleo/ContextoJuego';
import { PISO_2 } from '../../src/pisos/piso2';
import { CINTA_202, GuionPiso2 } from '../../src/pisos/piso2/guion';
import { crearContextoFalso } from './contextoFalso';

function armar(banderas: readonly string[] = []) {
  const falso = crearContextoFalso();
  const progreso = new Progreso(falso.bus, PISO_2.objetivos, PISO_2.reglas);
  progreso.importar({ banderas: ['llego:piso2', ...banderas], inventario: [], documentos: [] });
  const subtitulos: string[] = [];
  const acciones: string[] = [];
  falso.bus.on('subtitulo', (s) => subtitulos.push(s.texto));
  let agendado: Array<() => void> = [];
  const correrAgendado = () => {
    for (let vuelta = 0; vuelta < 5 && agendado.length; vuelta++) {
      const ahora = agendado;
      agendado = [];
      for (const f of ahora) f();
    }
  };
  const entidad = { estado: 'cazando', puedeManifestarse: true, cambiarEstado(e: string) { this.estado = e; } };
  const ctx = {
    ...falso.ctx,
    piso: PISO_2,
    progreso,
    entidad,
    programador: { ahora: 0, despues: (_t: number, f: () => void) => agendado.push(f), secuencia: (l: Array<[number, () => void]>) => l.forEach(([, f]) => agendado.push(f)) },
    director: { bloquear: () => undefined, activo: true },
    nivel: { ascensor: { marco: { cx: 6.5, cz: 14.3 } } },
    grabadora: { captura: { lineas: () => [] } },
  } as unknown as ContextoJuego;
  const anotar = (n: string) => () => acciones.push(n);
  const guion = new GuionPiso2({
    mostrarSusto: anotar('susto'),
    fundido: (a: boolean) => acciones.push(`fundido:${a}`),
    fijarSoloMirar: (a: boolean) => acciones.push(`soloMirar:${a}`),
    terminarPartida: anotar('terminar'),
    despertar: anotar('despertar'),
    completarPiso: anotar('completar'),
  });
  guion.conectar(ctx);
  guion.reiniciar(ctx);
  return { ctx, progreso, subtitulos, acciones, entidad, correrAgendado, bus: falso.bus };
}

describe('El guion del Piso 2 (P2-guion, tanda 1)', () => {
  it('el orden de los objetivos: el libro, grabar, la llave (que trae la cinta) y bajar al 1', () => {
    expect(PISO_2.objetivos.map((o) => o.id)).toEqual(['llegar', 'averiguar', 'grabar', 'llave', 'bajar']);
    const llave = PISO_2.mapa.interactuables.find((i) => i.id === 'llaveServicio');
    expect(llave?.aparece, 'la llave aparece al terminar la cinta: no se puede bajar sin grabar').toBe(CINTA_202);
  });

  it('una partida guardada al medir (antes de la cinta) carga con la cinta ya sonada, en silencio', () => {
    const { progreso } = armar(['leyo:libro_quejas', 'medido:202']);
    expect(progreso.tiene(CINTA_202)).toBe(true);
  });
});
