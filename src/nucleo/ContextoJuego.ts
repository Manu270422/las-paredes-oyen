// Aquí defino el "contexto": el paquete de referencias a todos los sistemas
// que le paso a quien necesite actuar sobre el juego (eventos del director,
// estados de la IA, objetos interactuables...). Solo son tipos: no crea nada.
import type { PerspectiveCamera, Scene } from 'three';
import type { BusEventos } from './BusEventos';
import type { MapaEventos } from './Eventos';
import type { Programador } from './Programador';
import type { GestorAjustes } from '../config/Ajustes';
import type { GestorEntrada } from '../entrada/GestorEntrada';
import type { MotorAudio } from '../audio/MotorAudio';
import type { AmbienteSonoro } from '../audio/AmbienteSonoro';
import type { Nivel } from '../mundo/Nivel';
import type { Jugador } from '../jugador/Jugador';
import type { Linterna } from '../jugador/Linterna';
import type { Grabadora } from '../jugador/Grabadora';
import type { Entidad } from '../ia/Entidad';
import type { Progreso } from '../narrativa/Progreso';
import type { MemoriaMundo } from '../director/MemoriaMundo';
import type { DirectorTerror } from '../director/DirectorTerror';
import type { Renderizador } from '../render/Renderizador';
import type { PaquetePiso } from '../pisos/TiposPiso';
import type { ValoresDificultad } from '../config/Dificultad';

/** Lo que la lógica del juego puede pedirle a la interfaz. */
export interface PuenteUI {
  abrirDocumento(id: string): void;
}

export interface ContextoJuego {
  readonly bus: BusEventos<MapaEventos>;
  readonly programador: Programador;
  readonly ajustes: GestorAjustes;
  readonly entrada: GestorEntrada;
  readonly audio: MotorAudio;
  readonly ambiente: AmbienteSonoro;
  readonly renderizador: Renderizador;
  readonly escena: Scene;
  /** El piso que se está jugando: mapa, objetivos, documentos y cintas. */
  readonly piso: PaquetePiso;
  /** Los valores de la dificultad que se juega (config/Dificultad.ts). No es readonly: se puede cambiar en plena partida. */
  dificultad: ValoresDificultad;
  readonly camara: PerspectiveCamera;
  readonly nivel: Nivel;
  readonly jugador: Jugador;
  readonly linterna: Linterna;
  readonly grabadora: Grabadora;
  readonly entidad: Entidad;
  readonly progreso: Progreso;
  readonly memoria: MemoriaMundo;
  readonly director: DirectorTerror;
  readonly ui: PuenteUI;
}
