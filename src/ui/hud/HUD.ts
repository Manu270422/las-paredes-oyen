// Aquí armo el HUD completo y lo conecto al bus de eventos: subtítulos,
// objetivos, tarjeta de lugar, pistas, interacción, estado y grabadora.
import type { BusEventos } from '../../nucleo/BusEventos';
import type { MapaEventos } from '../../nucleo/Eventos';
import type { GestorAjustes } from '../../config/Ajustes';
import type { ModoEntrada } from '../../entrada/AccionesEntrada';
import { Subtitulos } from './Subtitulos';
import { AvisoObjetivo } from './AvisoObjetivo';
import { TarjetaLugar } from './TarjetaLugar';
import { Pistas } from './Pistas';
import { IndicadorInteraccion } from './IndicadorInteraccion';
import { EstadoJugadorHUD } from './EstadoJugadorHUD';
import { MedidorGrabacion } from './MedidorGrabacion';
import { ContadorFps } from './ContadorFps';

export interface EstadoHUD {
  interaccion: string | null;
  aire: number;
  aguantando: boolean;
  energia: number;
  bateria: number;
  linterna: boolean;
  medicion: number | null;
  dtReal: number;
  escalaResolucion: number;
  /** En PC: el ratón no está capturado (hay que hacer clic para mirar). */
  ratonLibre: boolean;
}

/** Función que traduce una posición del mundo a una flecha relativa a la mirada. */
export type DireccionRelativa = (x: number, z: number) => string;

export class HUD {
  readonly elemento: HTMLDivElement;
  readonly fundido: HTMLDivElement;
  private readonly subtitulos = new Subtitulos();
  private readonly objetivo = new AvisoObjetivo();
  private readonly tarjeta = new TarjetaLugar();
  private readonly pistas: Pistas;
  private readonly interaccion = new IndicadorInteraccion();
  private readonly estado = new EstadoJugadorHUD();
  private readonly medidor = new MedidorGrabacion();
  private readonly fps = new ContadorFps();
  private readonly avisoRaton: HTMLDivElement;

  constructor(
    bus: BusEventos<MapaEventos>,
    private readonly ajustes: GestorAjustes,
    private readonly modo: () => ModoEntrada,
    direccion: DireccionRelativa,
  ) {
    this.pistas = new Pistas(modo);
    this.elemento = document.createElement('div');
    this.elemento.className = 'hud hud--oculto';
    this.fundido = document.createElement('div');
    this.fundido.className = 'fundido';
    this.avisoRaton = document.createElement('div');
    this.avisoRaton.className = 'aviso-raton';
    this.avisoRaton.textContent = 'Haz clic para controlar la mirada';
    this.elemento.append(
      this.interaccion.mira,
      this.interaccion.elemento,
      this.subtitulos.elemento,
      this.objetivo.elemento,
      this.tarjeta.elemento,
      this.pistas.elemento,
      this.estado.elemento,
      this.medidor.elemento,
      this.fps.elemento,
      this.avisoRaton,
    );

    bus.on('subtitulo', (s) => {
      const efecto = s.tipo === 'efecto';
      const permitido = efecto ? this.ajustes.valores.subtitulos || this.ajustes.valores.subtitulosEfectos : this.ajustes.valores.subtitulos;
      if (permitido) this.subtitulos.mostrar(s.texto, s.duracion ?? 3, efecto);
    });
    bus.on('sonido-relevante', (s) => {
      if (!this.ajustes.valores.subtitulosEfectos || !s.descripcion) return;
      this.subtitulos.mostrar(`[${s.descripcion} ${direccion(s.x, s.z)}]`, 2.6, true);
    });
    bus.on('objetivo', (o) => this.objetivo.mostrar(o.texto, o.nuevo));
    bus.on('tarjeta', (t) => this.tarjeta.mostrar(t.titulo, t.subtitulo));
    bus.on('pista', (p) => this.pistas.agregar(p.texto));
  }

  fijarVisible(visible: boolean): void {
    this.elemento.classList.toggle('hud--oculto', !visible);
  }

  limpiar(): void {
    this.subtitulos.limpiar();
    this.objetivo.ocultar();
    this.tarjeta.ocultar();
    this.pistas.limpiar();
  }

  /** Fundido a negro (o desde negro) con la duración indicada. */
  fundir(aNegro: boolean, segundos: number): void {
    this.fundido.style.transition = `opacity ${segundos}s ease`;
    this.fundido.style.opacity = aNegro ? '1' : '0';
  }

  actualizar(e: EstadoHUD): void {
    this.interaccion.actualizar(e.interaccion, this.modo());
    this.estado.actualizar(e.aire, e.aguantando, e.energia, e.bateria, e.linterna);
    this.medidor.actualizar(e.medicion);
    this.fps.actualizar(e.dtReal, this.ajustes.valores.mostrarFps, e.escalaResolucion);
    this.avisoRaton.classList.toggle('aviso-raton--visible', e.ratonLibre);
  }
}
