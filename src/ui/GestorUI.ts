// Aquí coordino toda la interfaz: una PILA de pantallas (la de arriba es la
// visible), el HUD, el aviso de orientación y la navegación con mando.
// El juego principal me pide cosas ("abre la pausa") y yo le aviso las
// decisiones del jugador ("quiere continuar") mediante AccionesUI.
import type { BusEventos } from '../nucleo/BusEventos';
import type { MapaEventos } from '../nucleo/Eventos';
import type { GestorAjustes } from '../config/Ajustes';
import type { GestorEntrada } from '../entrada/GestorEntrada';
import type { BotonMenu } from '../entrada/Mando';
import { HUD, type DireccionRelativa } from './hud/HUD';
import { Pantalla } from './pantallas/Pantalla';
import { PantallaCarga } from './pantallas/PantallaCarga';
import { PantallaInicio } from './pantallas/PantallaInicio';
import { MenuPrincipal } from './pantallas/MenuPrincipal';
import { MenuPausa } from './pantallas/MenuPausa';
import { PantallaAjustes } from './pantallas/PantallaAjustes';
import { PantallaDocumentos } from './pantallas/PantallaDocumentos';
import { LectorDocumento } from './pantallas/LectorDocumento';
import type { Documento } from '../narrativa/TiposNarrativa';
import { PantallaMuerte, type DatosMuerte } from './pantallas/PantallaMuerte';
import type { PuenteTelemetria } from './PuenteTelemetria';
import { NOMBRE_DIFICULTAD, TABLA_DIFICULTAD, type IdDificultad, type ValoresDificultad } from '../config/Dificultad';
import type { PuenteDificultad } from './PuenteDificultad';
import { PantallaDificultad } from './pantallas/PantallaDificultad';
import { PantallaFin, type EstadisticasFin } from './pantallas/PantallaFin';
import { PantallaCreditos } from './pantallas/PantallaCreditos';
import { AvisoOrientacion } from './pantallas/AvisoOrientacion';
import { confirmar } from './componentes/Dialogo';
import { conectarSonidoUI, type TipoSonidoUI } from './componentes/SonidoUI';
import { navegar } from './NavegacionMando';

export interface AccionesUI {
  /** Un documento del piso que se juega (para el lector y la lista). */
  documento(id: string): Documento | undefined;
  hayPartida(): boolean;
  continuar(): void;
  /** Empiezo una partida nueva en esa dificultad (los avisos ya se dieron). */
  nuevaPartida(dificultad: IdDificultad): void;
  reanudar(): void;
  reiniciarPunto(): void;
  salirAlMenu(): void;
  objetivo(): string | null;
  documentosLeidos(): readonly string[];
  sonar(tipo: TipoSonidoUI): void;
  /** El piso del menú: su nombre y la dificultad más alta en que se terminó (null si nunca). */
  pisoDelMenu(): { nombre: string; completado: IdDificultad | null };
  /** Los valores de la dificultad en juego (pistas, indicador y ayuda del aire para el HUD). */
  dificultadEnJuego(): ValoresDificultad;
  dificultad: PuenteDificultad;
  telemetria: PuenteTelemetria;
}

export class GestorUI {
  readonly hud: HUD;
  readonly carga = new PantallaCarga();
  readonly inicio = new PantallaInicio();
  readonly aviso = new AvisoOrientacion();
  private readonly menu: MenuPrincipal;
  private readonly pausa: MenuPausa;
  private readonly ajustesPantalla: PantallaAjustes;
  private readonly documentos: PantallaDocumentos;
  private readonly lector: LectorDocumento;
  private readonly muerte: PantallaMuerte;
  private readonly fin: PantallaFin;
  private readonly eleccion: PantallaDificultad;
  private readonly creditos: PantallaCreditos;
  private pila: Pantalla[] = [];

