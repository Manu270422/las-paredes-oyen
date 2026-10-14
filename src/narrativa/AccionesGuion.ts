// Aquí defino lo que el guion puede pedirle al juego principal y que no
// pertenece a ningún sistema en particular (cámara, fundidos, final).

export interface AccionesGuion {
  /** Pongo a la criatura frente a la cámara con el grito. */
  mostrarSusto(): void;
  /** Fundido a negro (true) o desde negro (false). */
  fundido(aNegro: boolean, segundos: number): void;
  /** Solo puedo mirar, no moverme (momentos guionizados). */
  fijarSoloMirar(activo: boolean): void;
  /** La partida terminó: la pantalla final, con una línea por cada piso completado. La pide el último piso. */
  terminarPartida(): void;
  /**
   * El piso queda completado pero la partida sigue: el jugador despierta en el punto que dice su paquete. Así
   * termina el Piso 4; su resumen sale en una tarjeta breve la primera vez que baja de él.
   */
  despertar(): void;
  /**
   * El piso queda completado y la partida sigue AQUÍ, sin moverme ni despertar en otro lado. Así termina el Piso 3:
   * la reja de abajo se abre y bajo caminando. Su resumen sale la primera vez que salgo de él.
   */
  completarPiso(): void;
}
