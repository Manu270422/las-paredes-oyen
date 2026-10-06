// Aquí está el orquestador del juego: crea todos los sistemas en orden,
// maneja los estados de la aplicación (carga, menú, juego, pausa, lectura,
// muerte, final) y ejecuta el bucle principal. No tiene lógica de juego
// propia: solo conecta las piezas y decide qué se actualiza en cada estado.
import { Color, FogExp2, HemisphereLight, Scene } from 'three';
import { CONFIG } from '../config/ConfiguracionJuego';
import { GestorAjustes } from '../config/Ajustes';
import { PERFILES, type NivelCalidad, type PerfilCalidad } from '../config/PerfilesCalidad';
import { DIFICULTAD_POR_DEFECTO, puntoDeControlDe, TABLA_DIFICULTAD, type IdDificultad } from '../config/Dificultad';
import { detectarDispositivo, sugerirCalidad } from '../plataforma/DetectorDispositivo';
import { GestorPantalla } from '../plataforma/GestorPantalla';
import { GestorEntrada } from '../entrada/GestorEntrada';
import { Renderizador } from '../render/Renderizador';
import { BibliotecaMateriales } from '../render/Materiales';
import { crearCookieLinterna } from '../render/texturas/CookieLinterna';
import { MotorAudio } from '../audio/MotorAudio';
import { AmbienteSonoro } from '../audio/AmbienteSonoro';
import { Nivel } from '../mundo/Nivel';
import { PISO_INICIAL, siguienteDe } from '../pisos/catalogo';
import type { GuionPiso, PaquetePiso } from '../pisos/TiposPiso';
import { Jugador } from '../jugador/Jugador';
import { Linterna } from '../jugador/Linterna';
import { Grabadora } from '../jugador/Grabadora';
import { Entidad } from '../ia/Entidad';
import { SistemaInteraccion } from '../interaccion/SistemaInteraccion';
import { Progreso } from '../narrativa/Progreso';
import { conectarAnuncioLugares } from '../narrativa/AnuncioLugares';
import { MemoriaMundo } from '../director/MemoriaMundo';
import { DirectorTerror } from '../director/DirectorTerror';
import { SistemaGuardado, type DatosPartida } from '../guardado/SistemaGuardado';
import { Perfil } from '../guardado/Perfil';
import { GestorUI } from '../ui/GestorUI';
import { Telemetria } from '../telemetria/Telemetria';
import { aplicarParametroTelemetria } from '../telemetria/ParametroUrl';
import { BusEventos } from './BusEventos';
import type { MapaEventos } from './Eventos';
import { Programador } from './Programador';
import { BucleJuego } from './BucleJuego';
import { SecuenciaMuerte, type SalidaMuerte } from './SecuenciaMuerte';
import { FondoMenu } from './FondoMenu';
import { DificultadPartida } from './DificultadPartida';
import { mostrarSusto } from './Susto';
import type { ContextoJuego } from './ContextoJuego';
import { amortiguar, normalizarAngulo } from '../utilidades/Matematicas';

type EstadoApp = 'cargando' | 'inicio' | 'menu' | 'jugando' | 'pausa' | 'documento' | 'muerte' | 'fin';

/** Cómo empiezo a jugar: una partida nueva, continuar la guardada o reintentar tras morir. */
type OrigenPartida = 'nueva' | 'continuar' | 'reintento';

