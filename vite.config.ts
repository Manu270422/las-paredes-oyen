// Aquí configuro Vite, que es solo mi servidor de desarrollo y empaquetador.
// No es un motor de juego: únicamente sirve los archivos y genera la versión final.
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// La versión de esta compilación (config/Compilacion.ts): la de package.json + los 7 primeros caracteres del
// commit. Vercel expone VERCEL_GIT_COMMIT_SHA al compilar; si no está (en local), dice "+local".
const paquete = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

export default defineConfig({
  define: { __COMPILACION__: JSON.stringify(`${paquete.version}+${commit || 'local'}`) },
  // Uso rutas relativas para poder empaquetar después con Tauri (PC) o Capacitor (móvil).
  base: './',
  server: {
    // Con host: true puedo abrir el juego desde mi celular en la misma red Wi-Fi.
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    // Three.js pesa, así que subo el límite del aviso de tamaño.
    chunkSizeWarningLimit: 1500,
  },
});
