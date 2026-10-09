// Aquí entrego un archivo de texto desde la app de Android. Dentro de la app, el "descargar" del navegador no hace
// nada: guardo el archivo en la caché de la app y abro el menú Compartir del sistema (WhatsApp, correo, Drive...).
// En el navegador no hago nada y devuelvo false: ahí sigue la descarga de siempre.
import { Capacitor } from '@capacitor/core';

/** Devuelvo true si me encargo yo (estoy en la app); el archivo se comparte en segundo plano. */
export function compartirEnApp(nombre: string, contenido: string, titulo: string): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  void compartir(nombre, contenido, titulo);
  return true;
}

async function compartir(nombre: string, contenido: string, titulo: string): Promise<void> {
  try {
    // Los cargo solo dentro de la app: en la web no pesan nada.
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const { uri } = await Filesystem.writeFile({ path: nombre, data: contenido, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: titulo, files: [uri], dialogTitle: titulo });
  } catch (error) {
    // Cerrar el menú sin elegir nada también llega aquí: no es un fallo del juego.
    console.warn('No se pudo compartir el archivo', error);
  }
}
