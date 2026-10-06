// Aquí están los ajustes, en pestañas: Juego (la dificultad), Video, Audio, Controles, Accesibilidad
// y Pruebas (la telemetría local para las sesiones de playtesting).
// Todo se aplica en vivo (sin botón de "aplicar") y se guarda solo.
import type { GestorAjustes } from '../../config/Ajustes';
import { crearBoton } from '../componentes/Boton';
import { crearDeslizador } from '../componentes/Deslizador';
import { crearInterruptor } from '../componentes/Interruptor';
import { crearSelector } from '../componentes/Selector';
import { confirmar } from '../componentes/Dialogo';
import { crearFila } from '../componentes/FilaAjuste';
import type { PuenteTelemetria } from '../PuenteTelemetria';
import type { PuenteDificultad } from '../PuenteDificultad';
import { DIFICULTADES, NOMBRE_DIFICULTAD, TABLA_DIFICULTAD, type IdDificultad } from '../../config/Dificultad';
import { Pantalla } from './Pantalla';

type Pestana = 'juego' | 'video' | 'audio' | 'controles' | 'accesibilidad' | 'pruebas';

const NOMBRES: Record<Pestana, string> = {
  juego: 'Juego',
  video: 'Video',
  audio: 'Audio',
  controles: 'Controles',
  accesibilidad: 'Accesibilidad',
  pruebas: 'Pruebas',
};

const porcentaje = (v: number) => `${Math.round(v * 100)} %`;

export class PantallaAjustes extends Pantalla {
  private pestana: Pestana = 'juego';
  private readonly pestanas: HTMLDivElement;
  private readonly cuerpo: HTMLDivElement;

  constructor(
    private readonly ajustes: GestorAjustes,
    private readonly raizUI: HTMLElement,
    alCerrar: () => void,
    private readonly telemetria: PuenteTelemetria,
    private readonly dificultad: PuenteDificultad,
  ) {
    super('panel');
    const caja = document.createElement('div');
    caja.className = 'panel__caja';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Ajustes');

    const cabecera = document.createElement('div');
    cabecera.className = 'panel__cabecera';
    cabecera.innerHTML = '<h2 class="panel__titulo">Ajustes</h2>';
    cabecera.appendChild(crearBoton('Cerrar ajustes', alCerrar, { icono: 'cerrar' }));

    this.pestanas = document.createElement('div');
    this.pestanas.className = 'panel__pestanas';
    this.pestanas.setAttribute('role', 'tablist');

    this.cuerpo = document.createElement('div');
    this.cuerpo.className = 'panel__cuerpo';

    const pie = document.createElement('div');
    pie.className = 'panel__pie';
    pie.append(
      crearBoton('Restablecer', () => void this.restablecer(), { clase: 'boton--contorno' }),
      crearBoton('Volver', alCerrar, { clase: 'boton--contorno' }),
    );

    caja.append(cabecera, this.pestanas, this.cuerpo, pie);
    this.elemento.appendChild(caja);
    this.alVolver = alCerrar;
  }

  protected alMostrar(): void {
    this.dibujar();
  }

  private async restablecer(): Promise<void> {
    const ok = await confirmar(this.raizUI, '¿Restablecer todos los ajustes a sus valores originales?', 'Restablecer');
    if (ok) {
      this.ajustes.restablecer();
      this.dibujar();
    }
  }

