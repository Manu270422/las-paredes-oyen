// Aquí convierto la lista cruda de eventos de una sesión en las métricas que
// quiero mirar primero: ¿cuánto tardó en tener el primer susto? ¿de qué murió?
// ¿qué eventos del director nunca vio? ¿cuándo reaccionó de verdad?
// Es una función pura: la misma sesión siempre da el mismo resumen.
import type { RegistroEvento, ResumenSesion, SesionTelemetria } from './TiposTelemetria';

/** Primer momento en que ocurre un evento que cumple la condición. */
function primero(eventos: readonly RegistroEvento[], condicion: (e: RegistroEvento) => boolean): number | null {
  return eventos.find(condicion)?.t ?? null;
}

function contarPor(eventos: readonly RegistroEvento[], tipo: string, campo: string): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const e of eventos) {
    if (e.tipo !== tipo) continue;
    const clave = String(e.datos?.[campo] ?? 'desconocido');
    cuenta[clave] = (cuenta[clave] ?? 0) + 1;
  }
  return cuenta;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

export function resumirSesion(sesion: SesionTelemetria): ResumenSesion {
  const ev = sesion.eventos;
  const de = (tipo: string) => ev.filter((e) => e.tipo === tipo);

  // Un "susto" objetivo: algo fuerte del director, un encuentro, la caza o el susto directo.
  const esSusto = (e: RegistroEvento) =>
    (e.tipo === 'evento-director' && Number(e.datos?.intensidad) >= 2) ||
    (e.tipo === 'encuentro' && e.datos?.estado === 'inicio') ||
    (e.tipo === 'entidad' && e.datos?.estado === 'cazando') ||
    e.tipo === 'susto';

  // Tiempo por habitación: sumo los tramos entre cambios de habitación.
  const tiempoPorHabitacion: Record<string, number> = {};
  let habitacion: string | null = null;
  let desde = 0;
  for (const e of ev) {
    if (e.tipo === 'inicio' || e.tipo === 'reintento') {
      if (habitacion) tiempoPorHabitacion[habitacion] = (tiempoPorHabitacion[habitacion] ?? 0) + (e.t - desde);
      habitacion = (e.datos?.habitacion as string | null) ?? null;
      desde = e.t;
    } else if (e.tipo === 'habitacion') {
      if (habitacion) tiempoPorHabitacion[habitacion] = (tiempoPorHabitacion[habitacion] ?? 0) + (e.t - desde);
      habitacion = (e.datos?.hacia as string | null) ?? null;
      desde = e.t;
    }
  }
  if (habitacion) tiempoPorHabitacion[habitacion] = (tiempoPorHabitacion[habitacion] ?? 0) + (sesion.duracion - desde);
  for (const clave of Object.keys(tiempoPorHabitacion)) tiempoPorHabitacion[clave] = redondear(tiempoPorHabitacion[clave]);

  const reacciones = de('reaccion');
  const encuentros = de('encuentro');
  const curva = sesion.curva;
  const promedio = (valores: number[]) => (valores.length ? redondear(valores.reduce((a, b) => a + b, 0) / valores.length) : 0);

  return {
    tiempoPrimerMovimiento: primero(ev, (e) => e.tipo === 'primer-movimiento'),
    tiempoPrimerRuido: primero(ev, (e) => e.tipo === 'primer-ruido'),
    tiempoPrimeraMedicion: primero(ev, (e) => e.tipo === 'medicion' && e.datos?.estado === 'inicio'),
    tiempoPrimeraAparicion: primero(ev, (e) => e.tipo === 'entidad' && e.datos?.fisica === true),
    tiempoPrimerSusto: primero(ev, esSusto),
    tiempoPrimeraReaccionFuerte: primero(ev, (e) => e.tipo === 'reaccion' && e.datos?.fuerte === true),
    muertes: de('muerte').length,
    causasMuerte: contarPor(ev, 'muerte', 'motivo'),
    medicionesCompletas: de('medicion').filter((e) => e.datos?.estado === 'completa').length,
    medicionesCanceladas: de('medicion').filter((e) => e.datos?.estado === 'cancelada').length,
    motivosCancelacion: contarPor(
      ev.filter((e) => e.datos?.estado === 'cancelada'),
      'medicion',
      'motivo',
    ),
    senuelosUsados: de('grabadora').filter((e) => e.datos?.accion === 'senuelo-colocado').length,
    regresos: de('habitacion').filter((e) => e.datos?.regreso === true).length,
    tiempoPorHabitacion,
    eventosDirector: contarPor(ev, 'evento-director', 'id'),
    eventosVistos: de('evento-visto').length,
    eventosNoVistos: de('evento-no-visto').length,
    reaccionesFuertes: reacciones.filter((e) => e.datos?.fuerte === true).length,
    reaccionesTotales: reacciones.length,
    encuentros: {
      iniciados: encuentros.filter((e) => e.datos?.estado === 'inicio').length,
      superados: encuentros.filter((e) => e.datos?.estado === 'superado').length,
      fallidos: encuentros.filter((e) => e.datos?.estado === 'fallido').length,
    },
    imitaciones: contarPor(ev, 'imitacion', 'etapa'),
    marcasObservador: de('marca-observador').length,
    estresMedio: promedio(curva.map((m) => m.estres)),
    estresMaximo: redondear(Math.max(0, ...curva.map((m) => m.estres))),
    fpsMedio: promedio(curva.map((m) => m.fps)),
  };
}
