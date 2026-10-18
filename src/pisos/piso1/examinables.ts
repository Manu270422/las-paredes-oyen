// Aquí está lo que se examina en el Piso 1 sin llevárselo (tanda 4): dos cosas de la planta baja que cuentan, sin
// explicarlo, cómo el edificio dejó de mirar. Cada una deja una línea flotando (sin panel, sin pausar).
// BORRADOR (2026-10-17): estos textos los revisa el creador.
import type { DefExaminable } from '../TiposPiso';

export const EXAMINABLES: Record<string, DefExaminable> = {
  // En los casilleros del vestíbulo: el correo que nadie volvió a bajar a buscar.
  buzones: {
    modelo: 'sobres',
    texto: 'Mirar los buzones',
    linea: 'Cartas que nadie recogió desde marzo. La casilla del 402 ya no cierra de tantas.',
  },
  // El televisor chico de la portería: lo que hacía el edificio cuando se oían los gritos del 402.
  televisor_porteria: {
    modelo: 'ninguno',
    texto: 'Mirar el televisor',
    linea: 'Un televisor pequeño, apagado. El volumen quedó en el máximo.',
  },
};
