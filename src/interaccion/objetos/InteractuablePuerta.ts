// Aquí conecto la puerta con el jugador: abrir, cerrar, cerradura y llave.
// Regla de diseño: agachado abro y cierro despacio y casi sin ruido. De pie,
// la bisagra cruje y la criatura lo oye. Cada puerta es una decisión.
import type { Object3D, Vector3 } from 'three';
import { CONFIG } from '../../config/ConfiguracionJuego';
import type { ContextoJuego } from '../../nucleo/ContextoJuego';
import type { Puerta } from '../../mundo/Puerta';
import { vincular, type Interactuable } from '../Interactuable';

export class InteractuablePuerta implements Interactuable {
  readonly id: string;
  readonly objeto: Object3D;
  readonly activo = true;
  readonly celdaPropia: { readonly gx: number; readonly gy: number };

  constructor(readonly puerta: Puerta) {
    this.id = puerta.id;
    this.objeto = puerta.pivote;
    vincular(puerta.pivote, this);
    this.celdaPropia = { gx: puerta.gx, gy: puerta.gy };
  }

  puntoInteraccion(destino: Vector3): Vector3 {
    return this.puerta.puntoInteraccion(destino);
  }

  texto(ctx: ContextoJuego): string {
    const p = this.puerta;
    if (p.cerradaConLlave) return ctx.progreso.tieneObjeto(p.llave ?? '') ? 'Abrir con la llave' : 'Está cerrada con llave';
    if (p.abierta) return ctx.jugador.agachado ? 'Cerrar despacio' : 'Cerrar la puerta';
    return ctx.jugador.agachado ? 'Abrir despacio' : 'Abrir la puerta';
  }

  interactuar(ctx: ContextoJuego): void {
    const p = this.puerta;
    const posicion = { x: p.centro.x, y: 1.1, z: p.centro.z };
    const ruido = (intensidad: number) => ctx.bus.emit('ruido', { x: p.centro.x, z: p.centro.z, intensidad, origen: 'puerta', causa: 'puerta' });

    if (p.cerradaConLlave) {
      if (p.llave && ctx.progreso.tieneObjeto(p.llave)) {
        p.desbloquear();
        ctx.progreso.marcar(`abierta:${p.id}`);
        ctx.audio.reproducir('llave', { posicion, volumen: 0.8 });
        ctx.bus.emit('subtitulo', { texto: 'La llave entra. Gira con dificultad.', duracion: 3 });
        ctx.programador.despues(0.7, () => {
          p.abrir('lento');
          ctx.audio.reproducir('puerta_lenta', { posicion, volumen: 0.5 });
        });
        ruido(0.2);
      } else {
        ctx.audio.reproducir('cerradura', { posicion, volumen: 0.8 });
        ctx.bus.emit('subtitulo', { texto: 'Está cerrada con llave.', duracion: 2.5 });
        ruido(0.25);
      }
      return;
    }

    const lento = ctx.jugador.agachado;
    if (p.abierta) {
      p.cerrar(lento ? 'lento' : 'normal');
      ctx.audio.reproducir(lento ? 'puerta_lenta' : 'puerta_cerrar', { posicion, volumen: lento ? 0.25 : 0.7 });
      ruido(lento ? CONFIG.ruido.puertaLenta : CONFIG.ruido.puertaCerrada);
    } else {
      p.abrir(lento ? 'lento' : 'normal');
      ctx.audio.reproducir(lento ? 'puerta_lenta' : 'puerta_crujido', { posicion, volumen: lento ? 0.3 : 0.75 });
      ruido(lento ? CONFIG.ruido.puertaLenta : CONFIG.ruido.puertaNormal);
    }
    ctx.memoria.registrarPuertaUsada(p.id);
  }
}
