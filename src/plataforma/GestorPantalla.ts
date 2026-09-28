// Aquí controlo todo lo relacionado con la pantalla: tamaño real, orientación,
// pantalla completa y el bloqueo en horizontal. El juego SIEMPRE es horizontal;
// si el celular está vertical, aviso al jugador y pauso.

type OyentePantalla = () => void;

interface OrientacionBloqueable {
  lock?: (orientacion: string) => Promise<void>;
}

export class GestorPantalla {
  ancho = 1;
  alto = 1;
  private readonly oyentes = new Set<OyentePantalla>();

  constructor() {
    this.medir();
    const alCambiar = () => {
      this.medir();
      for (const oyente of this.oyentes) oyente();
    };
    window.addEventListener('resize', alCambiar);
    window.addEventListener('orientationchange', alCambiar);
    // visualViewport detecta cuando aparece/desaparece la barra del navegador en móviles.
    window.visualViewport?.addEventListener('resize', alCambiar);
    document.addEventListener('fullscreenchange', alCambiar);
  }

  private medir(): void {
    // Uso el viewport visual si existe: es el tamaño que el jugador ve realmente.
    const vista = window.visualViewport;
    this.ancho = Math.max(1, Math.round(vista?.width ?? window.innerWidth));
    this.alto = Math.max(1, Math.round(vista?.height ?? window.innerHeight));
  }

  get esVertical(): boolean {
    return this.alto > this.ancho;
  }

  get esPantallaCompleta(): boolean {
    return document.fullscreenElement !== null;
  }

  alCambiar(oyente: OyentePantalla): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /**
   * Pido pantalla completa y bloqueo la orientación en horizontal.
   * Debe llamarse dentro de un toque o clic del jugador (los navegadores lo exigen).
   * En iPhone Safari no existe el bloqueo: ahí depende del aviso de orientación.
   */
  async entrarPantallaCompleta(): Promise<void> {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      // Algunos navegadores lo niegan; el juego sigue funcionando igual.
    }
    try {
      const orientacion = screen.orientation as ScreenOrientation & OrientacionBloqueable;
      await orientacion.lock?.('landscape');
    } catch {
      // El bloqueo solo funciona en pantalla completa y en ciertos navegadores.
    }
  }

  async salirPantallaCompleta(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Nada que hacer.
    }
  }
}
