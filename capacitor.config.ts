// Aquí configuro Capacitor, que envuelve el juego web (la carpeta dist/) en una app de Android.
// El juego no cambia: es el mismo HTML, WebGL y Web Audio, servido desde dentro del APK (funciona sin internet).
//
// appId es la identidad de la app en Google Play: se puede cambiar libremente hasta la PRIMERA subida a la
// Play Console. Después queda fija para siempre (cambiarla es publicar otra app).
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elmundodemanu.lasparedesoyen',
  appName: 'Las Paredes Oyen',
  webDir: 'dist',
  android: {
    // Fondo negro mientras carga: nada de destellos blancos en un juego de terror.
    backgroundColor: '#050505',
  },
};

export default config;
