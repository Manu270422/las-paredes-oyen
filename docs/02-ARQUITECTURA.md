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
   │  └─ texturas/             Generador procedural, recetas, cookie de la linterna, pintor de rastros
   ├─ audio/                   Motor, fuentes 3D, reverberación, ambiente, biblioteca
   │  └─ sintesis/             Sintetizador y recetas de los 39 sonidos
   ├─ mundo/                   Nivel, rejilla, geometría, puertas, lámparas, muebles, letreros, rastros, colisiones
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
| `partida` | Piso, punto de control, banderas, batería, tiempo, estadísticas, lo de los otros pisos visitados y los pisos completados (`guardado/SistemaGuardado.ts`) | 7 (v1 → v2: toda v1 es del Piso 4; v2 → v3: "Cosas que cambiaron" empieza en 0; v3 → v4: la dificultad, Normal; v4 → v5: dificultad inicial y más baja jugada; v5 → v6: sin otros pisos; v6 → v7: sin pisos completados) | Al terminar o con "Nueva partida". **Pesadilla no guarda ni borra**: la de otra dificultad queda intacta |
| `ajustes` | Ajustes del jugador (`config/Ajustes.ts`), con la dificultad preferida (la última elegida) | 1 (migra desde v0, sin versión; las claves nuevas toman su valor por defecto) | Nunca |
| `perfil` | Mejores marcas, totales y pisos completados con su dificultad más alta (`guardado/Perfil.ts`) | 2 (v1 → v2: si llegó al final, completó el Piso 4 en Normal) | Nunca |
| `telemetria` | Sesiones de prueba (`telemetria/`), con la dificultad y la versión de la compilación | 2 por sesión (las v1 se migran: Normal, compilación "desconocida") | Desde Ajustes → Pruebas |

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

## El hueco de una escalera (celda `E`)

La rejilla de un mapa tiene cuatro caracteres: `#` muro, `.` piso, `P` puerta y `E` hueco de escalera. El hueco es
**aire que no se pisa**: `Rejilla.esMuro` es falso (la vista, la oclusión del sonido y el viento lo atraviesan) y
`Rejilla.esTransitable` también (el jugador choca con él como con un muro, y ni la criatura ni el director lo usan).

- `mundo/HuecoEscalera.ts` (lógica pura, sin three.js) encuentra cada hueco y valida sus reglas: rectángulo de al menos
  2 × 2 celdas, **una sola boca** (un lado entero hacia celdas libres, sin puertas) y muro en los otros tres lados. Un mapa
  que las rompa falla al cargar con un error que dice dónde.
- `mundo/ConstructorEscalera.ts` dibuja la escalera en el marco local del hueco (u a lo largo de la boca, v hacia
  dentro): el pozo, dos tramos de ida y vuelta con sus descansos, la reja con cadena del tramo que baja, las tablas y
  escombros del que sube y la oscuridad del fondo (capas negras semitransparentes, sin un piso que la cierre).
- `Rejilla.muroMasCercano` (de donde el director saca los golpes "dentro de la pared") acepta un muro que da al aire
  del hueco: es superficie igual. Por eso el director de Normal sigue idéntico al golden master de gate1.
- Pruebas: `huecoEscalera.test.ts` (rejilla, navegación, reglas y marco), `paquetesDePiso.test.ts` (nada del mapa cae
  dentro de un hueco) y el recorrido `escalera.spec.ts` (empujar contra la boca no mete al jugador en el hueco).

## Rastros (sangre narrativa)

Un piso declara sus `rastros` como **datos** (`DefRastro` en `pisos/TiposPiso.ts`): `charco` en el piso; `mano`, `estatura`,
`conteo` y `frase` en un muro (con `rot`, `altura`, `ancho` y `alto`); `humedad` en el techo. No brillan ni salen en la
interfaz: sin linterna casi no se ven. Las letras de una `frase` las traza el navegador como máscara (`TrazarLetras`) y el
pintor las vuelve sangre escrita con el dedo; sin trazador, se niega a pintarla.

- `render/texturas/PintorRastros.ts` (lógica pura, sin navegador) pinta cada tipo píxel a píxel con el ruido de
  `utilidades/Ruido.ts`, con densidad fija en píxeles por metro y semilla sacada del `id`: el mismo rastro sale siempre
  igual. El borde del cuadro queda transparente (nunca se ve el rectángulo).