export class Juego {
  private readonly bus = new BusEventos<MapaEventos>();
  private readonly programador = new Programador();
  private readonly ajustes = new GestorAjustes();
  private readonly pantalla = new GestorPantalla();
  private readonly dispositivo = detectarDispositivo();
  /** El piso que se está jugando, como paquete de datos (mapa, objetivos, documentos, cintas). */
  private readonly piso: PaquetePiso = PISO_INICIAL;
  private readonly guardado = new SistemaGuardado();
  /** La dificultad de la partida en curso: la actual, con la que empezó y la más baja jugada. */
  private readonly dificultadPartida = new DificultadPartida(this.guardado);
  /** Mejores marcas y totales del jugador: sobrevive a todas las partidas. */
  private readonly perfilGuardado = new Perfil();
  private readonly escena = new Scene();
  private readonly interaccion = new SistemaInteraccion();
  /** Telemetría local de playtesting: escucha el bus, no toca la lógica de nadie. */
  private readonly telemetria = new Telemetria(this.bus, this.ajustes);
  private readonly muerte = new SecuenciaMuerte();
  /** El menú se dibuja sobre el pasillo real: cámara que respira y, a veces, algo al fondo. */
  private readonly fondoMenu = new FondoMenu();
  /** Lo que la secuencia de muerte le pide al juego. */
  private readonly salidaMuerte: SalidaMuerte = {
    fundir: (aNegro, segundos) => this.ui.hud.fundir(aNegro, segundos),
    apagarMundo: () => {
      this.audio.detenerTodo();
      this.ambiente.olvidarFuentes();
      this.guardarPartidaEstadisticas();
    },
    mostrarPantalla: (datos) => this.ui.mostrarMuerte(datos),
  };
  private readonly lienzo: HTMLCanvasElement;
  private readonly raizUI: HTMLElement;

  // Sistemas que creo durante la carga (por eso el "!").
  private perfil!: PerfilCalidad;
  private renderizador!: Renderizador;
  private entrada!: GestorEntrada;
  private ui!: GestorUI;
  private audio!: MotorAudio;
  private ambiente!: AmbienteSonoro;
  private materiales!: BibliotecaMateriales;
  private nivel!: Nivel;
  private jugador!: Jugador;
  private linterna!: Linterna;
  private grabadora!: Grabadora;
  private entidad!: Entidad;
  private progreso!: Progreso;
  private memoria!: MemoriaMundo;
  private director!: DirectorTerror;
  /** El guion del piso, si tiene (los momentos escritos a mano). */
  private guion: GuionPiso | null = null;
  private ctx!: ContextoJuego;
  private bucle!: BucleJuego;

  private estado: EstadoApp = 'cargando';
  private estadoAntesDePausa: EstadoApp = 'jugando';
  private soloMirar = false;
  private puntoControl = this.piso.puntoInicial;
  private tiempoJugado = 0;
  private temporizadorLento = 0;
  private interferencia = 0;

  constructor(contenedor: HTMLElement) {
    this.lienzo = contenedor.querySelector('#lienzo') as HTMLCanvasElement;
    this.raizUI = contenedor.querySelector('#ui') as HTMLElement;
  }