  private dibujar(): void {
    this.pestanas.replaceChildren();
    for (const id of Object.keys(NOMBRES) as Pestana[]) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'pestana';
      boton.dataset.navegable = '';
      boton.setAttribute('role', 'tab');
      boton.setAttribute('aria-selected', String(id === this.pestana));
      boton.textContent = NOMBRES[id];
      boton.addEventListener('click', () => {
        this.pestana = id;
        this.dibujar();
        boton.focus();
      });
      this.pestanas.appendChild(boton);
    }
    this.cuerpo.replaceChildren(...this.contenido());
    this.cuerpo.scrollTop = 0;
  }

  private contenido(): HTMLElement[] {
    const a = this.ajustes;
    const v = a.valores;
    switch (this.pestana) {
      case 'juego':
        return [this.selectorDificultad()];
      case 'video':
        return [
          crearSelector({
            etiqueta: 'Calidad gráfica',
            ayuda: 'Automática ajusta según tu equipo. La resolución también se adapta sola si bajan los FPS.',
            opciones: [
              { valor: 'auto', texto: 'Auto' },
              { valor: 'baja', texto: 'Baja' },
              { valor: 'media', texto: 'Media' },
              { valor: 'alta', texto: 'Alta' },
            ],
            valor: v.calidad,
            alCambiar: (c) => a.cambiar('calidad', c),
          }),
          crearDeslizador({
            etiqueta: 'Brillo',
            ayuda: 'Ajusta hasta que el cuadro izquierdo sea casi invisible.',
            minimo: 0.5,
            maximo: 1.8,
            paso: 0.05,
            valor: v.brillo,
            formato: porcentaje,
            alCambiar: (b) => {
              a.cambiar('brillo', b);
              this.actualizarCalibracion(b);
            },
          }),
          this.crearCalibracion(v.brillo),
          crearDeslizador({
            etiqueta: 'Campo de visión',
            minimo: 60,
            maximo: 95,
            paso: 1,
            valor: v.campoVision,
            formato: (f) => `${f}°`,
            alCambiar: (f) => a.cambiar('campoVision', f),
          }),
          crearInterruptor({
            etiqueta: 'Balanceo de cabeza',
            ayuda: 'Desactívalo si te mareas.',
            valor: v.movimientoCabeza,
            alCambiar: (b) => a.cambiar('movimientoCabeza', b),
          }),
          crearInterruptor({ etiqueta: 'Mostrar FPS', valor: v.mostrarFps, alCambiar: (b) => a.cambiar('mostrarFps', b) }),
        ];
      case 'audio':
        return [
          crearDeslizador({ etiqueta: 'Volumen general', minimo: 0, maximo: 1, paso: 0.05, valor: v.volumenMaestro, formato: porcentaje, alCambiar: (x) => a.cambiar('volumenMaestro', x) }),
          crearDeslizador({ etiqueta: 'Efectos', ayuda: 'Pasos, puertas, la criatura.', minimo: 0, maximo: 1, paso: 0.05, valor: v.volumenEfectos, formato: porcentaje, alCambiar: (x) => a.cambiar('volumenEfectos', x) }),
          crearDeslizador({ etiqueta: 'Ambiente', ayuda: 'El edificio: zumbidos, goteras, maderas.', minimo: 0, maximo: 1, paso: 0.05, valor: v.volumenAmbiente, formato: porcentaje, alCambiar: (x) => a.cambiar('volumenAmbiente', x) }),
        ];
      case 'controles':
        return [
          crearDeslizador({ etiqueta: 'Sensibilidad de la mirada', minimo: 0.2, maximo: 3, paso: 0.05, valor: v.sensibilidad, formato: (s) => s.toFixed(2), alCambiar: (s) => a.cambiar('sensibilidad', s) }),
          crearInterruptor({ etiqueta: 'Invertir eje vertical', valor: v.invertirY, alCambiar: (b) => a.cambiar('invertirY', b) }),
          crearInterruptor({ etiqueta: 'Vibración', ayuda: 'Mando y celulares Android.', valor: v.vibracion, alCambiar: (b) => a.cambiar('vibracion', b) }),
          crearDeslizador({ etiqueta: 'Tamaño de los controles táctiles', minimo: 0.8, maximo: 1.4, paso: 0.05, valor: v.tamanoControles, formato: porcentaje, alCambiar: (t) => a.cambiar('tamanoControles', t) }),
          this.crearReferencia(),
        ];
      case 'accesibilidad':
        return [
          crearInterruptor({ etiqueta: 'Subtítulos', valor: v.subtitulos, alCambiar: (b) => a.cambiar('subtitulos', b) }),
          crearInterruptor({
            etiqueta: 'Subtítulos de sonidos con dirección',
            ayuda: 'Describe los sonidos importantes e indica de dónde vienen (← → ↑ ↓).',
            valor: v.subtitulosEfectos,
            alCambiar: (b) => a.cambiar('subtitulosEfectos', b),
          }),
          crearInterruptor({
            etiqueta: 'Reducir destellos y sacudidas',
            ayuda: 'Suaviza parpadeos de pantalla, interferencias y temblores de cámara.',
            valor: v.reducirDestellos,
            alCambiar: (b) => a.cambiar('reducirDestellos', b),
          }),
          crearInterruptor({
            etiqueta: 'Sin sustos fuertes',
            ayuda: 'Al morir y en el final no aparece su cara ni suena el grito fuerte: la pantalla se funde a negro.',
            valor: v.sinSustosFuertes,
            alCambiar: (b) => a.cambiar('sinSustosFuertes', b),
          }),
          crearInterruptor({
            etiqueta: 'Ayuda visual del aire',
            ayuda: 'Al contener la respiración con poco aire, el borde de la pantalla late y un subtítulo avisa antes del jadeo. Historia la trae siempre.',
            valor: v.ayudaVisualAire,
            alCambiar: (b) => a.cambiar('ayudaVisualAire', b),
          }),
          crearInterruptor({
            etiqueta: 'Indicador del aire siempre visible',
            ayuda: 'Difícil y Pesadilla lo ocultan; con esto se ve siempre. La accesibilidad no depende de la dificultad.',
            valor: v.indicadorAireSiempre,
            alCambiar: (b) => a.cambiar('indicadorAireSiempre', b),
          }),
        ];
      case 'pruebas':
        return this.contenidoPruebas();
    }
  }

  /**
   * La dificultad. Desde el menú: la de la próxima partida nueva. En plena partida: la de esta, que se cambia al
   * instante (bajar nunca se bloquea ni se castiga). La que no guarda (Pesadilla) solo se elige al empezar.
   */
  private selectorDificultad(): HTMLElement {
    const d = this.dificultad;
    const enCurso = d.enCurso();
    const noGuarda = (id: IdDificultad) => TABLA_DIFICULTAD[id].puntosControl === 'ninguno';
    if (enCurso === null) {
      return crearSelector({
        etiqueta: 'Dificultad',
        ayuda: 'La próxima partida nueva empieza en esta dificultad.',
        opciones: DIFICULTADES.map((id) => ({ valor: id, texto: NOMBRE_DIFICULTAD[id], deshabilitada: noGuarda(id) && !d.pesadillaDesbloqueada() })),
        valor: this.ajustes.valores.dificultad,
        alCambiar: (id) => this.ajustes.cambiar('dificultad', id),
      });
    }
    return crearSelector({
      etiqueta: 'Dificultad de esta partida',
      ayuda: 'Puedes bajarla cuando quieras: se aplica al instante y no pierdes nada de lo que llevas. Pesadilla solo se elige al empezar una partida nueva.',
      opciones: DIFICULTADES.map((id) => ({ valor: id, texto: NOMBRE_DIFICULTAD[id], deshabilitada: noGuarda(id) && id !== enCurso })),
      valor: enCurso,
      alCambiar: (id) => void this.cambiarEnCurso(id),
    });
  }

  private async cambiarEnCurso(id: IdDificultad): Promise<void> {
    const d = this.dificultad;
    const guardada = d.guardada();
    // Si esta partida aún no tiene guardado propio (Pesadilla), al cambiar empezará a guardarse y reemplazará
    // la que haya: lo digo exacto antes. Sin partida guardada, no hay nada que avisar.
    if (d.enCursoSinGuardado() && TABLA_DIFICULTAD[id].puntosControl !== 'ninguno' && guardada) {
      const texto = `Tu partida guardada (${NOMBRE_DIFICULTAD[guardada]}) se reemplazará en el próximo punto de control. Hasta ese primer guardado, si mueres, empiezas de cero.`;
      const ok = await confirmar(this.raizUI, texto, `Cambiar a ${NOMBRE_DIFICULTAD[id]}`);
      if (!ok) {
        this.dibujar();
        return;
      }
    }
    d.cambiarEnCurso(id, 'ajustes');
    this.ajustes.cambiar('dificultad', id);
    this.dibujar();
  }

  /** Pestaña de pruebas: encender la telemetría local, exportarla y borrarla. */
  private contenidoPruebas(): HTMLElement[] {
    const t = this.telemetria;
    const estado = document.createElement('p');
    estado.className = 'fila-ajuste__ayuda';
    estado.setAttribute('role', 'status');
    const contador = document.createElement('span');
    contador.className = 'fila-ajuste__etiqueta';
    const refrescar = () => (contador.textContent = String(t.contarSesiones()));
    refrescar();

    const exportar = crearBoton('Exportar (.json)', () => {
      estado.textContent = t.exportarTodo() ? 'Archivo descargado.' : 'Todavía no hay sesiones guardadas.';
    }, { clase: 'boton--contorno' });
    const borrarBoton = crearBoton('Borrar', () => void this.borrarTelemetria(estado, refrescar), { clase: 'boton--contorno' });
    const acciones = document.createElement('div');
    acciones.className = 'panel__acciones-fila';
    acciones.append(exportar, borrarBoton);

    const nota = document.createElement('div');
    nota.className = 'creditos__texto';
    nota.innerHTML = `
      <p>Durante una prueba, quien observa puede pulsar <strong>F9</strong> para marcar un momento (un salto, un grito, una pausa larga).</p>
      <p>Para mandar un enlace que ya la traiga activada, agrega <strong>?telemetria=1</strong> a la dirección del juego.</p>`;

    return [
      crearInterruptor({
        etiqueta: 'Registrar sesiones de prueba',
        ayuda: 'Guarda en este dispositivo cómo juegas (tiempos, sustos, muertes) para mejorar el miedo. No se envía nada a internet. Empieza a contar desde la próxima partida.',
        valor: this.ajustes.valores.telemetria,
        alCambiar: (b) => this.ajustes.cambiar('telemetria', b),
      }),
      crearFila('Sesiones guardadas', 'Se guardan como máximo las 12 más recientes.', contador),
      crearFila('Registros', undefined, acciones),
      estado,
      nota,
    ];
  }

  private async borrarTelemetria(estado: HTMLElement, refrescar: () => void): Promise<void> {
    const ok = await confirmar(this.raizUI, '¿Borrar todas las sesiones de prueba guardadas en este dispositivo?', 'Borrar');
    if (!ok) return;
    this.telemetria.borrarTodo();
    refrescar();
    estado.textContent = 'Registros borrados.';
  }

  private muestraCalibracion: HTMLDivElement | null = null;

  private crearCalibracion(brillo: number): HTMLDivElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'calibracion';
    contenedor.innerHTML = '<div class="calibracion__muestra"><span><i></i></span><span><i></i></span><span><i></i></span></div><span>Apenas visible · Visible · Claro</span>';
    this.muestraCalibracion = contenedor;
    this.actualizarCalibracion(brillo);
    return contenedor;
  }

  private actualizarCalibracion(brillo: number): void {
    const iconos = this.muestraCalibracion?.querySelectorAll('i');
    if (!iconos) return;
    [5, 12, 26].forEach((base, i) => {
      const valor = Math.min(255, Math.round(base * brillo));
      (iconos[i] as HTMLElement).style.background = `rgb(${valor},${valor},${valor})`;
    });
  }

  private crearReferencia(): HTMLDivElement {
    const tabla = document.createElement('div');
    tabla.className = 'creditos__texto';
    tabla.innerHTML = `
      <h3>Teclado y ratón</h3>
      <p>WASD mover · Ratón mirar · Shift correr · C agacharse · E / clic interactuar · F linterna · Q contener respiración · Clic derecho / Tab escuchar · G señuelo · Esc pausa</p>
      <h3>Mando</h3>
      <p>Stick izq. mover · Stick der. mirar · L3 / LT correr · B agacharse · A interactuar · Y linterna · RB contener respiración · LB escuchar · X señuelo · Start pausa</p>
      <h3>Pantalla táctil</h3>
      <p>Pulgar izquierdo: joystick (llévalo al borde para correr) · Arrastra a la derecha para mirar · Botones a la derecha</p>`;
    return tabla;
  }
}
