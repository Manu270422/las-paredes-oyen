// Aquí configuro Vite, que es solo mi servidor de desarrollo y empaquetador.
// No es un motor de juego: únicamente sirve los archivos y genera la versión final.
import { defineConfig } from 'vite';

export default defineConfig({
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