  // ---------------------------------------------------------------------------
  // ARRANQUE
  // ---------------------------------------------------------------------------
  async arrancar(): Promise<void> {
    aplicarParametroTelemetria(this.ajustes);
    this.perfil = PERFILES[this.calidadElegida()];
    this.renderizador = new Renderizador(this.lienzo, this.perfil);
    Object.assign(this.renderizador, { brillo: this.ajustes.valores.brillo, reducirDestellos: this.ajustes.valores.reducirDestellos });
    this.entrada = new GestorEntrada(this.lienzo, this.raizUI, this.ajustes, this.dispositivo.esTactil);
    document.documentElement.dataset.modoEntrada = this.entrada.modo;
    this.jugador = new Jugador(1);

    this.ui = new GestorUI(
      this.raizUI,
      this.bus,
      this.ajustes,
      this.entrada,
      {
        documento: (id) => this.piso.documentos[id],
        hayPartida: () => this.guardado.hayPartida(),
        continuar: () => this.comenzar(this.guardado.cargar(), 'continuar'),
        nuevaPartida: (dificultad) => this.nuevaPartida(dificultad),
        reanudar: () => this.reanudar(),
        // En Pesadilla no hay punto de control: reintentar es una partida nueva (sin tocar la guardada).
        reiniciarPunto: () => (this.guardado.sinGuardado ? this.nuevaPartida(this.dificultadPartida.actual, 'reintento') : this.comenzar(this.guardado.cargar(), 'reintento')),
        salirAlMenu: () => this.salirAlMenu(),
        objetivo: () => this.progreso.objetivoActual()?.texto ?? null,
        documentosLeidos: () => this.progreso.documentosLeidos,
        sonar: (tipo) => this.audio?.reproducir('ui', { bus: 'interfaz', volumen: tipo === 'pasar' ? 0.25 : 0.5, tono: tipo === 'volver' ? 0.8 : 1 }),
        pisoDelMenu: () => ({ nombre: this.piso.nombre, completado: this.perfilGuardado.completado(this.piso.id) }),
        pistas: () => this.ctx.dificultad.pistas,
        dificultad: {
          enCurso: () => (this.estado === 'pausa' ? this.dificultadPartida.actual : null),
          enCursoSinGuardado: () => this.guardado.sinGuardado,
          guardada: () => this.guardado.cargar()?.dificultad ?? null,
          pesadillaDesbloqueada: () => this.perfilGuardado.algunoCompletado,
          cambiarEnCurso: (id, motivo) => this.dificultadPartida.cambiar(id, this.ctx, motivo),
          ofertaTrasMorir: () => (this.memoria.muertesSinProgreso === 3 ? this.ctx.dificultad.ofrecerBajarA : null),
        },
        telemetria: this.telemetria.puente,
      },
      (x, z) => this.direccionRelativa(x, z),
    );
    this.ui.mostrarCarga();
    this.redimensionar();

    // 1) Sonidos (0% → 30%).
    this.audio = new MotorAudio(this.perfil.audioHRTF);
    this.audio.aplicarVolumenes(this.ajustes.valores);
    await this.audio.generarSonidos((p) => this.ui.carga.fijarProgreso(p * 0.3));

    // 2) Texturas y materiales (30% → 85%).
    this.materiales = new BibliotecaMateriales();
    await this.materiales.generar(this.perfil.tamanoTextura, this.perfil.anisotropia, (p) => this.ui.carga.fijarProgreso(0.3 + p * 0.55));

    // 3) Mundo (85% → 100%).
    this.construirMundo();
    this.ui.carga.fijarProgreso(0.95);
    this.conectarEventos();
    this.precompilar();
    this.ui.carga.fijarProgreso(1);

    this.bucle = new BucleJuego((dt) => this.fotograma(dt));
    this.bucle.iniciar();
    // Solo en desarrollo: expongo el juego en la consola para depurar (window.__juego).
    if (import.meta.env.DEV) (window as unknown as { __juego: unknown }).__juego = this;
    this.fondoMenu.preparar(this.ctx);

    // Pantalla de audífonos: espero el primer gesto para activar audio y pantalla completa.
    this.estado = 'inicio';
    this.ui.mostrarInicio();
    await this.ui.inicio.esperarGesto(() => this.entrada.mando.sondear());
    await this.audio.reanudar();
    this.ambiente.iniciar();
    if (this.dispositivo.esTactil) void this.pantalla.entrarPantallaCompleta();
    this.irAlMenu();
  }

  private calidadElegida(): NivelCalidad {
    const elegida = this.ajustes.valores.calidad;
    return elegida === 'auto' ? sugerirCalidad(this.dispositivo) : elegida;
  }

