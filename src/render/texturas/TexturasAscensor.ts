// Aquí pinto lo que se lee en un ascensor: el indicador de piso sobre las puertas (cifras de luz naranja y la
// flecha del viaje) y la placa del panel con los números de cada botón. El indicador SÍ brilla: es lo único con luz
// propia en un pasillo a oscuras, y por eso atrae la mirada (y miente un poco: dice que todo funciona).
import { CanvasTexture, SRGBColorSpace } from 'three';

const FAMILIA = '"Courier New", Courier, monospace';
const ANCHO_INDICADOR = 128;
const ALTO_INDICADOR = 64;

function lienzo(ancho: number, alto: number): { lienzo: HTMLCanvasElement; c: CanvasRenderingContext2D } {
  const l = document.createElement('canvas');
  l.width = ancho;
  l.height = alto;
  const c = l.getContext('2d');
  if (!c) throw new Error('No pude crear un contexto 2D para el ascensor.');
  return { lienzo: l, c };
}

/** El indicador de piso: un lienzo que vuelvo a pintar cuando cambia lo que marca. */
export class IndicadorPiso {
  readonly textura: CanvasTexture;
  private readonly c: CanvasRenderingContext2D;
  private ultimo = '';

  constructor() {
    const { lienzo: l, c } = lienzo(ANCHO_INDICADOR, ALTO_INDICADOR);
    this.c = c;
    this.textura = new CanvasTexture(l);
    this.textura.colorSpace = SRGBColorSpace;
    this.pintar('', 0, false);
  }

  /** `flecha`: 1 sube, -1 baja, 0 quieto. Apagado, el vidrio queda negro con las cifras fantasma del "8". */
  pintar(numero: string, flecha: number, encendido: boolean): void {
    const clave = `${numero}|${flecha}|${encendido}`;
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    const c = this.c;
    const w = ANCHO_INDICADOR;
    const h = ALTO_INDICADOR;
    c.fillStyle = '#070504';
    c.fillRect(0, 0, w, h);
    c.font = `bold 46px ${FAMILIA}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // Las cifras fantasma: el segmento apagado que se adivina en todo indicador viejo.
    c.fillStyle = '#1c0f0a';
    c.fillText('8', w * 0.66, h * 0.54);
    if (encendido) {
      c.shadowColor = '#ff6a2a';
      c.shadowBlur = 10;
      c.fillStyle = '#ff7a3a';
      c.fillText(numero, w * 0.66, h * 0.54);
      if (flecha !== 0) {
        c.beginPath();
        const x = w * 0.25;
        const y = h * 0.5;
        const s = flecha > 0 ? -1 : 1;
        c.moveTo(x - 13, y - s * 9);
        c.lineTo(x + 13, y - s * 9);
        c.lineTo(x, y + s * 12);
        c.closePath();
        c.fill();
      }
      c.shadowBlur = 0;
    }
    this.textura.needsUpdate = true;
  }
}

/**
 * La placa del panel: acero oscuro gastado, un aro por botón (de arriba abajo, el piso más alto primero) con su
 * número grabado al lado. `filas` es cuántos botones caben; `numeros`, lo que dice cada uno.
 */
export function texturaPanel(numeros: readonly string[], anchoPx: number, altoPx: number, filaPx: (i: number) => number): CanvasTexture {
  const { lienzo: l, c } = lienzo(anchoPx, altoPx);
  const fondo = c.createLinearGradient(0, 0, anchoPx, altoPx);
  fondo.addColorStop(0, '#5a5a57');
  fondo.addColorStop(1, '#3d3d3a');
  c.fillStyle = fondo;
  c.fillRect(0, 0, anchoPx, altoPx);
  // Rayones finos del cepillado y la mugre de los dedos alrededor de los botones.
  c.globalAlpha = 0.08;
  c.fillStyle = '#000';
  for (let y = 0; y < altoPx; y += 3) c.fillRect(0, y, anchoPx, 1);
  c.globalAlpha = 1;
  c.font = `bold ${Math.round(anchoPx * 0.22)}px ${FAMILIA}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  numeros.forEach((n, i) => {
    const y = filaPx(i);
    c.fillStyle = 'rgba(20, 14, 10, 0.35)';
    c.beginPath();
    c.arc(anchoPx * 0.62, y, anchoPx * 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1b1b19';
    c.fillText(n, anchoPx * 0.26, y + 1);
    c.fillStyle = '#8c8c86';
    c.fillText(n, anchoPx * 0.26, y);
  });
  // Arriba, la placa de siempre: carga máxima y un tornillo en cada esquina.
  c.fillStyle = '#20201e';
  c.font = `${Math.round(anchoPx * 0.1)}px ${FAMILIA}`;
  c.fillText('4 PERSONAS', anchoPx / 2, altoPx * 0.06);
  c.fillText('300 KG', anchoPx / 2, altoPx * 0.11);
  for (const [x, y] of [
    [0.1, 0.03],
    [0.9, 0.03],
    [0.1, 0.97],
    [0.9, 0.97],
  ]) {
    c.fillStyle = '#2a2a28';
    c.beginPath();
    c.arc(anchoPx * x, altoPx * y, anchoPx * 0.04, 0, Math.PI * 2);
    c.fill();
  }
  const t = new CanvasTexture(l);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
