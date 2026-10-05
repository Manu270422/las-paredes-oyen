// Aquí construyo los modelos 3D pequeños de los objetos interactivos:
// hojas de papel, un diario, un casete, pilas, una llave, la cinta roja
// del punto de medición, el tablero eléctrico y la radio.
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
} from 'three';
import type { TipoDocumento } from '../../narrativa/TiposNarrativa';

const cache = new Map<string, MeshStandardMaterial>();
function mat(nombre: string, color: number, rugosidad = 0.8, metalico = 0, emisivo = 0): MeshStandardMaterial {
  let m = cache.get(nombre);
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: rugosidad, metalness: metalico, emissive: emisivo });
    cache.set(nombre, m);
  }
  return m;
}

function caja(a: number, h: number, p: number, material: MeshStandardMaterial, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(new BoxGeometry(a, h, p), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function modeloDocumento(tipo: TipoDocumento): Group {
  const g = new Group();
  const papel = mat('papel', 0xc9c1ad, 0.95);
  switch (tipo) {
    case 'orden': {
      // Tabla con pinza y hoja.
      g.add(caja(0.24, 0.008, 0.33, mat('tabla', 0x5a4632, 0.7), 0, 0.004, 0));
      g.add(caja(0.21, 0.002, 0.29, papel, 0, 0.009, 0.01));
      g.add(caja(0.08, 0.012, 0.03, mat('pinza', 0x777777, 0.4, 0.8), 0, 0.012, -0.15));
      g.rotation.y = 0.3;
      break;
    }
    case 'diario':
      g.add(caja(0.15, 0.03, 0.21, mat('tapa', 0x3b1d18, 0.6), 0, 0.015, 0));
      g.add(caja(0.14, 0.026, 0.2, papel, 0.004, 0.015, 0));
      g.rotation.y = -0.4;
      break;
    case 'cinta':
      g.add(caja(0.1, 0.012, 0.064, mat('casete', 0x1c1c1c, 0.5), 0, 0.006, 0));
      g.add(caja(0.07, 0.013, 0.025, mat('etiqueta', 0xb9ad8e, 0.9), 0, 0.007, -0.01));
      break;
    case 'nota': {
      const hoja = new Mesh(new PlaneGeometry(0.12, 0.15), papel);
      g.add(hoja);
      break;
    }
    case 'carta':
      g.add(caja(0.22, 0.004, 0.11, mat('sobre', 0xb8ad94, 0.95), 0, 0.002, 0));
      g.rotation.y = 0.7;
      break;
  }
  return g;
}

export function modeloPilas(): Group {
  const g = new Group();
  const cuerpo = mat('pila', 0x9a7a22, 0.4, 0.5);
  for (const x of [-0.018, 0.018]) {
    const pila = new Mesh(new CylinderGeometry(0.016, 0.016, 0.065, 12), cuerpo);
    pila.rotation.z = Math.PI / 2;
    pila.position.set(0, 0.016, x);
    g.add(pila);
  }
  return g;
}

export function modeloLlave(): Group {
  const g = new Group();
  const bronce = mat('bronce', 0xa08040, 0.35, 0.9);
  const aro = new Mesh(new TorusGeometry(0.014, 0.004, 6, 14), bronce);
  aro.rotation.x = Math.PI / 2;
  aro.position.set(-0.03, 0.004, 0);
  g.add(aro, caja(0.05, 0.004, 0.008, bronce, 0.01, 0.004, 0), caja(0.006, 0.004, 0.014, bronce, 0.03, 0.004, 0.006));
  // Una etiqueta de cartón que dice "402".
  g.add(caja(0.03, 0.002, 0.02, mat('etiqueta', 0xb9ad8e, 0.9), -0.06, 0.003, 0.01));
  return g;
}

/** La "X" de cinta roja en el piso que marca dónde medir. Visible solo con la linterna. */
export function modeloMarcaMedicion(): Group {
  const g = new Group();
  const cinta = mat('cintaRoja', 0x8a1a14, 0.6);
  const a = caja(0.5, 0.004, 0.05, cinta, 0, 0.002, 0);
  const b = caja(0.5, 0.004, 0.05, cinta, 0, 0.0025, 0);
  a.rotation.y = Math.PI / 4;
  b.rotation.y = -Math.PI / 4;
  g.add(a, b);
  return g;
}

export function modeloTablero(): { grupo: Group; palanca: Group; piloto: MeshStandardMaterial } {
  const grupo = new Group();
  const metal = mat('tableroMetal', 0x4b5357, 0.55, 0.6);
  grupo.add(caja(0.42, 0.6, 0.12, metal, 0, 0, 0.06));
  grupo.add(caja(0.36, 0.5, 0.01, mat('tableroInterior', 0x1a1b1c, 0.8), 0, 0, 0.125));
  // Fila de breakers.
  for (let i = 0; i < 6; i++) grupo.add(caja(0.035, 0.07, 0.03, mat('breaker', 0x0d0d0d, 0.5), -0.12 + i * 0.048, 0.12, 0.14));
  const palanca = new Group();
  palanca.add(caja(0.06, 0.14, 0.04, mat('palanca', 0x7a1510, 0.5), 0, 0.07, 0));
  palanca.position.set(0, -0.12, 0.15);
  palanca.rotation.x = 0.5;
  grupo.add(palanca);
  const piloto = new MeshStandardMaterial({ color: 0x220000, emissive: 0xff2200, emissiveIntensity: 0 });
  const luz = new Mesh(new CylinderGeometry(0.012, 0.012, 0.01, 10), piloto);
  luz.rotation.x = Math.PI / 2;
  luz.position.set(0.15, -0.2, 0.13);
  grupo.add(luz);
  return { grupo, palanca, piloto };
}

export function modeloRadio(): { grupo: Group; dial: MeshStandardMaterial } {
  const grupo = new Group();
  grupo.add(caja(0.3, 0.17, 0.12, mat('radioCaja', 0x3d2a1c, 0.6), 0, 0.085, 0));
  grupo.add(caja(0.12, 0.1, 0.005, mat('rejilla', 0x14110e, 0.9), -0.07, 0.09, 0.061));
  const dial = new MeshStandardMaterial({ color: 0x302010, emissive: 0xffa040, emissiveIntensity: 0 });
  grupo.add(caja(0.1, 0.03, 0.005, dial, 0.08, 0.12, 0.061));
  const perilla = new Mesh(new CylinderGeometry(0.015, 0.015, 0.02, 10), mat('perilla', 0x111111, 0.4));
  perilla.rotation.x = Math.PI / 2;
  perilla.position.set(0.08, 0.06, 0.065);
  grupo.add(perilla);
  return { grupo, dial };
}
