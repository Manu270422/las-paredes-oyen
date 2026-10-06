# Arquitectura

## Principios

1. **Cada cosa en su lugar**: una carpeta por responsabilidad, un archivo por concepto.
2. **Comunicación por eventos** (`nucleo/BusEventos.ts` + `nucleo/Eventos.ts`): el jugador emite `ruido`; la criatura, la grabadora y el HUD reaccionan sin conocerse.
3. **Contexto compartido** (`nucleo/ContextoJuego.ts`): referencias a todos los sistemas para eventos, estados de IA e interactuables.
4. **Pisos como paquetes** (`pisos/`): un piso es una carpeta con su mapa (rejilla de texto + habitaciones, puertas, luces, muebles e interactuables), objetivos, documentos, cintas, reglas y un guion opcional. El motor no nombra ningún piso; solo `pisos/catalogo.ts` los conoce.
5. **Estado derivado de banderas** (`narrativa/Progreso.ts`): puertas, luces y objetos se restauran leyendo banderas. Guardar = serializar banderas.
6. **Tiempo de juego, no reloj real** (`nucleo/Programador.ts`): los sustos programados se congelan al pausar.
7. **Nada temporal queda colgado** (`Programador.limpiarDespues`): una suscripción o efecto que debe durar N segundos registra su *limpieza*, que se ejecuta al vencer **o** al cancelar todo (muerte, menú, recarga). Antes, un eco del director podía quedar escuchando pasos para siempre.
8. **Cada ruido lleva su causa** (`Ruido.causa`, `Ruido.pared`): la criatura solo oye volumen, pero el juego sabe *qué* fue. Eso alimenta la muerte explicada, el mensaje de medición fallida y la telemetría.

## Estructura

```text
LasParedesOyen/
├─ index.html                  Contenedor: lienzo + capa de UI
├─ public/                     Manifiesto PWA (horizontal), ícono y audio/manifiesto.json (grabaciones reales)
├─ docs/                       Diseño, arquitectura, hoja de ruta
└─ src/
   ├─ main.ts                  Punto de entrada (estilos + arranque + errores)
   ├─ config/                  Constantes de diseño, perfiles de calidad, ajustes del jugador
   ├─ nucleo/                  Juego (orquestador), bucle, bus, eventos, programador, contexto
   ├─ plataforma/              Detección de dispositivo, pantalla, orientación, pantalla completa
   ├─ entrada/                 Acciones, teclado/ratón, mando, controles táctiles, glifos
   ├─ render/                  Renderizador, postprocesado, materiales
   │  ├─ shaders/              GLSL del postprocesado
   │  └─ texturas/             Generador procedural, recetas, cookie de la linterna
   ├─ audio/                   Motor, fuentes 3D, reverberación, ambiente, biblioteca
   │  └─ sintesis/             Sintetizador y recetas de los 39 sonidos
   ├─ mundo/                   Nivel, rejilla, geometría, puertas, lámparas, muebles, letreros, colisiones
   │  └─ datos/                Tipos de mapa (la forma; los mapas viven en cada piso)
   ├─ jugador/                 Jugador, cámara, respiración, corazón, linterna, grabadora
   ├─ interaccion/             Sistema de interacción e interactuables
   │  └─ objetos/              Puerta, documento, recogible, medición, tablero, radio, modelos
   ├─ ia/                      Entidad, modelo, navegación A*, percepción, memoria, FSM, imitador
   │  └─ estados/              Paredes, investigando (con encuentro), cazando, acechando, retirada
   ├─ director/                Director de terror, memoria del mundo, visibilidad
   │  └─ eventos/              13 eventos dinámicos + catálogo
   ├─ narrativa/               Progreso, acciones del guion, tipos de documento/objetivo/cinta, explicaciones de muerte
   ├─ pisos/                   Catálogo de pisos y la forma de un paquete (TiposPiso)
   │  └─ piso4/                El Piso 4: mapa, objetivos, documentos, cintas, guion y secuencia final
   ├─ telemetria/              Telemetría LOCAL de playtesting: recolector, almacén, resumen, reacción, vigilancia, ?telemetria=1
   ├─ guardado/                Sistema de guardado versionado
   ├─ ui/                      Gestor de UI, íconos, navegación con mando
   │  ├─ componentes/          Botón, deslizador, interruptor, selector, diálogo
   │  ├─ pantallas/            Carga, inicio, menú, pausa, ajustes, documentos, muerte, fin…
   │  └─ hud/                  Subtítulos, objetivo, tarjeta, pistas, interacción, estado, REC, FPS
   ├─ estilos/                 CSS separado: variables, base, componentes, pantallas, HUD, táctil…
   └─ utilidades/              Matemáticas, ruido, aleatorio con semilla, almacenamiento
```

