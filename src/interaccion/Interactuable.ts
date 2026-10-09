// Aquí defino qué es "algo con lo que puedo interactuar": una puerta,
// un documento, unas pilas, el tablero... Todos cumplen este contrato
// y el SistemaInteraccion los trata igual.
import { Mesh, MeshBasicMaterial, SphereGeometry, type Object3D, type Vector3 } from 'three';
import type { ContextoJuego } from '../nucleo/ContextoJuego';

export interface Interactuable {
  readonly id: string;
  /** Raíz 3D del objeto (lo que detecta el rayo de la mirada). */
  readonly objeto: Object3D;
  /** Si es false, no se puede enfocar (por ejemplo, ya lo recogí). */
  readonly activo: boolean;
  /**
   * La celda del mapa donde está el objeto, si ocupa una (una puerta). El chequeo "¿hay un muro en
   * medio?" no la cuenta como obstáculo: el objeto está dentro de ella y no puede taparse a sí mismo.
   */
  readonly celdaPropia?: { readonly gx: number; readonly gy: number };
  /** Dónde mirarlo (si no es el origen de `objeto`): el cono de asistencia apunta aquí. */
  puntoInteraccion?(destino: Vector3): Vector3;
  /** Texto de la acción que muestro en pantalla. */
  texto(ctx: ContextoJuego): string;
  interactuar(ctx: ContextoJuego): void;
  /** Vuelvo al estado inicial (al cargar un punto de control). */
  restablecer?(ctx: ContextoJuego): void;
  /** Se acaba de marcar esa bandera en plena partida (un objeto que aparece con ella, aparece ya). */
  alBandera?(nombre: string, ctx: ContextoJuego): void;
}

// Material invisible pero "golpeable" por el rayo. No escribe color ni profundidad.
const materialZona = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

/**
 * Creo una zona de toque generosa alrededor de objetos pequeños.
 * En pantallas táctiles apuntar a unas pilas de 5 cm sería frustrante:
 * esto es UX, no trampa.
 */
export function crearZonaToque(radio: number): Mesh {
  const zona = new Mesh(new SphereGeometry(radio, 8, 6), materialZona);
  zona.name = 'zona-toque';
  return zona;
}

/** Marco un objeto 3D para saber a qué interactuable pertenece al recibir el rayo. */
export function vincular(objeto: Object3D, interactuable: Interactuable): void {
  objeto.userData.interactuable = interactuable;
}
