// Aquí creo y guardo todos los materiales del mundo. Cada material se
// arma con las texturas procedurales y se comparte entre todas las mallas
// que lo usan (así no multiplico memoria ni compilaciones de shader).
import { Color, MeshStandardMaterial, Vector2 } from 'three';
import { generarConjunto, type ConjuntoTexturas } from './texturas/GeneradorTexturas';
import { RECETAS, type IdTextura } from './texturas/RecetasTexturas';
import { cederHilo } from '../utilidades/Esperar';

export type IdMaterial =
  | 'paredPintura'
  | 'paredPapel'
  | 'paredAzulejo'
  | 'paredConcreto'
  | 'pisoGranito'
  | 'pisoParque'
  | 'pisoAzulejo'
  | 'pisoConcreto'
  | 'techo'
  | 'madera'
  | 'tela'
  | 'metal'
  | 'guardaescoba';

interface DefMaterial {
  textura: IdTextura | null;
  /** Metros que cubre una repetición de la textura. */
  escala: number;
  metalico: number;
  relieve: number;
  color?: number;
  rugosidad?: number;
}

const DEFINICIONES: Record<IdMaterial, DefMaterial> = {
  paredPintura: { textura: 'pinturaPasillo', escala: 2.7, metalico: 0, relieve: 0.8 },
  paredPapel: { textura: 'papelTapiz', escala: 2.7, metalico: 0, relieve: 0.6 },
  paredAzulejo: { textura: 'azulejo', escala: 2.7, metalico: 0, relieve: 1 },
  paredConcreto: { textura: 'concreto', escala: 2.7, metalico: 0, relieve: 1 },
  pisoGranito: { textura: 'granito', escala: 1.3, metalico: 0, relieve: 0.5 },
  pisoParque: { textura: 'parque', escala: 2.0, metalico: 0, relieve: 0.8 },
  pisoAzulejo: { textura: 'azulejo', escala: 1.3, metalico: 0, relieve: 1 },
  pisoConcreto: { textura: 'concreto', escala: 3, metalico: 0, relieve: 1 },
  techo: { textura: 'yeso', escala: 3, metalico: 0, relieve: 0.6 },
  madera: { textura: 'madera', escala: 1, metalico: 0, relieve: 0.7 },
  tela: { textura: 'tela', escala: 1.5, metalico: 0, relieve: 1 },
  metal: { textura: 'metal', escala: 1.5, metalico: 0.6, relieve: 0.6 },
  guardaescoba: { textura: null, escala: 1, metalico: 0, relieve: 0, color: 0x2a1c14, rugosidad: 0.6 },
};

export class BibliotecaMateriales {
  private readonly materiales = new Map<IdMaterial, MeshStandardMaterial>();
  private readonly texturas = new Map<IdTextura, ConjuntoTexturas>();
  private detalleTexturas = { tamano: 512, anisotropia: 4 };

  /** Con qué detalle se generaron las texturas (del perfil de calidad): lo que se pinte aparte lo sigue. */
  get detalle(): { readonly tamano: number; readonly anisotropia: number } {
    return this.detalleTexturas;
  }

  /** Genero todas las texturas y materiales. Reporto el progreso de 0 a 1. */
  async generar(tamano: number, anisotropia: number, alProgreso: (p: number) => void): Promise<void> {
    this.detalleTexturas = { tamano, anisotropia };
    const ids = Object.keys(RECETAS) as IdTextura[];
    for (let i = 0; i < ids.length; i++) {
      this.texturas.set(ids[i], generarConjunto(RECETAS[ids[i]], tamano, anisotropia));
      alProgreso((i + 1) / ids.length);
      // Suelto el hilo para que la pantalla de carga se pinte y el navegador no se congele.
      await cederHilo();
    }
    for (const [id, def] of Object.entries(DEFINICIONES) as [IdMaterial, DefMaterial][]) {
      const conjunto = def.textura ? this.texturas.get(def.textura) : undefined;
      const material = new MeshStandardMaterial({
        color: new Color(def.color ?? 0xffffff),
        map: conjunto?.color ?? null,
        normalMap: conjunto?.normal ?? null,
        normalScale: new Vector2(def.relieve, def.relieve),
        roughnessMap: conjunto?.rugosidad ?? null,
        roughness: def.rugosidad ?? 1,
        metalness: def.metalico,
      });
      material.name = id;
      this.materiales.set(id, material);
    }
  }

  obtener(id: IdMaterial): MeshStandardMaterial {
    const material = this.materiales.get(id);
    if (!material) throw new Error(`El material "${id}" no existe o no se ha generado.`);
    return material;
  }

  escala(id: IdMaterial): number {
    return DEFINICIONES[id].escala;
  }

  /** Cuando cambio sombras en caliente, los shaders deben recompilarse. */
  marcarParaRecompilar(): void {
    for (const material of this.materiales.values()) material.needsUpdate = true;
  }
}