  private construirMundo(): void {
    // Negro absoluto con niebla densa: el fondo del pasillo desaparece.
    this.escena.background = new Color(0x000000);
    this.escena.fog = new FogExp2(0x010101, 0.075);
    // Luz ambiente mínima: solo para intuir siluetas. Todo lo demás es linterna y lámparas.
    this.escena.add(new HemisphereLight(0x2a3242, 0x0d0a08, 0.22));

    this.nivel = new Nivel(this.piso, this.materiales, this.perfil.lucesMaximas);
    this.escena.add(this.nivel.grupo);
    this.escena.add(this.jugador.camara);
    this.linterna = new Linterna(this.escena, this.perfil, crearCookieLinterna());
    this.grabadora = new Grabadora(this.escena);
    this.nivel.interactuables.push(this.grabadora.interactuable);
    this.entidad = new Entidad(this.escena, this.nivel.rejilla);
    this.ambiente = new AmbienteSonoro(this.audio);
    this.audio.consultaOclusion = this.nivel.consultaOclusion;
    this.progreso = new Progreso(this.bus, this.piso.objetivos, this.piso.reglas);
    this.memoria = new MemoriaMundo();
    this.director = new DirectorTerror();
    this.director.conectar(this.bus, this.piso.reglas.directorDesde);
    conectarAnuncioLugares(this.bus, this.piso, this.nivel, this.progreso);
    this.guion = this.piso.guion?.({
      mostrarSusto: () => mostrarSusto(this.ctx, 'final'),
      fundido: (aNegro, segundos) => this.ui.hud.fundir(aNegro, segundos),
      fijarSoloMirar: (activo) => (this.soloMirar = activo),
      terminarDemo: () => this.terminarDemo(),
    }) ?? null;

    this.ctx = {
      bus: this.bus,
      programador: this.programador,
      ajustes: this.ajustes,
      entrada: this.entrada,
      audio: this.audio,
      ambiente: this.ambiente,
      renderizador: this.renderizador,
      escena: this.escena,
      piso: this.piso,
      dificultad: TABLA_DIFICULTAD[DIFICULTAD_POR_DEFECTO],
      camara: this.jugador.camara,
      nivel: this.nivel,
      jugador: this.jugador,
      linterna: this.linterna,
      grabadora: this.grabadora,
      entidad: this.entidad,
      progreso: this.progreso,
      memoria: this.memoria,
      director: this.director,
      ui: { abrirDocumento: (id) => this.abrirDocumento(id) },
    };
    this.guion?.conectar(this.ctx);
    this.redimensionar();
  }

  /** Compilo los shaders durante la carga para evitar tirones la primera vez que algo aparece. */
  private precompilar(): void {
    this.entidad.modelo.fijarVisible(true);
    this.linterna.encendida = true;
    this.linterna.actualizar(0.016, Infinity, this.ctx);
    this.renderizador.webgl.compile(this.escena, this.jugador.camara);
    this.entidad.modelo.fijarVisible(false);
    this.linterna.encendida = false;
  }

