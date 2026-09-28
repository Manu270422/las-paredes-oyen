// Aquí guardo mis íconos como SVG en línea. No uso emojis porque cada
// sistema los dibuja distinto y se ven amateur. Estos escalan perfecto
// en cualquier pantalla y toman el color del texto (currentColor).

const envolver = (contenido: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;

export const ICONOS = {
  mano: envolver(
    '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5"/><path d="M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14"/><path d="M17 12.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-4.9-2.6L4 15.5a1.6 1.6 0 0 1 2.6-1.9L8 15"/>',
  ),
  linterna: envolver(
    '<path d="M9 2h6l-1 5h-4z"/><path d="M10 7h4v13a2 2 0 0 1-4 0z"/><path d="M12 11v2"/><path d="M5 4l2 1.5M19 4l-2 1.5M12 0.5v0"/>',
  ),
  agacharse: envolver(
    '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5 9 12l4 2.5-1.5 6"/><path d="M9 12l-3 1.5M13 14.5l3.5 1.5 1 4.5"/><path d="M4 21h16"/>',
  ),
  respiracion: envolver(
    '<path d="M12 4v7"/><path d="M12 11c-1.5 0-3-1.5-3-3"/><path d="M12 11c1.5 0 3-1.5 3-3"/><path d="M9 8C6 8 4 11 4 15c0 3 1 5 3 5s3-2 3-5v-4"/><path d="M15 8c3 0 5 3 5 7 0 3-1 5-3 5s-3-2-3-5v-4"/>',
  ),
  oido: envolver(
    '<path d="M6 9a6 6 0 0 1 12 0c0 3-2 4-3 6s-1 4-3.5 5.5A3 3 0 0 1 7 18"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3.5"/>',
  ),
  cinta: envolver(
    '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><circle cx="16" cy="11" r="2"/><path d="M10 11h4M6 19l2-4h8l2 4"/>',
  ),
  pausa: envolver('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  audifonos: envolver(
    '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  ),
  girar: envolver(
    '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/><path d="M20 8a8 8 0 0 1 0 8"/><path d="M18.5 16.5 20 16l.5 1.5"/>',
  ),
  cerrar: envolver('<path d="M6 6l12 12M18 6 6 18"/>'),
  flechaIzq: envolver('<path d="M15 5l-7 7 7 7"/>'),
  flechaDer: envolver('<path d="M9 5l7 7-7 7"/>'),
  bateria: envolver('<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/>'),
} as const;

export type NombreIcono = keyof typeof ICONOS;