## Flujo de un fotograma (estado "jugando")

```
entrada → jugador (movimiento, ruido, respiración) → interacción → grabadora
→ criatura (FSM + imitador) → director → guion → memoria del mundo → linterna → nivel
→ audio (oyente, oclusión, reverb) → telemetría (solo si está activa) → HUD → postprocesado → dibujo
```

## Telemetría de pruebas (`telemetria/`)

- **Solo escucha el bus**: no llama ni modifica ningún sistema. Si se borra la carpeta, el juego funciona igual.
- `Telemetria.ts` recolecta eventos, muestrea la *curva del miedo* cada 5 s y autoguarda cada 20 s.
- `ReaccionJugador.ts` mide la reacción en los 3 s siguientes a un estímulo (giro, congelarse, escuchar, contener el aire).
- `VigilanciaEvento.ts` comprueba durante 45 s si el jugador llegó a *ver* lo que el director cambió.
- `ResumenSesion.ts` (función pura) calcula las métricas derivadas al cerrar la sesión.
- `AlmacenTelemetria.ts` guarda hasta 12 sesiones en `localStorage` y exporta `.json`.
- Apagada por defecto. Se enciende en Ajustes → Pruebas o con `?telemetria=1`. F9 = marca del observador.
- Una sesión va de *Nueva partida / Continuar* hasta el final, el menú o el cierre; los reintentos tras morir son la misma sesión.

## Eventos del bus añadidos en el Sprint 1

`evento-director`, `director-fase`, `grabadora`, `imitacion`, `encuentro`. Además se empezaron a emitir
`susto`, `jugador-atrapado` (con `motivo` y `enPared`), `fin-demo` y `documento`, que estaban declarados pero nadie publicaba.

## Añadidos en el Sprint 2

- Bus: `director-adaptacion` (estilo dominante del jugador y alivio), `grabacion-captada` (huellas y presencia de cada cinta);
  `evento-director` lleva la `carga` de tensión.
- `director/PresupuestoTension.ts` y `director/PerfilJugador.ts`: memoria de tensión y adaptación (el director se conecta al bus con `conectar`).
- `ia/FirmaSonora.ts`: tabla de datos con el sonido de cada estado de la criatura.
- `jugador/CapturaGrabadora.ts`: observa el motor de audio (`MotorAudio.observar`) mientras se mide.
- `nucleo/SecuenciaMuerte.ts` y `nucleo/Susto.ts`: fuera de `Juego.ts`; la muerte avanza en tiempo de juego.
- `audio/BibliotecaSonidos.ts`: sintetiza todo y luego carga las grabaciones de `public/audio/manifiesto.json`.

## Guardado versionado (Sprint 3, A2)

Todo lo que se guarda en el navegador (`localStorage`, prefijo `las-paredes-oyen:`) lleva versión y pasa por el mismo
cargador (`guardado/Versionado.ts` + `guardado/AlmacenVersionado.ts`):

