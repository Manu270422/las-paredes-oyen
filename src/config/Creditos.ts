// Los créditos del juego: el estudio, quién lo creó y con qué ayuda. Decisión del creador (2026-10-14): el estudio
// es "El Mundo de Manu" y se ve en todas partes (menú, créditos, pantalla final); él firma como creador y director;
// la ayuda de IA va en la sección de tecnología, no como crédito de autoría. Los usan la pantalla de créditos (desde
// el menú), la pantalla final del juego y el pie del menú principal.
export const CREDITOS = {
  titulo: 'Las paredes oyen',
  estudio: 'El Mundo de Manu',
  /** Si se deja vacío, la línea "Creado y dirigido por" desaparece de las dos pantallas. */
  autor: 'Carlos Manuel Turizo Hernández',
  ayudaIA: 'Desarrollado con asistencia de IA (Claude, de Anthropic)',
} as const;

/** Las líneas de autoría, en orden: el estudio y, si hay nombre, quién lo creó y dirigió. */
export function lineasDeAutoria(): string[] {
  const lineas = [`Desarrollado por ${CREDITOS.estudio}`];
  const autor: string = CREDITOS.autor;
  if (autor) lineas.push(`Creado y dirigido por ${autor}`);
  return lineas;
}
