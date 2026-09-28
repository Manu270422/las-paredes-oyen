// Aquí manejo mi propio postprocesado: renderizo la escena en un buffer HDR
// (media precisión) y luego lo paso por mi shader de terror a la pantalla.
// No uso el EffectComposer de ejemplos para tener control total y un solo pase barato.
import {
  HalfFloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import verticeGLSL from './shaders/postproceso.vert.glsl?raw';
import fragmentoGLSL from './shaders/postproceso.frag.glsl?raw';

export interface ParametrosEfectos {
  estres: number;
  escuchando: number;
  interferencia: number;
  pulso: number;
  susto: number;
}

export class PostProceso {
  private objetivo: WebGLRenderTarget;
  private readonly escenaPantalla = new Scene();
  private readonly camaraPantalla = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: ShaderMaterial;
  private readonly geometria = new PlaneGeometry(2, 2);

  constructor(muestras: number) {
    this.objetivo = this.crearObjetivo(1, 1, muestras);
    this.material = new ShaderMaterial({
      vertexShader: verticeGLSL,
      fragmentShader: fragmentoGLSL,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tEscena: { value: this.objetivo.texture },
        uResolucion: { value: new Vector2(1, 1) },
        uTiempo: { value: 0 },
        uBrillo: { value: 1 },
        uEstres: { value: 0 },
        uEscuchando: { value: 0 },
        uInterferencia: { value: 0 },
        uPulso: { value: 0 },
        uSusto: { value: 0 },
        uReducirEfectos: { value: 0 },
      },
    });
    const pantalla = new Mesh(this.geometria, this.material);
    pantalla.frustumCulled = false;
    this.escenaPantalla.add(pantalla);
  }

  private crearObjetivo(ancho: number, alto: number, muestras: number): WebGLRenderTarget {
    return new WebGLRenderTarget(ancho, alto, {
      type: HalfFloatType,
      samples: muestras,
      depthBuffer: true,
    });
  }

  /** Cambiar el MSAA exige recrear el buffer. */
  fijarMuestras(muestras: number): void {
    if (this.objetivo.samples === muestras) return;
    const { width, height } = this.objetivo;
    this.objetivo.dispose();
    this.objetivo = this.crearObjetivo(width, height, muestras);
    this.material.uniforms.tEscena.value = this.objetivo.texture;
  }

  redimensionar(ancho: number, alto: number): void {
    this.objetivo.setSize(Math.max(1, ancho), Math.max(1, alto));
    (this.material.uniforms.uResolucion.value as Vector2).set(ancho, alto);
  }

  dibujar(
    renderizador: WebGLRenderer,
    escena: Object3D,
    camara: Camera,
    tiempo: number,
    brillo: number,
    reducirEfectos: boolean,
    efectos: ParametrosEfectos,
  ): void {
    renderizador.setRenderTarget(this.objetivo);
    renderizador.render(escena, camara);
    renderizador.setRenderTarget(null);

    const u = this.material.uniforms;
    u.uTiempo.value = tiempo;
    u.uBrillo.value = brillo;
    u.uEstres.value = efectos.estres;
    u.uEscuchando.value = efectos.escuchando;
    u.uInterferencia.value = reducirEfectos ? efectos.interferencia * 0.3 : efectos.interferencia;
    u.uPulso.value = efectos.pulso;
    u.uSusto.value = efectos.susto;
    u.uReducirEfectos.value = reducirEfectos ? 1 : 0;
    renderizador.render(this.escenaPantalla, this.camaraPantalla);
  }

  liberar(): void {
    this.objetivo.dispose();
    this.material.dispose();
    this.geometria.dispose();
  }
}