| Clave | Qué es | Versión | Se borra |
|---|---|---|---|
| `partida` | Piso, punto de control, banderas, batería, tiempo, estadísticas (`guardado/SistemaGuardado.ts`) | 4 (v1 → v2: toda v1 es del Piso 4; v2 → v3: "Cosas que cambiaron" empieza en 0; v3 → v4: la dificultad, Normal) | Al terminar o con "Nueva partida". **Pesadilla no guarda ni borra**: la de otra dificultad queda intacta |
| `ajustes` | Ajustes del jugador (`config/Ajustes.ts`) | 1 (migra desde v0, sin versión) | Nunca |
| `perfil` | Mejores marcas, totales y pisos completados con su dificultad más alta (`guardado/Perfil.ts`) | 2 (v1 → v2: si llegó al final, completó el Piso 4 en Normal) | Nunca |
| `telemetria` | Sesiones de prueba (`telemetria/`) | 1 por sesión | Desde Ajustes → Pruebas |

Reglas del cargador:
- **Sin versión = v0.** Cada cambio de formato agrega un paso `{ desde: N, migrar }` en `MIGRACIONES`; los datos suben
  paso a paso y se guardan ya migrados.
- **Versión más nueva que la del juego** (se volvió a publicar una versión vieja): se usa lo de por defecto, pero **no se
  pisa ni se borra** lo guardado.
- **Dañado** (JSON roto o forma inesperada): se guarda una copia en `<clave>:respaldo` antes de reemplazarlo.
- Los ajustes solo aceptan claves conocidas con el tipo correcto: un valor raro vuelve al valor por defecto.
- El perfil premia jugar bien, no jugar más: mejor tiempo y menos muertes en una partida terminada, sin rachas.

## Pisos como paquetes (Sprint 4, A1)

Un piso = una carpeta en `src/pisos/` que exporta un `PaquetePiso` (`pisos/TiposPiso.ts`): `mapa`, `objetivos`, `documentos`,
`transcripciones`, `objetos` recogibles, `puntoInicial` y `puntosControl` (bandera → punto), `luzPorBandera`, `reglas`
(`directorDesde`, `despiertaCon`, `imitacionCompletaCon`), `menu` y un `guion` opcional (lo que no es dato). El juego lo
recibe del catálogo y lo deja en `ctx.piso`; la partida guarda su `id`.

Dos pruebas lo vigilan (`pruebas/unitarias/`):
- `motorSinPisos`: ningún archivo fuera de `src/pisos/` escribe 401, 402 o 403 en su código ni importa la carpeta de un piso.
- `motorSinContenido`: ningún archivo del motor escribe entre comillas un id o una bandera de un paquete del catálogo.
  Las palabras que también son vocabulario del motor (`'pasillo'` como reverberación, `'orden'` como tipo de papel…)
  están declaradas archivo por archivo con su cuenta exacta.

## Estados de la aplicación

`cargando → inicio (gesto: audio + pantalla completa) → menú ⇄ jugando ⇄ pausa / documento → muerte | fin`

## Extensibilidad prevista (sin implementar todavía)

| Futuro | Dónde encaja |
|---|---|
| Perfiles / nube | `guardado/` (formato versionado con migraciones; el perfil ya existe localmente) |
| Logros / estadísticas | Suscriptores del bus (`bandera`, `entidad-estado`) |
| Contenido adicional | Una carpeta nueva en `pisos/` + su línea en `pisos/catalogo.ts` (A1) |
| Cooperativo | El bus y las banderas ya separan "qué pasó" de "quién lo muestra"; faltaría red (WebRTC) |
| Audio grabado real | **Ya implementado**: una línea en `public/audio/manifiesto.json` por `IdSonido` (reemplaza o suma variantes, con ganancia) |
| Modelos 3D | Reemplazar `ia/ModeloEntidad.ts` y `mundo/Muebles.ts` por glTF |

## Multiplataforma

- **Hoy:** cualquier navegador con WebGL 2 (Chrome, Edge, Firefox, Safari 15+), Windows/macOS/Linux/Android/iOS.
- **Publicado:** Vercel ejecuta `npm run build` y sirve `dist/` en `almendros.elmundodemanu.com` (dominio en Hostinger).
- **PC nativo:** Tauri 2 (ejecutable ~10 MB).
- **Móvil nativo:** Capacitor (Android/iOS, con orientación horizontal forzada desde el manifiesto nativo).