  constructor(
    private readonly raiz: HTMLElement,
    bus: BusEventos<MapaEventos>,
    private readonly ajustes: GestorAjustes,
    entrada: GestorEntrada,
    private readonly acciones: AccionesUI,
    direccion: DireccionRelativa,
  ) {
    conectarSonidoUI((tipo) => acciones.sonar(tipo));
    this.hud = new HUD(bus, ajustes, () => entrada.modo, direccion, () => acciones.dificultadEnJuego());

    this.menu = new MenuPrincipal({
      hayPartida: () => acciones.hayPartida(),
      continuar: () => acciones.continuar(),
      nuevaPartida: () => this.abrir(this.eleccion),
      ajustes: () => this.abrir(this.ajustesPantalla),
      creditos: () => this.abrir(this.creditos),
      piso: () => acciones.pisoDelMenu(),
    });
    this.pausa = new MenuPausa({
      objetivo: () => acciones.objetivo(),
      reanudar: () => acciones.reanudar(),
      documentos: () => this.abrir(this.documentos),
      ajustes: () => this.abrir(this.ajustesPantalla),
      reiniciarPunto: () => acciones.reiniciarPunto(),
      reinicioDesdeCero: () => acciones.dificultad.enCursoSinGuardado(),
      salirAlMenu: () => void this.confirmarSalir(),
      telemetria: acciones.telemetria,
    });
    this.ajustesPantalla = new PantallaAjustes(ajustes, raiz, () => this.cerrarActual(), acciones.telemetria, acciones.dificultad);
    this.lector = new LectorDocumento((id) => acciones.documento(id));
    this.documentos = new PantallaDocumentos(
      () => acciones.documentosLeidos(),
      (id) => {
        this.pila.push(this.lector);
        this.lector.abrir(id, () => this.cerrarActual());
      },
      () => this.cerrarActual(),
      (id) => acciones.documento(id),
    );
    this.muerte = new PantallaMuerte(
      () => acciones.reiniciarPunto(),
      () => acciones.salirAlMenu(),
      () => acciones.dificultad.enCursoSinGuardado(),
      {
        ofrecida: () => acciones.dificultad.ofertaTrasMorir(),
        aceptar: (id) => {
          acciones.dificultad.cambiarEnCurso(id, 'oferta');
          this.ajustes.cambiar('dificultad', id);
          acciones.reiniciarPunto();
        },
      },
    );
    this.fin = new PantallaFin(() => acciones.salirAlMenu(), () => this.abrir(this.eleccion), acciones.telemetria);
    this.eleccion = new PantallaDificultad({
      preferida: () => ajustes.valores.dificultad,
      pesadillaDesbloqueada: () => acciones.dificultad.pesadillaDesbloqueada(),
      nombrePiso: () => acciones.pisoDelMenu().nombre,
      empezar: (id) => void this.confirmarEmpezar(id),
      volver: () => this.cerrarActual(),
    });
    this.creditos = new PantallaCreditos(() => this.cerrarActual());

    for (const p of [this.carga, this.inicio, this.menu, this.pausa, this.ajustesPantalla, this.documentos, this.lector, this.muerte, this.fin, this.eleccion, this.creditos]) {
      raiz.appendChild(p.elemento);
    }
    raiz.append(this.hud.elemento, this.hud.fundido, this.aviso.elemento);

    // Escape en menús = volver.
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || e.repeat) return;
      const dialogo = raiz.querySelector<HTMLElement & { alVolver?: () => void }>('.dialogo');
      if (dialogo?.alVolver) {
        dialogo.alVolver();
        return;
      }
      const arriba = this.pila[this.pila.length - 1];
      if (arriba?.visible && arriba.alVolver) {
        e.preventDefault();
        arriba.alVolver();
      }
    });
  }

  /** Reemplazo toda la pila por una pantalla. */
  private reemplazar(pantalla: Pantalla | null): void {
    for (const p of this.pila) p.ocultar();
    this.pila = pantalla ? [pantalla] : [];
    pantalla?.mostrar();
  }

  /** Abro una pantalla encima de la actual (la de abajo se oculta). */
  abrir(pantalla: Pantalla): void {
    this.pila[this.pila.length - 1]?.ocultar();
    this.pila.push(pantalla);
    pantalla.mostrar();
  }

  cerrarActual(): void {
    const actual = this.pila.pop();
    actual?.ocultar();
    this.pila[this.pila.length - 1]?.mostrar();
  }

  mostrarCarga(): void {
    this.reemplazar(this.carga);
  }

  mostrarInicio(): void {
    this.reemplazar(this.inicio);
  }

  mostrarMenu(): void {
    this.hud.fijarVisible(false);
    this.reemplazar(this.menu);
  }

  mostrarPausa(): void {
    this.reemplazar(this.pausa);
  }

  mostrarDocumento(id: string, alCerrar: () => void): void {
    this.pila = [this.lector];
    this.lector.abrir(id, () => {
      this.pila = [];
      alCerrar();
    });
  }

  mostrarMuerte(datos: DatosMuerte): void {
    this.hud.fijarVisible(false);
    this.muerte.fijarDatos(datos);
    this.reemplazar(this.muerte);
  }

  mostrarFin(estadisticas: EstadisticasFin): void {
    this.hud.fijarVisible(false);
    this.fin.fijarEstadisticas(estadisticas);
    this.reemplazar(this.fin);
  }

  /** Cierro todas las pantallas y muestro el HUD (volver al juego). */
  cerrarTodo(): void {
    this.reemplazar(null);
    this.hud.fijarVisible(true);
  }

  /** Navegación con mando dentro de la pantalla visible. */
  navegar(boton: BotonMenu): void {
    const arriba = this.pila[this.pila.length - 1];
    if (!arriba) return;
    if (boton === 'start' && arriba === this.pausa) {
      this.acciones.reanudar();
      return;
    }
    navegar(this.raiz, boton, () => arriba.alVolver?.());
  }

  /** Empiezo una partida nueva en esa dificultad, avisando antes lo que pasa con la partida guardada. */
  private async confirmarEmpezar(id: IdDificultad): Promise<void> {
    const hayPartida = this.acciones.hayPartida();
    let ok = true;
    if (TABLA_DIFICULTAD[id].puntosControl === 'ninguno') {
      // La que no guarda tampoco borra: la partida guardada se queda como está.
      const texto = `${NOMBRE_DIFICULTAD[id]} no guarda: si mueres o sales, empiezas de cero.${hayPartida ? ' Tu partida guardada no se toca.' : ''}`;
      ok = await confirmar(this.raiz, texto, `Empezar en ${NOMBRE_DIFICULTAD[id]}`);
    } else if (hayPartida) {
      ok = await confirmar(this.raiz, 'Empezar de nuevo borrará tu partida guardada.', 'Empezar de nuevo');
    }
    if (!ok) return;
    this.ajustes.cambiar('dificultad', id);
    this.acciones.nuevaPartida(id);
  }

  private async confirmarSalir(): Promise<void> {
    // En Pesadilla no hay nada guardado: salir pierde la partida, y el aviso tiene que decirlo.
    const ok = this.acciones.dificultad.enCursoSinGuardado()
      ? await confirmar(this.raiz, 'Si sales, pierdes esta partida: Pesadilla no guarda.', 'Salir y perderla', 'Seguir jugando')
      : await confirmar(this.raiz, 'Volverás al menú. Tu progreso queda guardado en el último punto de control.', 'Salir al menú');
    if (ok) this.acciones.salirAlMenu();
  }
}
