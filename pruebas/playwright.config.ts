// Pruebas en el juego REAL: un navegador abre el servidor de desarrollo y un
// piloto camina con W, apunta la mirada y pulsa E, como una persona.
// Por defecto uso el Chrome que ya está instalado (no descargo nada).
// Otro navegador: PRUEBAS_NAVEGADOR=msedge  o  PRUEBAS_NAVEGADOR=chromium
// (este último requiere `npx playwright install chromium`).
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const PUERTO = 5174;
// trim(): en cmd, `set X=msedge && ...` deja un espacio al final del valor.
const navegador = process.env.PRUEBAS_NAVEGADOR?.trim() || 'chrome';

export default defineConfig({
  testDir: './recorridos',
  // El juego tarda en generar sonidos y texturas; el recorrido completo dura ~2 min.
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: navegador === 'chromium' ? undefined : navegador,
    headless: true,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      // WebGL sin GPU (SwiftShader) y audio sin exigir un clic real.
      args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    // Un puerto distinto al de `npm run dev` para no chocar con una sesión abierta.
    command: `npx vite --port ${PUERTO} --strictPort`,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
