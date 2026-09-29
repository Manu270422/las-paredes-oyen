// Aquí envuelvo localStorage. En modo incógnito o con el almacenamiento
// bloqueado, localStorage lanza errores, así que todo va dentro de try/catch
// para que el juego nunca se rompa por no poder guardar.

const PREFIJO = 'las-paredes-oyen:';

export function leerJSON<T>(clave: string): T | null {
  try {
    const texto = window.localStorage.getItem(PREFIJO + clave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

export function escribirJSON(clave: string, valor: unknown): boolean {
  try {
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/** Leo el texto tal cual (null si no existe). Sirve para distinguir "vacío" de "dañado". */
export function leerTexto(clave: string): string | null {
  try {
    return window.localStorage.getItem(PREFIJO + clave);
  } catch {
    return null;
  }
}

export function escribirTexto(clave: string, texto: string): boolean {
  try {
    window.localStorage.setItem(PREFIJO + clave, texto);
    return true;
  } catch {
    return false;
  }
}

export function borrar(clave: string): void {
  try {
    window.localStorage.removeItem(PREFIJO + clave);
  } catch {
    // Si no puedo borrar, no pasa nada grave.
  }
}
