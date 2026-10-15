// Aquí está el modelo del citófono de una portería: un panel de plástico color hueso atornillado a la pared, con la
// rejilla del parlante arriba, la luz roja de "línea ocupada", y una fila por timbre: el nombre escrito a mano en una
// tira de papel y, al lado, el botón negro con su luz. Mira hacia +Z (lo gira quien lo pone).
// La lógica (qué suena, cuándo está ocupado) es de Citofono.ts: aquí solo se dibuja y se encienden luces.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { texturaEtiquetasCitofono } from '../../render/texturas/TexturasLetreros';

/** Lo que el citófono necesita de su dibujo (en las pruebas sin navegador, uno falso). */
export interface VistaCitofono {
  readonly grupo: Group;
  /** Dónde está el botón `i` (de arriba abajo), en el espacio del panel. */
  posicionBoton(i: number): { x: number; y: number; z: number };
  /** La luz junto al botón `i`. */
  fijarLuz(i: number, encendida: boolean): void;
  /** La luz roja de "línea ocupada". */
  fijarOcupado(ocupado: boolean): void;
}

/** Medidas en metros: el ancho del panel, su grosor, el alto de cada fila y lo que ocupa la rejilla de arriba. */
const PANEL = { ancho: 0.2, grosor: 0.03, fila: 0.075, cabecera: 0.085, pie: 0.03 } as const;

export class ModeloCitofono implements VistaCitofono {
  readonly grupo = new Group();
  private readonly luces: MeshStandardMaterial[] = [];
  private readonly ocupado: MeshStandardMaterial;
  private readonly alto: number;

  constructor(rotulos: readonly string[]) {
    const filas = rotulos.length;
    this.alto = PANEL.cabecera + PANEL.fila * filas + PANEL.pie;
    const frente = PANEL.grosor;
    const arriba = this.alto / 2;
    const plastico = new MeshStandardMaterial({ color: 0xc4b99d, roughness: 0.62 });
    const oscuro = new MeshStandardMaterial({ color: 0x24211e, roughness: 0.75 });
    const negro = new MeshStandardMaterial({ color: 0x151412, roughness: 0.45 });

    const placa = new Mesh(new BoxGeometry(PANEL.ancho, this.alto, PANEL.grosor), plastico);
    placa.position.z = frente / 2;
    this.grupo.add(placa);

    // La rejilla del parlante: cinco ranuras.
    for (let k = 0; k < 5; k++) {
      const ranura = new Mesh(new BoxGeometry(0.1, 0.005, 0.004), oscuro);
      ranura.position.set(-0.025, arriba - 0.022 - k * 0.011, frente + 0.001);
      this.grupo.add(ranura);
    }

    // La luz de "línea ocupada", arriba a la derecha.
    this.ocupado = new MeshStandardMaterial({ color: 0x2e0605, emissive: 0xff2414, emissiveIntensity: 0 });
    const ledOcupado = new Mesh(new BoxGeometry(0.012, 0.012, 0.006), this.ocupado);
    ledOcupado.position.set(0.07, arriba - 0.04, frente + 0.002);
    this.grupo.add(ledOcupado);

    // La tira de papel con los nombres, a la izquierda de los botones.
    const papel = new MeshStandardMaterial({ map: texturaEtiquetasCitofono(rotulos), roughness: 0.92 });
    const tira = new Mesh(new PlaneGeometry(0.11, PANEL.fila * filas), papel);
    tira.position.set(-0.035, arriba - PANEL.cabecera - (PANEL.fila * filas) / 2, frente + 0.0015);
    this.grupo.add(tira);

    // Un botón por fila, con su luz al lado.
    for (let i = 0; i < filas; i++) {
      const p = this.posicionBoton(i);
      const boton = new Mesh(new CylinderGeometry(0.015, 0.015, 0.012, 16), negro);
      boton.rotation.x = Math.PI / 2;
      boton.position.set(p.x, p.y, frente + 0.006);
      const luz = new MeshStandardMaterial({ color: 0x2a1d06, emissive: 0xffa22e, emissiveIntensity: 0 });
      const led = new Mesh(new BoxGeometry(0.008, 0.008, 0.005), luz);
      led.position.set(p.x + 0.032, p.y, frente + 0.002);
      this.luces.push(luz);
      this.grupo.add(boton, led);
    }
  }

  posicionBoton(i: number): { x: number; y: number; z: number } {
    return { x: 0.05, y: this.alto / 2 - PANEL.cabecera - PANEL.fila * (i + 0.5), z: PANEL.grosor + 0.012 };
  }

  fijarLuz(i: number, encendida: boolean): void {
    const luz = this.luces[i];
    if (luz) luz.emissiveIntensity = encendida ? 2.4 : 0;
  }

  fijarOcupado(ocupado: boolean): void {
    this.ocupado.emissiveIntensity = ocupado ? 2.6 : 0;
  }
}
