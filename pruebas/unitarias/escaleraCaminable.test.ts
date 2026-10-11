// La escalera que se camina, con el hueco REAL de los pisos 3 y 4 (3 x 2 celdas, boca al norte): medidas iguales a
// las que se dibujan, por dónde voy al entrar y salir, a qué altura piso, cuándo cruzo el descanso hacia otro piso
// y qué me tapa el paso dentro del pozo.
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config/ConfiguracionJuego';
import { puntoDentro } from '../../src/mundo/Colisiones';
import { EscaleraCaminable, type TramoPie } from '../../src/mundo/EscaleraCaminable';
import { encontrarHuecos, marcoDelHueco } from '../../src/mundo/HuecoEscalera';
import { Rejilla } from '../../src/mundo/Rejilla';
import { PISO_3 } from '../../src/pisos/piso3';

const rejilla = new Rejilla(PISO_3.mapa.rejilla);
const escalera = new EscaleraCaminable(marcoDelHueco(encontrarHuecos(rejilla)[0], CONFIG.celda), CONFIG.alturaTecho);
const m = escalera.medidas;
/** Un punto del marco local del hueco, en el mundo. */
const en = (u: number, v: number) => escalera.aMundo(u, v);
const ABIERTOS = { baja: false, sube: false };

/** Camino de punto en punto (marco local) recalculando por dónde voy, como el jugador cada fotograma. */
function caminar(puntos: ReadonlyArray<readonly [number, number]>, desde: TramoPie = 'piso'): TramoPie {
  let tramo = desde;
  for (const [u, v] of puntos) {
    const p = en(u, v);
    tramo = escalera.siguiente(tramo, p.x, p.z);
  }
  return tramo;
}

describe('Escalera que se camina', () => {
  it('tiene las medidas de la que se dibuja: tramos de 1.3 m, 8 contrahuellas por medio piso, descanso al fondo', () => {
    expect(m.ancho).toBeCloseTo(3.9, 5);
    expect(m.fondo).toBeCloseTo(2.6, 5);
    expect(m.anchoTramo).toBeCloseTo(1.3, 5);
    expect(m.contrahuella * 8).toBeCloseTo(CONFIG.alturaTecho / 2, 5);
    expect(m.inicioDescanso).toBeCloseTo(7 * m.huella, 5);
    expect(m.huella).toBeGreaterThan(0.2);
  });

  it('el marco local va y vuelve del mundo sin perderse', () => {
    const p = en(0.7, 1.1);
    const l = escalera.local(p.x, p.z);
    expect(l.u).toBeCloseTo(0.7, 6);
    expect(l.v).toBeCloseTo(1.1, 6);
  });

  it('por la izquierda bajo, por la derecha subo, y al salir por la boca vuelvo al piso', () => {
    expect(caminar([[0.65, -0.5], [0.65, 0.3]])).toBe('bajando');
    expect(caminar([[3.25, -0.5], [3.25, 0.3]])).toBe('subiendo');
    expect(caminar([[0.65, 1.0], [0.65, -0.3]], 'bajando')).toBe('piso');
  });

  it('dentro de un tramo sigo en él aunque cruce el descanso de lado a lado', () => {
    expect(caminar([[0.65, 0.3], [0.65, 2.1], [2.0, 2.1], [3.2, 2.1]])).toBe('bajando');
  });

  it('lejos del pozo estoy en el piso, aunque esté "detrás" de la boca en el plano (otro cuarto)', () => {
    // El 302 queda al sur del hueco: en el marco local su v es grande y positiva. No es la escalera.
    expect(escalera.siguiente('bajando', 14.5 * CONFIG.celda, 15 * CONFIG.celda)).toBe('piso');
  });

  it('cada huella baja (o sube) una contrahuella, y el descanso queda a medio piso', () => {
    const primera = en(0.65, m.huella / 2);
    expect(escalera.altura('bajando', primera.x, primera.z)).toBeCloseTo(-m.contrahuella, 6);
    expect(escalera.altura('subiendo', primera.x, primera.z)).toBeCloseTo(m.contrahuella, 6);
    const descanso = en(1.9, (m.inicioDescanso + m.fondo) / 2);
    expect(escalera.altura('bajando', descanso.x, descanso.z)).toBeCloseTo(-CONFIG.alturaTecho / 2, 6);
    expect(escalera.altura('piso', descanso.x, descanso.z)).toBe(0);
  });

  it('el descanso de abajo de un piso es el de arriba del piso de abajo: cambiar de piso ahí no se nota', () => {
    const p = en(2.4, 2.1);
    const abajo = escalera.altura('bajando', p.x, p.z);
    const arribaDelOtro = escalera.altura('subiendo', p.x, p.z);
    expect(abajo + CONFIG.alturaTecho).toBeCloseTo(arribaDelOtro, 6);
  });

  it('cruzo el descanso hacia el otro tramo pasando la mitad (con medio metro de margen para no ir y volver)', () => {
    const v = (m.inicioDescanso + m.fondo) / 2;
    const mitad = m.ancho / 2;
    const p = (u: number) => en(u, v);
    expect(escalera.cruce('bajando', p(mitad).x, p(mitad).z)).toBeNull();
    expect(escalera.cruce('bajando', p(mitad + 0.3).x, p(mitad + 0.3).z)).toBe('abajo');
    expect(escalera.cruce('subiendo', p(mitad + 0.3).x, p(mitad + 0.3).z)).toBeNull();
    expect(escalera.cruce('subiendo', p(mitad - 0.3).x, p(mitad - 0.3).z)).toBe('arriba');
    // En el tramo, antes del descanso, no cruzo nada aunque esté de ese lado.
    const tramo = en(3.2, 1.0);
    expect(escalera.cruce('bajando', tramo.x, tramo.z)).toBeNull();
  });

  it('el ojo entre los tramos y sus barandas no se pisan', () => {
    const cajas = escalera.cajas('piso', ABIERTOS);
    const ojo = en(m.ancho / 2, 0.8);
    expect(puntoDentro(ojo.x, ojo.z, cajas)).toBe(true);
    const tramo = en(0.65, 0.8);
    expect(puntoDentro(tramo.x, tramo.z, cajas)).toBe(false);
  });

  it('un tramo cerrado (la reja, las tablas) tapa su entrada; abierto, no', () => {
    const entrada = en(0.65, 0.09);
    expect(puntoDentro(entrada.x, entrada.z, escalera.cajas('piso', { baja: true, sube: false }))).toBe(true);
    expect(puntoDentro(entrada.x, entrada.z, escalera.cajas('piso', ABIERTOS))).toBe(false);
  });

  it('bajando, el tramo de la derecha (el que sigue hacia el piso de abajo) solo se alcanza cruzando el descanso', () => {
    const derecha = en(3.25, 1.0);
    expect(puntoDentro(derecha.x, derecha.z, escalera.cajas('bajando', ABIERTOS))).toBe(true);
    expect(puntoDentro(derecha.x, derecha.z, escalera.cajas('subiendo', ABIERTOS))).toBe(false);
    const izquierda = en(0.65, 1.0);
    expect(puntoDentro(izquierda.x, izquierda.z, escalera.cajas('subiendo', ABIERTOS))).toBe(true);
  });
});
