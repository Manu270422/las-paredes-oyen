// Aquí está lo que se examina en el Piso 3 sin llevárselo: tres cosas de Andrés en el 302. Cada una deja una
// línea flotando (sin panel, sin pausar): lo que se ve, no lo que significa.
import type { DefExaminable } from '../TiposPiso';

export const EXAMINABLES: Record<string, DefExaminable> = {
  // Recostado junto a las rayas de estatura: con él lo medían. Arriba hay rayas que nadie numeró.
  medidor_302: {
    modelo: 'palo',
    texto: 'Mirar el palo de escoba',
    linea: 'Un palo de escoba marcado con lápiz. Las últimas rayas no tienen número.',
  },
  // En el piso del dormitorio: en esa casa no se podía hacer ruido.
  carrito_302: {
    modelo: 'carrito',
    texto: 'Mirar el carrito',
    linea: 'Un carrito de plástico. Le arrancaron las ruedas para que no hiciera ruido.',
  },
  // Pegado en la sala, encima del sofá: lo que Andrés dibujaba de la pared de su cuarto.
  dibujo_302: {
    modelo: 'dibujo',
    texto: 'Mirar el dibujo',
    linea: 'Un niño de palitos y, detrás, alguien muy alto sin cara. Abajo dice: «el que mide».',
  },
};
