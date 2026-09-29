// Pruebas de lógica pura (sin navegador): reglas del director, respiración,
// la cinta de la grabadora, el programador... Corren en Node en segundos.
// Vive en pruebas/ a propósito: `npm run build` y Vercel nunca lo cargan.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    include: ['pruebas/unitarias/**/*.test.ts'],
    environment: 'node',
  },
});
