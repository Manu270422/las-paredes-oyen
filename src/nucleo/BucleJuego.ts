// Aquí está el latido del juego: el bucle que se ejecuta cada fotograma.
// Uso paso variable con límite: si el navegador se congela (cambio de pestaña,
// móvil lento) nunca simulo un salto enorme que atraviese paredes.

export type FuncionFotograma = (dt: number, tiempoTotal: number) => void;

export class BucleJuego {
  private idAnimacion = 0;
  private ultimo = 0;
  private tiempoTotal = 0;
  private corriendo = false;
  /** Duración del último fotograma real (para medir rendimiento). */
  dtReal = 0;

  constructor(
    private readonly alFotograma: FuncionFotograma,
    private readonly dtMaximo = 1 / 20,
  ) {}

  iniciar(): void {
    if (this.corriendo) return;
    this.corriendo = true;
    this.ultimo = performance.now();
    const paso = (ahora: number) => {
      if (!this.corriendo) return;
      this.dtReal = Math.max(0, (ahora - this.ultimo) / 1000);
      this.ultimo = ahora;
      const dt = Math.min(this.dtReal, this.dtMaximo);
      this.tiempoTotal += dt;
      this.alFotograma(dt, this.tiempoTotal);
      this.idAnimacion = requestAnimationFrame(paso);
    };
    this.idAnimacion = requestAnimationFrame(paso);
  }

  detener(): void {
    this.corriendo = false;
    cancelAnimationFrame(this.idAnimacion);
  }
}
