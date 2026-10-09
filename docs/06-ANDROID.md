# Android y Play Store

> El juego web (la carpeta `dist/`) va dentro de una app de Android con **Capacitor 8**. Es el mismo juego:
> WebGL 2, Web Audio y la interfaz HTML, servidos desde dentro del APK (funciona sin internet).
> Creado el 2026-10-09.

## Qué tiene la app (además del juego web)

| Qué | Dónde | Por qué |
|---|---|---|
| Identidad `com.elmundodemanu.lasparedesoyen` | `capacitor.config.ts` | **Se puede cambiar hasta la primera subida a la Play Console; después queda fija para siempre** |
| Solo horizontal (`sensorLandscape`) | `android/app/src/main/AndroidManifest.xml` | El juego se juega acostado; gira solo entre los dos lados |
| Pantalla completa inmersiva y pantalla siempre encendida | `MainActivity.java` | Medir son 6 s sin tocar: la pantalla no se puede dormir |
| Arranque en negro | `res/values/styles.xml`, `colores_juego.xml` | Sin destello blanco al abrir |
| Botón "atrás": en juego pausa, en menús vuelve | `src/plataforma/AppNativa.ts`, `Juego.atras()` | Antes cerraba la app en plena partida. No finge un Escape: el juego creería que hay teclado y escondería los controles táctiles |
| "Exportar registro" abre el menú Compartir | `src/plataforma/CompartirArchivo.ts` | Dentro de la app, descargar un archivo no hace nada; así el tester lo manda por WhatsApp |
| Las llaves de firma nunca van a git | `android/.gitignore` | Quien tenga la llave puede publicar actualizaciones a nombre del juego |

## Compilar el APK de prueba

Requisitos (en el PC prestado del 2026-10-09 ya estaban): Android Studio (trae su JDK 21) y el SDK de Android.
El JDK del sistema puede ser más nuevo de lo que acepta Gradle: usar el de Android Studio.

```bash
npm run android          # compila el juego y lo copia a android/
cd android
# Git Bash:
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
# PowerShell:
#   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"; .\gradlew.bat assembleDebug
```

Sale en `android/app/build/outputs/apk/debug/app-debug.apk` (~7.7 MB). Para instalarlo en un celular: mandarlo
por WhatsApp o Drive y abrirlo (Android pide permitir "instalar apps de origen desconocido"), o por USB con
`adb install -r app-debug.apk`.

Para abrirlo en Android Studio: `npx cap open android`.

## Lo que falta para la Play Store

1. **Probar el APK en celulares reales** (no se ha visto correr en Android todavía: el PC no tenía emulador ni
   celular conectado). Revisar: arranca, se oye, los controles táctiles, el botón atrás, Exportar → Compartir,
   que la pantalla no se apague, FPS.
2. **Ícono propio** (hoy es el de Capacitor) y pantalla de la tienda (capturas, ícono 512×512, banner 1024×500).
3. **Llave de firma de publicación** (`keytool`), guardada FUERA del repo y con copia de seguridad. Si se pierde,
   no se puede actualizar la app nunca más (salvo con Play App Signing, que conviene activar).
4. **Cuenta de Google Play Console** (pago único de 25 USD, verificación de identidad: puede tardar días).
5. **AAB firmado**: `./gradlew bundleRelease` con la configuración de firma.
6. Ficha: política de privacidad (la telemetría es local y opcional: decirlo), clasificación de contenido
   (terror, violencia implícita), formulario de seguridad de datos, público objetivo (no menores).
7. **Prueba cerrada: ≥ 12 testers durante 14 días seguidos** (requisito de cuentas personales nuevas, según
   fuentes de desarrolladores; confirmarlo en la Play Console). Después, pedir acceso a producción y la revisión.

## Pendiente técnico conocido

- El texto del botón dice "Registro descargado" también en la app, donde en realidad se abre Compartir.
- La calidad "baja" apaga el HRTF (audio binaural): medirlo en celulares reales antes de decidir.
- `npm audit`: quedan 3 alertas moderadas de `uuid` dentro de la CLI de Capacitor (herramienta de desarrollo, no va
  en el juego). Su arreglo forzado bajaría de versión la CLI: no se aplicó.
