// Aquí detecto qué tipo de dispositivo está usando el jugador para elegir
// la calidad inicial y decidir si muestro controles táctiles.
// Es solo el punto de partida: luego la resolución dinámica ajusta en vivo.
import type { NivelCalidad } from '../config/PerfilesCalidad';

export interface InfoDispositivo {
  esTactil: boolean;
  esMovil: boolean;
  memoriaGB: number;
  nucleos: number;
}

export function detectarDispositivo(): InfoDispositivo {
  const agente = navigator.userAgent;
  const punteroGrueso = window.matchMedia('(pointer: coarse)').matches;
  const tieneToque = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  // Los iPad modernos se presentan como Mac, así que también reviso los puntos táctiles.
  const esIPad = /Macintosh/.test(agente) && navigator.maxTouchPoints > 1;
  const esMovil = /Android|iPhone|iPad|iPod|Mobile/i.test(agente) || esIPad;
  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return {
    esTactil: punteroGrueso || (tieneToque && esMovil),
    esMovil,
    memoriaGB: memoria ?? 4,
    nucleos: navigator.hardwareConcurrency ?? 4,
  };
}

/** Sugiero una calidad inicial con heurísticas sencillas y conservadoras. */
export function sugerirCalidad(info: InfoDispositivo): NivelCalidad {
  if (info.esMovil) return info.memoriaGB >= 6 && info.nucleos >= 8 ? 'media' : 'baja';
  if (info.nucleos >= 8 && info.memoriaGB >= 8) return 'alta';
  return 'media';
}
