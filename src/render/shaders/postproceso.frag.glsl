// Aqui esta mi postprocesado de terror. Cada efecto existe por una razon:
// - Aberracion cromatica: crece con el estres; la vista "se rompe" cuando tengo miedo.
// - Vineta: se cierra al escuchar y con cada latido; reduce mi campo visual.
// - Grano: esconde el banding en la oscuridad y da textura de cinta/pelicula.
// - Interferencia: la criatura altera lo electrico, tambien mi percepcion.
// - Tone mapping ACES + sRGB: lo hago aqui porque renderizo en HDR a un buffer intermedio.

uniform sampler2D tEscena;
uniform vec2 uResolucion;
uniform float uTiempo;
uniform float uBrillo;
uniform float uEstres;
uniform float uEscuchando;
uniform float uInterferencia;
uniform float uPulso;
uniform float uSusto;
uniform float uReducirEfectos;

varying vec2 vUv;

float azar(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 aces(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 linealASrgb(vec3 c) {
  vec3 bajo = c * 12.92;
  vec3 alto = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(bajo, alto, step(vec3(0.0031308), c));
}

void main() {
  vec2 uv = vUv;
  vec2 centro = uv - 0.5;
  float suavizado = 1.0 - uReducirEfectos * 0.8;

  // Interferencia tipo cinta VHS: desplazo lineas horizontales al azar.
  float linea = floor(uv.y * 160.0);
  float cuadro = floor(uTiempo * 24.0);
  float salto = (azar(vec2(linea, cuadro)) - 0.5) * 0.05 * uInterferencia * suavizado;
  uv.x += salto * step(0.65, azar(vec2(linea * 0.13, cuadro * 0.7)));

  // Distorsion de lente leve cuando tengo miedo (la vision "se estira").
  float r2 = dot(centro, centro);
  uv += centro * r2 * 0.08 * (uEstres + uSusto) * suavizado;

  // Aberracion cromatica radial.
  float aberracion = (0.0015 + uEstres * 0.0045 + uSusto * 0.012 + uInterferencia * 0.01) * suavizado;
  vec2 desplazamiento = centro * aberracion;
  vec3 color;
  color.r = texture2D(tEscena, uv + desplazamiento).r;
  color.g = texture2D(tEscena, uv).g;
  color.b = texture2D(tEscena, uv - desplazamiento).b;

  // Exposicion (el ajuste de brillo del jugador) y tone mapping.
  color *= uBrillo;
  color = aces(color);

  // Paleta del juego: ligeramente desaturada y fria. Al escuchar, casi monocroma.
  float luminancia = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luminancia), 0.22 + uEscuchando * 0.45);
  color *= vec3(0.95, 1.0, 0.97);

  color = linealASrgb(color);

  // Vineta: se cierra al escuchar, con el latido y con el susto.
  float distancia = length(centro * vec2(1.0, 0.8));
  float exterior = 0.95 - uEscuchando * 0.28 - uPulso * 0.1 - uSusto * 0.15;
  float vineta = 1.0 - smoothstep(0.28, exterior, distancia);
  color *= mix(0.25, 1.0, vineta);

  // Grano animado: mas visible en las sombras, como en pelicula real.
  float grano = azar(uv * uResolucion + fract(uTiempo * 7.13) * 100.0) - 0.5;
  color += grano * (0.045 + uEstres * 0.03) * (1.0 - luminancia * 0.6);

  // Estatica cuando la interferencia es fuerte.
  float estatica = azar(uv * uResolucion * 0.5 + uTiempo);
  color = mix(color, vec3(estatica * 0.6), uInterferencia * 0.22 * suavizado);

  // Lineas de barrido sutiles durante la interferencia.
  color *= 1.0 - uInterferencia * 0.15 * step(0.5, fract(uv.y * uResolucion.y * 0.25));

  gl_FragColor = vec4(color, 1.0);
}
