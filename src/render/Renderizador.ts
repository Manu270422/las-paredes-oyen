// Aquí envuelvo el WebGLRenderer de Three.js (lo uso como librería de
// dibujo, no como motor). Me encargo de: calidad, tamaño de pantalla,
// densidad de píxeles, sombras, postprocesado y RESOLUCIÓN DINÁMICA,
// que baja la resolución sola si el equipo no mantiene los FPS.
import {
  ACESFilmicToneMapping,
  NoToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
  type Scene,
} from 'three';
import type { PerfilCalidad } from '../config/PerfilesCalidad';
import { PostProceso, type ParametrosEfectos } from './PostProceso';

/** Si el promedio de fotograma pasa de esto, bajo resolución (~40 FPS). */
const LIMITE_LENTO = 1 / 40;
/** Si baja de esto, subo resolución de nuevo (~58 FPS). */
const LIMITE_RAPIDO = 1 / 57;

export class Renderizador {
  readonly webgl: WebGLRenderer;
  readonly efectos: ParametrosEfectos = { estres: 0, escuchando: 0, interferencia: 0, pulso: 0, susto: 0 };
  brillo = 1;
  reducirDestellos = false;

  private perfil: PerfilCalidad;
  private post: PostProceso | null = null;
  private ancho = 1;
  private alto = 1;
  private escalaDinamica = 1;
  private tiempoAcumulado = 0;
  private fotogramas = 0;
  private tiempoTotal = 0;

  constructor(lienzo: HTMLCanvasElement, perfil: PerfilCalidad) {
    this.webgl = new WebGLRenderer({
      canvas: lienzo,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.webgl.outputColorSpace = SRGBColorSpace;
    this.webgl.shadowMap.type = PCFShadowMap;
    this.perfil = perfil;
    this.aplicarPerfil(perfil);
  }

  /** Reviso si la GPU puede renderizar en buffers de media precisión (HDR). */
  private soportaHDR(): boolean {
    const ext = this.webgl.extensions;
    return ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
  }

  aplicarPerfil(perfil: PerfilCalidad): void {
    this.perfil = perfil;
    this.webgl.shadowMap.enabled = perfil.sombras;
    const quierePost = perfil.postproceso && this.soportaHDR();
    if (quierePost && !this.post) this.post = new PostProceso(perfil.muestrasMSAA);
    if (quierePost && this.post) this.post.fijarMuestras(perfil.muestrasMSAA);
    if (!quierePost && this.post) {
      this.post.liberar();
      this.post = null;
    }
    // Sin postprocesado dejo que Three.js haga el tone mapping y uso un grano CSS barato.
    this.webgl.toneMapping = this.post ? NoToneMapping : ACESFilmicToneMapping;
    document.body.classList.toggle('sin-postproceso', !this.post);
    this.escalaDinamica = 1;
    this.redimensionar(this.ancho, this.alto);
  }

  redimensionar(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    const densidad =
      Math.min(window.devicePixelRatio || 1, this.perfil.pixelRatioMaximo) *
      this.perfil.escalaResolucion *
      this.escalaDinamica;
    this.webgl.setPixelRatio(densidad);
    // false: no toco el estilo CSS del lienzo; el CSS ya lo estira al 100%.
    this.webgl.setSize(ancho, alto, false);
    this.post?.redimensionar(Math.floor(ancho * densidad), Math.floor(alto * densidad));
  }

  /** Mido el rendimiento real y ajusto la resolución cada 2 segundos. */
  private ajustarResolucion(dtReal: number): void {
    // Ignoro saltos enormes (cambio de pestaña) para no sesgar el promedio.
    if (dtReal > 0.25) return;
    this.tiempoAcumulado += dtReal;
    this.fotogramas++;
    if (this.tiempoAcumulado < 2) return;
    const promedio = this.tiempoAcumulado / this.fotogramas;
    this.tiempoAcumulado = 0;
    this.fotogramas = 0;
    let nueva = this.escalaDinamica;
    if (promedio > LIMITE_LENTO) nueva = Math.max(0.5, nueva - 0.1);
    else if (promedio < LIMITE_RAPIDO) nueva = Math.min(1, nueva + 0.05);
    if (Math.abs(nueva - this.escalaDinamica) > 0.001) {
      this.escalaDinamica = nueva;
      this.redimensionar(this.ancho, this.alto);
    }
  }

  get resolucionDinamica(): number {
    return this.escalaDinamica;
  }

  dibujar(escena: Scene, camara: Camera, dt: number, dtReal: number): void {
    this.tiempoTotal += dt;
    this.ajustarResolucion(dtReal);
    if (this.post) {
      this.post.dibujar(this.webgl, escena, camara, this.tiempoTotal, this.brillo, this.reducirDestellos, this.efectos);
    } else {
      this.webgl.toneMappingExposure = this.brillo;
      this.webgl.render(escena, camara);
    }
  }
}
