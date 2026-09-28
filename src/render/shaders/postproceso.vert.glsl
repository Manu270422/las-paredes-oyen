// Aqui dibujo un rectangulo que cubre toda la pantalla.
// No necesito camara: paso las posiciones directamente al espacio de recorte.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
