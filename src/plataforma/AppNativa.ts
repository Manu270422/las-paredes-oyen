// Aquí conecto lo que solo existe dentro de la app de Android (Capacitor). En el navegador no hace nada.
// - El botón "atrás" del sistema: en juego pausa, en los menús vuelve. Sin esto, Android cerraba la app de
//   golpe en plena partida.
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function conectarAppNativa(atras: () => void): void {
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener('backButton', () => atras());
}
