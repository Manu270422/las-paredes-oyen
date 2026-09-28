// Aquí tengo una pausa asíncrona. La uso durante la carga para soltar el hilo
// principal un momento entre tareas pesadas y así la barra de progreso se actualiza.

export function cederHilo(ms = 0): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, ms));
}
