// Aquí tengo mi bus de eventos tipado. Los sistemas se comunican publicando
// mensajes en vez de llamarse directamente: así el audio no necesita conocer
// a la IA, ni la IA a la interfaz. Cada cosa en su lugar.

type Manejador<T> = (datos: T) => void;

export class BusEventos<Mapa extends object> {
  private readonly manejadores = new Map<keyof Mapa, Set<Manejador<never>>>();

  /** Me suscribo a un evento. Devuelvo la función para cancelar la suscripción. */
  on<K extends keyof Mapa>(evento: K, manejador: Manejador<Mapa[K]>): () => void {
    let conjunto = this.manejadores.get(evento);
    if (!conjunto) {
      conjunto = new Set();
      this.manejadores.set(evento, conjunto);
    }
    conjunto.add(manejador as Manejador<never>);
    return () => this.off(evento, manejador);
  }

  off<K extends keyof Mapa>(evento: K, manejador: Manejador<Mapa[K]>): void {
    this.manejadores.get(evento)?.delete(manejador as Manejador<never>);
  }

  emit<K extends keyof Mapa>(evento: K, datos: Mapa[K]): void {
    const conjunto = this.manejadores.get(evento);
    if (!conjunto) return;
    // Copio la lista por si alguien se desuscribe mientras recorro.
    for (const manejador of [...conjunto]) (manejador as Manejador<Mapa[K]>)(datos);
  }
}
