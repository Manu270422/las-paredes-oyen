// Aquí defino lo que el guion puede pedirle al juego principal y que no
// pertenece a ningún sistema en particular (cámara, fundidos, final).

export interface AccionesGuion {
  /** Pongo a la criatura frente a la cámara con el grito. */
  mostrarSusto(): void;
  /** Fundido a negro (true) o desde negro (false). */
  fundido(aNegro: boolean, segundos: number): void;
  /** Solo puedo mirar, no moverme (momentos guionizados). */
  fijarSoloMirar(activo: boolean): void;
  terminarDemo(): void;
}
