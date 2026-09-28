// Aquí defino lo que la interfaz puede pedirle a la telemetría de pruebas.
// La UI no conoce el recolector: solo este contrato (encender, contar, exportar, borrar).

export interface PuenteTelemetria {
  activa(): boolean;
  contarSesiones(): number;
  /** Descarga todas las sesiones guardadas. false si no había ninguna. */
  exportarTodo(): boolean;
  /** Descarga solo la última sesión (la que se acaba de jugar). */
  exportarUltima(): boolean;
  borrarTodo(): void;
}
