// El programador corre en tiempo de juego y sus LIMPIEZAS se ejecutan siempre
// (al vencer o al cancelar). Si esto se rompe, vuelven los ecos que quedaban
// escuchando para siempre después de morir.
import { describe, expect, it } from 'vitest';
import { Programador } from '../../src/nucleo/Programador';

describe('Programador', () => {
  it('ejecuta las tareas cuando pasa el tiempo de juego, en orden', () => {
    const p = new Programador();
    const orden: string[] = [];
    p.despues(2, () => orden.push('b'));
    p.despues(1, () => orden.push('a'));
    p.actualizar(0.5);
    expect(orden).toEqual([]);
    p.actualizar(2);
    expect(orden).toEqual(['a', 'b']);
  });

  it('cancelarTodo ejecuta las limpiezas pendientes pero no las tareas normales', () => {
    const p = new Programador();
    const hechas: string[] = [];
    p.despues(5, () => hechas.push('tarea'));
    p.limpiarDespues(15, () => hechas.push('limpieza'));
    p.cancelarTodo();
    expect(hechas).toEqual(['limpieza']);
    p.actualizar(20);
    expect(hechas).toEqual(['limpieza']);
  });

  it('cancelarGrupo solo limpia su grupo', () => {
    const p = new Programador();
    const hechas: string[] = [];
    p.limpiarDespues(10, () => hechas.push('a'), 'a');
    p.limpiarDespues(10, () => hechas.push('b'), 'b');
    p.cancelarGrupo('a');
    expect(hechas).toEqual(['a']);
    p.actualizar(11);
    expect(hechas).toEqual(['a', 'b']);
  });
});
