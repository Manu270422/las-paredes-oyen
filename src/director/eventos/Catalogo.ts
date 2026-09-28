// Aquí reúno todos los eventos que el director puede usar.
// Para agregar un evento nuevo: creo su archivo en esta carpeta y lo sumo aquí.
import type { EventoTerror } from '../TiposDirector';
import { golpesEnPared } from './GolpesEnPared';
import { pasosEco } from './PasosEco';
import { puertaCambiada } from './PuertaCambiada';
import { luzFalla } from './LuzFalla';
import { susurroLejano } from './SusurroLejano';
import { siluetaFugaz } from './SiluetaFugaz';
import { objetoMovido } from './ObjetoMovido';
import { silencioTotal } from './SilencioTotal';
import { respiracionDetras } from './RespiracionDetras';
import { radioEncendida } from './RadioEncendida';
import { pasosArriba } from './PasosArriba';
import { tuberiaGolpe } from './TuberiaGolpe';
import { rasgunoCercano } from './RasgunoCercano';

export const CATALOGO_EVENTOS: readonly EventoTerror[] = [
  golpesEnPared,
  pasosEco,
  puertaCambiada,
  luzFalla,
  susurroLejano,
  siluetaFugaz,
  objetoMovido,
  silencioTotal,
  respiracionDetras,
  radioEncendida,
  pasosArriba,
  tuberiaGolpe,
  rasgunoCercano,
];
