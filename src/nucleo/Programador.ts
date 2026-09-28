// Aquí programo acciones "dentro de X segundos" usando el TIEMPO DEL JUEGO.
// No uso setTimeout porque si el jugador pausa, los sustos programados
// seguirían corriendo. Con esto, al pausar se congela todo.
//
// Además tengo LIMPIEZAS: tareas que deshacen algo temporal (por ejemplo,
// una suscripción al bus que solo debe durar 15 s). Una limpieza se ejecuta
// SIEMPRE: cuando vence o cuando cancelo su grupo o todo (muerte, menú).
// Así nada queda "colgado" entre partidas.

interface Tarea {
  id: number;
  momento: number;
  accion: () => void;
  grupo: string;
  limpieza: boolean;
}

export class Programador {
  private tiempo = 0;
  private siguienteId = 1;
  private tareas: Tarea[] = [];
  /** El momento de la tarea más próxima: si no ha llegado, no recorro la lista. */
  private proximo = Infinity;

  get ahora(): number {
    return this.tiempo;
  }

  /** Ejecuto "accion" dentro de "segundos". El grupo me permite cancelar secuencias completas. */
  despues(segundos: number, accion: () => void, grupo = 'general'): number {
    return this.agregar(segundos, accion, grupo, false);
  }

  /**
   * Programo una limpieza: se ejecuta al vencer O si cancelo su grupo / todo.
   * Regla: una limpieza solo deshace cosas, nunca programa tareas nuevas.
   */
  limpiarDespues(segundos: number, accion: () => void, grupo = 'general'): number {
    return this.agregar(segundos, accion, grupo, true);
  }

  private agregar(segundos: number, accion: () => void, grupo: string, limpieza: boolean): number {
    const id = this.siguienteId++;
    const momento = this.tiempo + segundos;
    this.tareas.push({ id, momento, accion, grupo, limpieza });
    this.proximo = Math.min(this.proximo, momento);
    return id;
  }

  /** Programo una secuencia de pasos con sus tiempos relativos al inicio. */
  secuencia(pasos: ReadonlyArray<readonly [number, () => void]>, grupo = 'general'): void {
    for (const [momento, accion] of pasos) this.despues(momento, accion, grupo);
  }

  /** Quito una tarea sin ejecutarla (ni siquiera si es limpieza: la cancelo a propósito). */
  cancelar(id: number): void {
    this.tareas = this.tareas.filter((t) => t.id !== id);
  }

  cancelarGrupo(grupo: string): void {
    const limpiezas = this.tareas.filter((t) => t.grupo === grupo && t.limpieza);
    this.tareas = this.tareas.filter((t) => t.grupo !== grupo);
    for (const tarea of limpiezas) tarea.accion();
    this.recalcularProximo();
  }

  cancelarTodo(): void {
    const limpiezas = this.tareas.filter((t) => t.limpieza);
    this.tareas = [];
    this.proximo = Infinity;
    for (const tarea of limpiezas) tarea.accion();
  }

  actualizar(dt: number): void {
    this.tiempo += dt;
    if (this.tiempo < this.proximo) return;
    // Saco las tareas vencidas antes de ejecutarlas (una tarea puede programar otras).
    const vencidas = this.tareas.filter((t) => t.momento <= this.tiempo);
    this.tareas = this.tareas.filter((t) => t.momento > this.tiempo);
    this.recalcularProximo();
    vencidas.sort((a, b) => a.momento - b.momento);
    for (const tarea of vencidas) tarea.accion();
  }

  private recalcularProximo(): void {
    let minimo = Infinity;
    for (const t of this.tareas) if (t.momento < minimo) minimo = t.momento;
    this.proximo = minimo;
  }
}
