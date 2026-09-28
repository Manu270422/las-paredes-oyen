// Aquí guardo el "gancho" de sonido de la interfaz. Los componentes lo llaman
// sin saber nada del motor de audio; el GestorUI lo conecta al arrancar.

export type TipoSonidoUI = 'pasar' | 'pulsar' | 'volver';

let reproductor: ((tipo: TipoSonidoUI) => void) | null = null;

export function conectarSonidoUI(funcion: (tipo: TipoSonidoUI) => void): void {
  reproductor = funcion;
}

export function sonarUI(tipo: TipoSonidoUI): void {
  reproductor?.(tipo);
}
