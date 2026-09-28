// Aquí genero el "cookie" de la linterna: la imagen que proyecta el foco.
// Una linterna real no ilumina un círculo perfecto: tiene un punto caliente,
// un anillo del reflector y suciedad en el vidrio. Ese detalle hace que la
// luz se sienta física y no de videojuego barato.
import { CanvasTexture, SRGBColorSpace } from 'three';
import { Ruido2D } from '../../utilidades/Ruido';

export function crearCookieLinterna(tamano = 256): CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = tamano;
  lienzo.height = tamano;
  const contexto = lienzo.getContext('2d');
  if (!contexto) throw new Error('No pude crear el cookie de la linterna.');
  const imagen = contexto.createImageData(tamano, tamano);
  const ruido = new Ruido2D(7);

  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      const u = (x + 0.5) / tamano - 0.5;
      const v = (y + 0.5) / tamano - 0.5;
      const r = Math.sqrt(u * u + v * v) * 2; // 0 en el centro, 1 en el borde
      // Punto caliente central + anillo del reflector + caída hacia el borde.
      const caliente = Math.exp(-r * r * 9) * 0.9;
      const anillo = Math.exp(-Math.pow((r - 0.62) / 0.07, 2)) * 0.35;
      const cuerpo = Math.max(0, 1 - Math.pow(r, 2.2)) * 0.45;
      const sucio = 0.82 + 0.18 * ruido.fractal(u * 8 + 4, v * 8 + 4, 4, 256);
      let intensidad = (caliente + anillo + cuerpo) * sucio;
      if (r > 0.98) intensidad = 0;
      const valor = Math.min(255, intensidad * 255);
      const i = (y * tamano + x) * 4;
      // Un poco más cálido en el centro, más frío en los bordes (lámpara incandescente vieja).
      imagen.data[i] = valor;
      imagen.data[i + 1] = valor * 0.95;
      imagen.data[i + 2] = valor * (0.82 + r * 0.12);
      imagen.data[i + 3] = 255;
    }
  }
  contexto.putImageData(imagen, 0, 0);
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}
