// Aquí está la pantalla de "usa audífonos". Además de preparar al jugador,
// cumple una función técnica: el navegador exige un toque o tecla para
// activar el audio y la pantalla completa. Este es ese primer gesto.
import { ICONOS } from '../Iconos';
import { Pantalla } from './Pantalla';

export class PantallaInicio extends Pantalla {
  constructor() {
    super('inicio');
    this.elemento.setAttribute('role', 'button');
    this.elemento.setAttribute('tabindex', '0');
    this.elemento.innerHTML = `
      <div class="inicio__icono">${ICONOS.audifonos}</div>
      <p class="inicio__texto">Este juego se escucha. Usa audífonos.</p>
      <p class="inicio__nota">El sonido es tu única forma de saber dónde está.</p>
      <div class="inicio__continuar"></div>`;
  }

  /** Espero el primer gesto del jugador (toque, clic, tecla o botón del mando). */
  esperarGesto(hayMando: () => boolean): Promise<void> {
    const aviso = this.elemento.querySelector('.inicio__continuar') as HTMLDivElement;
    const tactil = window.matchMedia('(pointer: coarse)').matches;
    aviso.textContent = tactil ? 'Toca para continuar' : 'Pulsa cualquier tecla para continuar';
    return new Promise((resolver) => {
      let terminado = false;
      const terminar = () => {
        if (terminado) return;
        terminado = true;
        window.removeEventListener('keydown', terminar);
        this.elemento.removeEventListener('pointerup', terminar);
        resolver();
      };
      window.addEventListener('keydown', terminar);
      this.elemento.addEventListener('pointerup', terminar);
      // El mando no genera gestos válidos para el audio en todos los navegadores,
      // pero lo acepto igual: el audio se reanudará en el siguiente clic/toque.
      const revisarMando = () => {
        if (terminado) return;
        if (hayMando()) terminar();
        else requestAnimationFrame(revisarMando);
      };
      requestAnimationFrame(revisarMando);
    });
  }
}