- `render/texturas/TexturasRastros.ts` lo pasa a `CanvasTexture`. Lo único que necesita navegador son las letras a lápiz
  de la estatura: van en una capa aparte, **debajo** de la mancha y el restregado (`ponerDebajo`).
- `mundo/Rastros.ts`: `ponerRastro` crea el plano (4 mm separado de la superficie, `polygonOffset`, sin escribir
  profundidad) y `VigiaRastros` avisa por el bus `rastro-visto` la primera vez que el jugador ve cada uno: a menos de
  4,5 m, a menos de 32° del centro de la vista, con línea de visión (las puertas cerradas tapan) y con la linterna o una
  lámpara encendida encima. La telemetría lo guarda en `rastrosVistos` del resumen.
- **Costo de carga** (se pintan al construir el nivel): la escala sigue `tamanoTextura` del perfil de calidad (`baja` →
  mitad de píxeles por lado). En mi PC, los cuatro del Piso 4 tardan ~440 ms a escala completa y ~75 ms a media; el charco
  es el más caro (~300 ms). En un móvil todavía no está medido.
- `Ruido.red` se salta los módulos cuando el periodo es múltiplo de 256 (`& 255` da lo mismo, también con negativos). La
  salida es idéntica bit a bit (`ruido.test.ts` lo compara contra la versión con módulos): no cambia ninguna textura.
- Pruebas: `rastros.test.ts` (cada rastro de muro pegado a un muro en todo su ancho y con aire delante, los charcos sobre
  celdas que se pisan, todo dentro de su cuadro, el pintor determinista y con borde transparente) y el recorrido
  `rastros.spec.ts`: camina hasta cada uno, lo mira con la linterna y cuenta cuántos píxeles cambian al quitarlo contra
  cuántos deberían cambiar (área del cuadro en pantalla × parte pintada). Debe superar 0,3 con linterna y verse menos
  sin ella. Comprobado que falla si los rastros quedan detrás de la superficie (bajan a 0).

## Cambio de piso (motor de la Tarea 3)

- Un tramo de escalera (`interaccion/objetos/TramoEscalera.ts`, datos en `escaleras` del paquete) pide el viaje por
  `ctx.viaje.cambiarDePiso`.
- `nucleo/ViajeEscalera.ts` hace la secuencia:
  - fundido a negro y pasos;
  - ya a oscuras, callar el piso que dejo, `progreso.cambiarPiso`, armar el destino, marcar sus `banderasAlLlegar` y
    ponerme en la llegada;
  - guardar según la dificultad y volver a jugar.

  Del juego solo pide lo suyo con `SalidaViaje` (su estado, `cambiarNivel`, `ponerEnPunto`, guardar), igual que
  `SecuenciaMuerte` con `SalidaMuerte`. Lo usa también el despertar tras el final del 402, sin pasos.
- `nucleo/FinDePiso.ts`: el fin de un piso.
  - Despertar: el piso queda completado y la partida sigue. La primera vez que bajo de él, el viaje muestra su
    resumen en una tarjeta de capítulo **dentro del fundido**: solo se ve sobre el negro. El negro dura lo que la
    tarjeta (unos 3.5 s más); E o Esc la adelantan.
  - Terminar la partida (`terminarPartida`): la pantalla final, con una línea por piso si fueron varios; el juego
    deja de correr.

  Cada piso completado anota lo suyo (tiempo, muertes y cambios, restando lo de los pisos anteriores), viaja en la
  partida guardada (`pisosCompletados`, v7) y avisa con `piso-completado`, que la telemetría registra. Los guiones
  lo piden con `AccionesGuion`.
- `Juego.ts` tiene un tope de 700 líneas (A5), vigilado por `topeComplejidad.test.ts`. Lo que no cabe va a su propio
  archivo; por ejemplo, `ui/hud/AlimentarHUD.ts` pasa el estado del juego al HUD en cada fotograma.
- `Juego.cambiarNivel` suelta el nivel viejo (`Nivel.destruir`: geometrías y texturas propias, no las de la biblioteca
  compartida) y arma el nuevo. Lo comparten el viaje y cargar una partida guardada en otro piso.

## Estados de la aplicación

`cargando → inicio (gesto: audio + pantalla completa) → menú ⇄ jugando ⇄ pausa / documento / viaje → muerte | fin`

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
