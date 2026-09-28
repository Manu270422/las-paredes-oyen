// Aquí defino los perfiles gráficos. Mi regla: el hardware limitado baja la
// resolución y quita efectos caros, pero NUNCA quita lo que genera miedo
// (oscuridad, linterna, audio espacial, niebla).

export type NivelCalidad = 'baja' | 'media' | 'alta';

export interface PerfilCalidad {
  /** Multiplicador de la resolución interna. */
  escalaResolucion: number;
  /** Límite de densidad de píxeles (en móviles con DPR 3 esto ahorra muchísimo). */
  pixelRatioMaximo: number;
  /** Sombras dinámicas de la linterna. */
  sombras: boolean;
  tamanoSombra: number;
  /** Tamaño en píxeles de las texturas procedurales. */
  tamanoTextura: number;
  anisotropia: number;
  /** Luces puntuales simultáneas (el resto se apagan por distancia). */
  lucesMaximas: number;
  /** Postprocesado HDR con grano, viñeta y aberración. */
  postproceso: boolean;
  /** Muestras de antialiasing en el render intermedio. */
  muestrasMSAA: number;
  /** Audio 3D binaural real (HRTF). En gama baja uso paneo simple. */
  audioHRTF: boolean;
}

export const PERFILES: Record<NivelCalidad, PerfilCalidad> = {
  baja: {
    escalaResolucion: 0.7,
    pixelRatioMaximo: 1,
    sombras: false,
    tamanoSombra: 256,
    tamanoTextura: 256,
    anisotropia: 1,
    lucesMaximas: 2,
    postproceso: false,
    muestrasMSAA: 0,
    audioHRTF: false,
  },
  media: {
    escalaResolucion: 0.85,
    pixelRatioMaximo: 1.5,
    sombras: true,
    tamanoSombra: 512,
    tamanoTextura: 512,
    anisotropia: 4,
    lucesMaximas: 4,
    postproceso: true,
    muestrasMSAA: 0,
    audioHRTF: true,
  },
  alta: {
    escalaResolucion: 1,
    pixelRatioMaximo: 2,
    sombras: true,
    tamanoSombra: 1024,
    tamanoTextura: 1024,
    anisotropia: 8,
    lucesMaximas: 6,
    postproceso: true,
    muestrasMSAA: 4,
    audioHRTF: true,
  },
};