  private conectarEventos(): void {
    // La criatura oye TODO ruido del mundo; la grabadora solo el mío.
    this.bus.on('ruido', (ruido) => {
      if (this.estado !== 'jugando') return;
      this.entidad.oir(ruido, this.ctx);
      if (ruido.origen === 'jugador') this.grabadora.alRuidoJugador(ruido, this.ctx);
    });
    this.bus.on('bandera', ({ nombre }) => {
      const punto = puntoDeControlDe(this.piso, this.ctx.dificultad, nombre);
      if (punto) {
        // Avancé en la historia: el alivio por muertes seguidas se reinicia.
        this.memoria.muertesSinProgreso = 0;
        this.puntoControl = punto;
        this.guardarPartida();
      }
    });
    this.perfilGuardado.conectar(this.bus);
    this.bus.on('interferencia', ({ intensidad }) => {
      this.interferencia = Math.max(this.interferencia, intensidad);
    });

    this.pantalla.alCambiar(() => this.redimensionar());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pausar();
    });
    // Si el navegador suelta el ratón (Esc) mientras juego con teclado, pauso.
    document.addEventListener('pointerlockchange', () => {
      if (!this.entrada.teclado.bloqueado && this.estado === 'jugando' && this.entrada.modo === 'teclado') this.pausar();
    });
    this.lienzo.addEventListener('click', () => {
      if (this.estado === 'jugando' && this.entrada.modo === 'teclado') this.entrada.teclado.pedirBloqueo();
    });

    this.ajustes.suscribir((valores, clave) => {
      this.audio.aplicarVolumenes(valores);
      Object.assign(this.renderizador, { brillo: valores.brillo, reducirDestellos: valores.reducirDestellos });
      if (clave === 'calidad' || clave === null) {
        this.perfil = PERFILES[this.calidadElegida()];
        this.renderizador.aplicarPerfil(this.perfil);
        this.linterna.aplicarPerfil(this.perfil);
        this.audio.fijarHRTF(this.perfil.audioHRTF);
        this.materiales.marcarParaRecompilar();
        this.redimensionar();
      }
    });
  }

  private redimensionar(): void {
    const { ancho, alto } = this.pantalla;
    this.renderizador?.redimensionar(ancho, alto);
    if (this.jugador) {
      this.jugador.camara.aspect = ancho / alto;
      this.jugador.camara.updateProjectionMatrix();
    }
    // El juego es horizontal: en vertical (celulares y tabletas) muestro el aviso y pauso.
    const vertical = this.pantalla.esVertical && this.dispositivo.esTactil;
    this.ui?.aviso.fijarVisible(vertical);
    if (vertical) this.pausar();
  }

  // ---------------------------------------------------------------------------
  // ESTADOS DE LA APLICACIÓN
  // ---------------------------------------------------------------------------
  private irAlMenu(): void {
    this.estado = 'menu';
    this.soloMirar = false;
    this.entrada.fijarEnJuego(false);
    this.ui.hud.fundir(false, 0.8);
    this.ui.mostrarMenu();
  }

  private nuevaPartida(dificultad: IdDificultad, origen: OrigenPartida = 'nueva'): void {
    this.dificultadPartida.empezar(dificultad, this.ctx, origen === 'reintento');
    this.guardado.borrar();
    this.memoria.reiniciarEstadisticas();
    this.perfilGuardado.registrarInicio();
    this.director.olvidarPerfil();
    this.tiempoJugado = 0;
    this.comenzar(null, origen);
  }


  /** Empiezo (o retomo) una partida desde un punto de control. */
  private comenzar(datos: DatosPartida | null, origen: OrigenPartida): void {
    this.ui.cerrarTodo();
    this.ui.hud.limpiar();
    this.ui.hud.fundir(true, 0);
    void this.audio.reanudar();
    this.cargarDesdePunto(datos);
    this.estado = 'jugando';
    this.entrada.volverAlJuego();
    window.setTimeout(() => this.ui.hud.fundir(false, 1.6), 60);
    if (this.dispositivo.esTactil && !this.pantalla.esPantallaCompleta) void this.pantalla.entrarPantallaCompleta();
    const { ancho, alto } = this.pantalla;
    this.telemetria.empezarPartida(origen === 'reintento', this.ctx, this.puntoControl, {
      entrada: this.entrada.modo,
      tactil: this.dispositivo.esTactil,
      calidad: this.calidadElegida(),
      aspecto: Math.round((ancho / Math.max(1, alto)) * 100) / 100,
      hrtf: this.perfil.audioHRTF,
      dificultad: this.dificultadPartida.actual,
    });
  }

  private cargarDesdePunto(datos: DatosPartida | null): void {
    const ctx = this.ctx;
    this.programador.cancelarTodo();
    this.audio.detenerTodo();
    this.audio.fijarSilencioAmbiente(1);
    this.ambiente.olvidarFuentes();
    this.soloMirar = false;
    this.interferencia = 0;

    // "Continuar" y reintentar retoman la dificultad de la partida guardada; una partida nueva ya fijó la suya.
    if (datos) this.dificultadPartida.retomar(datos, ctx);
    this.progreso.importar(datos?.progreso ?? null);
    this.puntoControl = datos?.puntoControl ?? this.piso.puntoInicial;
    this.tiempoJugado = datos?.tiempoJugado ?? this.tiempoJugado;
    if (datos) this.memoria.restaurarEstadisticas(datos.estadisticas);
    this.memoria.reiniciarSesion();
    this.nivel.restablecer(ctx);
    this.grabadora.reiniciar();
    this.linterna.reiniciar(datos?.bateria ?? 1);
    // Si retomo más adelante en la historia, llego con la linterna encendida.
    this.linterna.encendida = this.puntoControl !== this.piso.puntoInicial;
    const punto = this.nivel.puntoControl(this.puntoControl, this.piso.puntoInicial);
    this.jugador.teletransportar(punto.x, punto.y, punto.angulo);
    const guarida = this.piso.mapa.guaridaEntidad;
    this.entidad.reiniciar(guarida.x * CONFIG.celda, guarida.y * CONFIG.celda, ctx);
    this.entidad.puedeManifestarse = this.progreso.criaturaDespierta;
    this.director.reiniciar(this.memoria.muertesSinProgreso, ctx.dificultad.alivio);
    this.director.activo = this.progreso.tiene(this.piso.reglas.directorDesde);
    this.guion?.reiniciar(ctx);
    if (this.piso.mapa.viento) this.ambiente.iniciarViento(this.piso.mapa.viento.x * CONFIG.celda, this.piso.mapa.viento.y * CONFIG.celda);
    Object.assign(this.renderizador.efectos, { susto: 0, interferencia: 0 });
    this.progreso.anunciarObjetivo();
  }

  private guardarPartida(): void {
    // Un punto de control: desde aquí la partida tiene guardado propio (también si venía bajada de Pesadilla).
    this.guardado.fijarSinGuardado(false);
    this.guardado.guardar({
      piso: this.piso.id,
      ...this.dificultadPartida.campos,
      puntoControl: this.puntoControl,
      progreso: this.progreso.exportar(),
      bateria: Math.max(0.35, this.linterna.bateria),
      tiempoJugado: this.tiempoJugado,
      estadisticas: this.memoria.estadisticas,
    });
  }

  private pausar(): void {
    if (this.estado !== 'jugando') return;
    this.estadoAntesDePausa = this.estado;
    this.estado = 'pausa';
    this.entrada.fijarEnJuego(false);
    void this.audio.suspender();
    this.ui.mostrarPausa();
    this.telemetria.registrarPausa(true);
  }

  private reanudar(): void {
    if (this.estado !== 'pausa') return;
    if (this.pantalla.esVertical && this.dispositivo.esTactil) return;
    this.ui.cerrarTodo();
    this.estado = this.estadoAntesDePausa;
    this.entrada.volverAlJuego();
    void this.audio.reanudar();
    this.telemetria.registrarPausa(false);
  }

  private abrirDocumento(id: string): void {
    this.bus.emit('documento', { id });
    this.estado = 'documento';
    this.entrada.fijarEnJuego(false);
    this.ui.hud.fijarVisible(false);
    this.ui.mostrarDocumento(id, () => {
      this.estado = 'jugando';
      this.ui.hud.fijarVisible(true);
      this.entrada.volverAlJuego();
    });
  }

  private salirAlMenu(): void {
    this.telemetria.cerrarSesion('menu');
    this.programador.cancelarTodo();
    this.audio.detenerTodo();
    this.ambiente.olvidarFuentes();
    this.audio.fijarSilencioAmbiente(1);
    void this.audio.reanudar();
    this.ui.hud.limpiar();
    this.fondoMenu.preparar(this.ctx);
    this.irAlMenu();
  }

  /** La criatura me atrapó: la secuencia (susto → negro → por qué morí) vive en SecuenciaMuerte. */
  private atrapado(): void {
    this.estado = 'muerte';
    this.entrada.fijarEnJuego(false);
    this.muerte.iniciar(this.ctx);
  }

  /** Guardo solo las estadísticas nuevas sin mover el punto de control. */
  private guardarPartidaEstadisticas(): void {
    const datos = this.guardado.cargar();
    if (datos) this.guardado.guardar({ ...datos, estadisticas: this.memoria.estadisticas });
  }

  private terminarDemo(): void {
    this.bus.emit('fin-demo', { tiempo: this.tiempoJugado });
    // Cierro la sesión de prueba ANTES de la pantalla final, para poder exportarla desde ahí.
    this.telemetria.cerrarSesion('fin');
    this.estado = 'fin';
    this.entrada.fijarEnJuego(false);
    this.audio.detenerTodo();
    this.ambiente.olvidarFuentes();
    this.guardado.borrar();
    this.ui.mostrarFin({
      piso: this.piso.nombre,
      dificultad: this.dificultadPartida.texto,
      siguiente: siguienteDe(this.piso),
      tiempo: this.tiempoJugado,
      cambiosMundo: this.memoria.cambiosMundo,
      persecuciones: this.memoria.persecuciones,
      muertes: this.memoria.muertes,
      marcas: this.perfilGuardado.registrarFinal(this.piso.id, this.dificultadPartida.masBaja, this.tiempoJugado, this.memoria.muertes),
    });
    this.ui.hud.fundir(false, 0.5);
  }

  // ---------------------------------------------------------------------------
  // BUCLE PRINCIPAL
  // ---------------------------------------------------------------------------
  private fotograma(dt: number): void {
    switch (this.estado) {
      case 'jugando':
        this.actualizarJuego(dt);
        break;
      case 'muerte':
        // Solo animo la cámara y la luz durante el susto. Después, en la pantalla
        // de muerte, ya no respiro ni late mi corazón: estoy muerto.
        if (this.muerte.enSusto) {
          this.jugador.actualizar(dt, this.entrada.estado, this.ctx, false);
          this.linterna.actualizar(dt, Infinity, this.ctx);
        }
        this.muerte.actualizar(dt, this.ctx, this.salidaMuerte);
        break;
      case 'menu':
      case 'inicio':
        this.fondoMenu.actualizar(dt, this.ctx, this.estado === 'menu');
        this.navegarMenus(dt);
        break;
      case 'pausa':
      case 'documento':
      case 'fin':
        this.navegarMenus(dt);
        break;
      case 'cargando':
        break;
    }
    if (this.estado === 'cargando') return;
    this.actualizarEfectos(dt);
    this.renderizador.dibujar(this.escena, this.jugador.camara, dt, this.bucle.dtReal);
  }

  private navegarMenus(dt: number): void {
    const boton = this.entrada.leerMando(dt);
    if (boton) this.ui.navegar(boton);
  }

  private actualizarJuego(dt: number): void {
    const ctx = this.ctx;
    this.entrada.actualizar(dt);
    const e = this.entrada.estado;
    if (e.pausa) {
      this.pausar();
      return;
    }
    if (this.soloMirar) {
      e.moverX = 0;
      e.moverY = 0;
      e.correr = false;
      e.interactuar = false;
      e.senuelo = false;
      e.agacharse = false;
    }
    if (e.linterna) this.linterna.alternar(ctx);
    if (e.senuelo) {
      if (this.grabadora.puedeUsarSenuelo(ctx)) this.grabadora.colocarSenuelo(ctx);
      else if (!this.progreso.criaturaDespierta) this.bus.emit('subtitulo', { texto: 'Todavía no he grabado nada.', duracion: 2 });
    }

    this.tiempoJugado += dt;
    this.programador.actualizar(dt);
    this.jugador.actualizar(dt, e, ctx, true);
    this.interaccion.actualizar(ctx, e.interactuar);
    // Si abrí un documento, este fotograma termina aquí.
    if (this.estado !== 'jugando') return;
    this.grabadora.actualizar(dt, ctx);
    this.entidad.actualizar(dt, ctx);
    this.director.actualizar(dt, ctx);
    this.guion?.actualizar(dt, ctx);
    this.memoria.actualizar(dt, ctx);
    const distanciaEntidad = this.entidad.fisica ? this.entidad.distanciaAlJugador(ctx) : Infinity;
    this.linterna.actualizar(dt, distanciaEntidad, ctx);
    const j = this.jugador.posicion;
    this.nivel.actualizar(dt, ctx, j.x, j.z);

    // Audio.
    this.temporizadorLento -= dt;
    if (this.temporizadorLento <= 0) {
      this.temporizadorLento = 0.25;
      this.ambiente.sincronizarLamparas(this.nivel.lamparas);
      this.ambiente.fijarTension(this.director.tension);
      this.ambiente.fijarEstres(this.jugador.estres);
    }
    this.ambiente.actualizar(dt, j.x, j.z, this.nivel.rejilla);
    this.audio.fijarEscucha(this.jugador.nivelEscucha);
    this.audio.actualizarOyente(this.jugador.camara);
    this.audio.actualizar(dt);
    this.telemetria.actualizar(dt, this.bucle.dtReal);

    // ¿Me atrapó? Regla de justicia: SOLO mata cuando está cazando. La caza
    // siempre tiene aviso (su respiración, la interferencia, el sobresalto) y
    // siempre tiene una causa que la pantalla de muerte puede explicar.
    if (this.entidad.fisica && !this.soloMirar && this.entidad.estado === 'cazando' && distanciaEntidad < CONFIG.entidad.distanciaAtrapar) {
      this.atrapado();
      return;
    }

    // HUD.
    const enfocado = this.interaccion.enfocado;
    const texto = enfocado ? enfocado.texto(ctx) : null;
    this.entrada.tactil.fijarInteraccionDisponible(texto !== null, texto ?? '');
    this.entrada.tactil.fijarEstadoBoton('agacharse', this.jugador.agachado);
    this.entrada.tactil.fijarEstadoBoton('linterna', this.linterna.encendida);
    this.ui.hud.actualizar({
      interaccion: texto,
      aire: this.jugador.respiracion.aire,
      aguantando: this.jugador.respiracion.aguantando,
      energia: this.jugador.estamina,
      bateria: this.linterna.bateria,
      linterna: this.linterna.encendida,
      medicion: this.grabadora.midiendo ? this.grabadora.progresoMedicion : null,
      dtReal: this.bucle.dtReal,
      escalaResolucion: this.renderizador.resolucionDinamica,
      indicadorAire: ctx.dificultad.indicadorAire || this.ajustes.valores.indicadorAireSiempre,
      ratonLibre: this.entrada.modo === 'teclado' && !this.entrada.teclado.bloqueado,
    });
  }

  /** Paso el estado del jugador al postprocesado. */
  private actualizarEfectos(dt: number): void {
    const efectos = this.renderizador.efectos;
    const enJuego = this.estado === 'jugando' || this.estado === 'muerte';
    efectos.estres = enJuego ? this.jugador.estres : 0;
    efectos.escuchando = enJuego ? this.jugador.nivelEscucha : 0;
    efectos.pulso = enJuego ? this.jugador.corazon.pulso : 0;
    efectos.susto = amortiguar(efectos.susto, 0, 2.5, dt);
    this.interferencia = Math.max(0, this.interferencia - dt * 1.6);
    const cercania = this.entidad?.fisica ? Math.max(0, 1 - this.entidad.distanciaAlJugador(this.ctx) / 8) * 0.25 : 0;
    efectos.interferencia = Math.min(1, this.interferencia + (enJuego ? cercania : 0));
  }

  /** Traduzco una posición del mundo a una flecha relativa a donde miro (para subtítulos). */
  private direccionRelativa(x: number, z: number): string {
    const j = this.jugador.posicion;
    const angulo = Math.atan2(-(x - j.x), -(z - j.z));
    const relativo = normalizarAngulo(angulo - this.jugador.yaw);
    const abs = Math.abs(relativo);
    if (abs < Math.PI / 4) return '↑';
    if (abs > (3 * Math.PI) / 4) return '↓';
    return relativo > 0 ? '←' : '→';
  }
}
