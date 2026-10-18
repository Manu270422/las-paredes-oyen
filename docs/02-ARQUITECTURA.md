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
   │  └─ sintesis/             Sintetizador y recetas de los 45 sonidos
   ├─ mundo/                   Nivel, rejilla, geometría, puertas, lámparas, muebles, letreros, rastros, escaleras, ascensor, colisiones
   │  └─ datos/                Tipos de mapa (la forma; los mapas viven en cada piso)
   ├─ jugador/                 Jugador, cámara, respiración, corazón, linterna, grabadora
   ├─ interaccion/             Sistema de interacción e interactuables
   │  └─ objetos/              Puerta, documento, recogible, examinable, medición, tablero, radio, botones del ascensor, modelos
   ├─ ia/                      Entidad, modelo, navegación A*, percepción, memoria, FSM, imitador
   │  └─ estados/              Paredes, investigando (con encuentro), cazando, acechando, retirada
   ├─ director/                Director de terror, memoria del mundo, visibilidad
   │  └─ eventos/              13 eventos dinámicos + catálogo
   ├─ narrativa/               Progreso, acciones del guion, tipos de documento/objetivo/cinta, explicaciones de muerte
   ├─ pisos/                   Catálogo de pisos y la forma de un paquete (TiposPiso)
   │  ├─ piso4/                El Piso 4: mapa, objetivos, documentos, cintas, guion y secuencia final
   │  ├─ piso3/                El Piso 3: mapa, documentos, examinables y guion (la libreta de Andrés)
   │  └─ piso2/                El Piso 2: mapa, documentos, cinta y guion (Hernando y el cuarto sordo)
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
`transcripciones`, `objetos` recogibles, `examinables`, `puntoInicial` y `puntosControl` (bandera → punto), `luzPorBandera`, `reglas`
(`directorDesde`, `despiertaCon`, `imitacionCompletaCon`), `menu` y un `guion` opcional (lo que no es dato). El juego lo
recibe del catálogo y lo deja en `ctx.piso`; la partida guarda su `id`.

Dos pruebas lo vigilan (`pruebas/unitarias/`):
- `motorSinPisos`: ningún archivo fuera de `src/pisos/` escribe 401, 402 o 403 en su código ni importa la carpeta de un piso.
- `motorSinContenido`: ningún archivo del motor escribe entre comillas un id o una bandera de un paquete del catálogo.
  Las palabras que también son vocabulario del motor (`'pasillo'` como reverberación, `'orden'` como tipo de papel…)
  están declaradas archivo por archivo con su cuenta exacta.

**Puntos de control con condición (2026-10-17).** Un punto del mapa puede pedir algo para reaparecer en él
(`requiere`, escrito como el requisito de un objetivo: `'objeto:llave_402'`) y decir adónde volver si no se cumple
(`sino`, otro punto del mapa). `Nivel.puntoControl` lo decide **al cargar**, con el progreso del guardado: no cambia lo
que se guarda, así que también repara las partidas que ya quedaron guardadas ahí. Si no se cumple y no hay `sino`, se
usa el punto inicial del piso. Lo pidió un error real: el apagón del Piso 4 guardaba adentro del 402 y los objetivos
mandan al tablero antes que a la llave; quien moría entonces, sin la llave, reaparecía encerrado. Lo vigilan
`puntosSinEncierro.test.ts` (en cada piso del catálogo recorre la rejilla desde el punto inicial con las puertas con
llave cerradas: un punto al que no se llega tiene que pedir esa llave y tener un `sino` alcanzable) y
`encierro402.spec.ts`, caminando.

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
- La reja es lo único que se mueve. Sus dos hojas, la cadena y el candado van aparte, cada uno con su eje, en un grupo
  `reja`, y los anima `mundo/RejaEscalera.ts`.
  - `Nivel` enlaza cada tramo cerrado (`requiere`) con la reja que tiene a menos de 2 m.
  - Con lo que pide el tramo, la primera E la abre. La llave gira, el candado cae (ruido de puerta: la criatura va a
    investigar) y la cadena se desliza. Las hojas se abren en 3.4 s y queda la bandera `abierta:<tramo>`.
  - Ya abierta, E baja. Al cargar, `TramoEscalera.restablecer` la pone abierta sin animación.
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
  - Despertar: el piso queda completado y la partida sigue. No regala nada: lo que haga falta para seguir se
    encuentra jugando (un recogible puede `aparece`r con una bandera, también en plena partida: `Nivel.alBandera` avisa a cada interactuable). La primera vez que bajo de él, el viaje muestra su
    resumen en una tarjeta de capítulo **dentro del fundido**: solo se ve sobre el negro. El negro dura lo que la
    tarjeta (unos 3.5 s más); E o Esc la adelantan.
  - Terminar la partida (`terminarPartida`): la pantalla final, con una línea por piso si fueron varios; el juego
    deja de correr.

  Cada piso completado anota lo suyo (tiempo, muertes y cambios, restando lo de los pisos anteriores), viaja en la
  partida guardada (`pisosCompletados`, v7) y avisa con `piso-completado`, que la telemetría registra. Los guiones
  lo piden con `AccionesGuion`.
- `Juego.ts` tiene un tope de 700 líneas (A5), vigilado por `topeComplejidad.test.ts`. Lo que no cabe va a su propio
  archivo; por ejemplo, `ui/hud/AlimentarHUD.ts` pasa el estado del juego al HUD en cada fotograma, y desde el
  2026-10-12 `audio/MezclaFotograma.ts` (el audio de cada fotograma) y `render/EfectosFotograma.ts` (estrés, pulso e
  interferencia para el postprocesado). Con eso quedó en 674 líneas: hay margen para lo próximo.
- `Juego.cambiarNivel` suelta el nivel viejo (`Nivel.destruir`: geometrías y texturas propias, no las de la biblioteca
  compartida) y arma el nuevo. Lo comparten el viaje y cargar una partida guardada en otro piso.

## Escaleras que se caminan (C2 §1)

- El motor sigue siendo un plano: el pozo de una escalera (celdas `E`) es el único lugar donde el suelo sube y baja.
  `mundo/EscaleraCaminable.ts` (lógica pura, en el marco local del hueco) dice a qué altura están los pies en cada
  huella, qué frena dentro del pozo y cuándo se cruza el descanso. Usa las MISMAS medidas con que
  `ConstructorEscalera` dibuja los escalones (`medidasEscalera`): lo que se ve y lo que se pisa no se separan.
- Quien camina sabe por dónde va (`TramoPie`: `piso`, `bajando` o `subiendo`): en el mismo punto del plano hay dos
  descansos, uno encima del otro, y lo que se pisa depende de por dónde se llegó.
- `mundo/PozosCaminables.ts` junta los huecos de un piso: qué tramo lleva a qué piso (las `escaleras` del paquete,
  por el lado de la boca donde arrancan), qué los cierra (la reja hasta que termina de abrirse; tablas y escombros,
  siempre) y por qué celdas del pozo puede ir la criatura.
- **Cambiar de piso caminando:** al cruzar el descanso de lado a lado (con 25 cm de margen a cada lado de la mitad),
  `ViajeEscalera.revisarCruce` arma el piso vecino en un parpadeo y me pone en el mismo punto del descanso del otro
  piso, con la mirada y el impulso que traía (el pozo es idéntico en los dos). Si sale la tarjeta de un piso
  completado, el negro dura lo que ella.
- **Ella** puede seguirme por mi tramo hasta el descanso (`Navegacion` acepta celdas extra; sus pies también siguen
  los escalones), pero nunca cruza a otro piso. La distancia para atraparme cuenta la altura. Así el pozo no es
  refugio, y huir por la escalera cuesta unos segundos expuesto (la regla de la caza ya no hace falta caminando).
- **Accesibilidad:** "Escaleras con fundido" (Ajustes → Accesibilidad) devuelve el viaje con E y fundido, para quien
  se marea; en ese modo, durante una caza la cadena se traba.
- **Rapidez:** armar un piso era ~1.3 s (casi todo pintar rastros y letreros píxel por píxel). Los lienzos pintados
  quedan guardados (`render/texturas/LienzosGuardados.ts`) y los de los otros pisos se pintan durante la carga
  (`mundo/PrecalentarPiso.ts`): ahora se arma en ~0.1–0.3 s en el navegador de pruebas.

## El ascensor (C2 §3)

- **Una celda nueva en la rejilla: `A`, la cabina.** Se pisa como piso (`Rejilla.esCabina`; no es muro ni hueco), con
  tres lados de muro y una sola boca hacia una celda de piso. Entre la cabina y el pasillo, `ConstructorGeometria`
  levanta el muro con el vano de las puertas desde los dos lados (dintel y jambas, sin grosor) y sus colisiones.
  Para la vista y el sonido, la cabina con las puertas cerradas cuenta como una puerta cerrada (0.6 de oclusión,
  tapa la línea de visión): lo responde la misma `consultaPuertaCerrada` del nivel.
- `mundo/MarcoCabina.ts`: la cabina en su marco propio (u hacia afuera, v a la derecha de quien sale), dónde van el
  botón de llamar y el panel, y si alguien está adentro o cruzando el vano. `mundo/ModeloAscensor.ts` dibuja las
  hojas, el marco, el indicador de piso (afuera y adentro, con luz propia: `render/texturas/TexturasAscensor.ts`), el
  revestimiento de acero, el pasamanos y el panel. Su luz es una lámpara del mapa (tubo) que nombra el paquete.
  Sus materiales se piden con `BibliotecaMateriales.conservado`: se crean una vez y no se sueltan al cambiar de piso.
  Si se soltaran, el piso nuevo recompilaría sus shaders (en el navegador de pruebas, el cruce de la escalera llegó a
  5.8 s). Ojo: rótulos, placas, rastros y el fondo de la escalera todavía se sueltan y se recompilan en cada cambio.
- `mundo/Ascensor.ts` es la máquina: `muerto` (no cumple lo que pide el paquete) → `lejos` → `viniendo` (7 s; el
  motor zumba por los muros y hace ruido para ella cada 1.5 s) → `abriendo` → `abierto` → `cerrando` → `viajando`
  (6 s; vibra, el director se bloquea) → `reteniendo` → `abriendo`. Las puertas se vuelven a abrir si algo está en el
  vano (yo o ella); abiertas, la cabina es un cuarto más y ella entra (no es refugio).
- **El cambio de piso sin negro:** a la mitad del viaje el ascensor pide `ctx.viaje.porAscensor`. `ViajeEscalera`
  arma el piso de destino en el modo `cabina` (sin fundido, salvo la tarjeta de un piso completado), llega al punto
  inicial del piso (de ahí se reaparece si se muere) y me pone en el mismo punto de la cabina, mirando igual: la
  cabina está en la misma celda en todos los pisos y su panel es el mismo. El ascensor del piso nuevo retoma el
  viaje (`recibir`) y al llegar suena la campanilla (ruido fuerte, causa `maquina`).
- **Ella no viaja:** si tenía cuerpo cuando se cerraron las puertas, golpea el metal y vuelve a las paredes. Con las
  puertas cerradas, `Nivel.costoCriatura` le da costo infinito a la cabina y `Entidad.avanzar` no la atraviesa.
  **Justicia:** al llegar conmigo adentro, no abre con ella a menos de 4 m; si no se va en 6 s, va a las paredes.
- Datos: `ascensor` del paquete (`DefAscensor`: celda, número del indicador, paradas, `requiere`, mensaje de muerto
  y lámpara). `pisos/EnlacesAscensor.ts` valida el catálogo (una sola `A`, misma celda y mismo panel en cada parada,
  ida y vuelta, nada adentro de la cabina). Lo prueban `ascensor.test.ts` y, caminando, `ascensor.spec.ts`.
- `Ascensor.ts` pasa de 250 líneas (~445, casi un cuarto comentarios y blancos) a propósito: es una sola máquina de
  estados y sus reglas de justicia comparten estado; el porqué está en su cabecera. Si crece, el sonido sale primero.

## Lo que trajo el Piso 2 (P2-guion, tanda 1, 2026-10-13)

- **Botones que piden algo.** Una `ParadaAscensor` puede tener `requiere` y `cerrada`: sin eso, el botón dice por qué
  y las puertas siguen abiertas. Los botones que se repiten en varios pisos viven en `pisos/paradasAscensor.ts` (el
  panel es uno solo): al 2, `visitado:piso2`; al 1, `objeto:llave_servicio`.
- **`visitado:<piso>`** (`narrativa/Requisito.ts`): se cumple si ya estuve en ese piso (`Progreso.visitado`: el que
  juego o uno que dejé). Así, la primera bajada a un piso es siempre por la escalera.
- **Un piso que todavía no existía** (quitado el 2026-10-14, con el Piso 1): hasta entonces, la parada al 1 viajaba
  hasta el 2 y su guion cerraba la partida (`numero`, `pisoAntesDe`, `ascensor-fin-recorrido`). Con el Piso 1 en el
  catálogo, es un viaje normal y `EnlacesAscensor` vuelve a exigir que cada parada lleve a un piso que existe.
- **Escalera tapiada** (`opcionesEscalera.tapiadaAbajo`): un muro de ladrillo nuevo (material `ladrillo`, receta
  procedural) donde iría la reja. `PozosCaminables` lo cuenta como tramo tapado para siempre (ni yo ni ella).
- **La reja que se abre sola** (`DefEscaleraPiso.seAbreCon`): al marcarse esa bandera, `TramoEscalera.alBandera` la
  abre sin llave (`RejaEscalera.abrir(…, true)`: no suena la llave). Al cargar, abierta si la bandera ya está.
- **Completar sin moverme** (`AccionesGuion.completarPiso`, `FinDePiso.completarPiso`): el piso queda completado y la
  partida sigue donde estoy. Así termina ahora el Piso 3; su tarjeta sale al bajar, como la del 4.

## El cuarto sordo (P2-guion, tanda 2, 2026-10-13)

- **Un acabado de pared nuevo, `acolchado`** (colchones de pie con capitoné y espuma de cartón de huevos arriba:
  material `paredAcolchada`, receta `colchon`; eco `acolchado`, casi nada). En el Piso 2: la sala, el dormitorio y
  el cuarto del 202, y el archivo del 201.
- **La regla vive en un solo lugar:** `mundo/Aislamiento.ts` (`aislaAcolchado`) y `Nivel.consultaAislamiento`. Entre
  un cuarto acolchado y cualquier otro lugar (también un muro, que no es ningún cuarto) el sonido casi no pasa; dentro
  del mismo cuarto, normal (si ella entra conmigo, me oye y la oigo). La puerta abierta no cambia nada: lo que aísla
  son los colchones.
- **Quién la usa:**
  - el audio (`MotorAudio.consultaAislamiento` → `FuenteSonido.aplicarOclusion`): lo aislado llega a ×0.03 y solo
    por debajo de 160 Hz, también en modo escuchar; adentro, el ambiente del edificio baja a ×0.12;
  - el oído de ella (`Percepcion`): ×0.01, que deja aun el ruido más fuerte en un tercio de su umbral;
  - los subtítulos de sonidos (`HUD.oyeDesde`): lo que no me llega no sale escrito.
- **Ella** (`EstadoParedes`, `Entidad.buscarPuntoSalida`): medir en un cuarto acolchado no la atrae; nunca sale de un
  muro acolchado. **No es refugio:** con el jugador 25 s seguidos en un cuarto acolchado (`ENTRA_A_BUSCAR`) y el
  director dejándola salir, sale afuera, lo más cerca que pueda y fuera de la vista, y va caminando al centro de ese
  cuarto, a buscar. Adentro solo la delatan la linterna (9 m) y las lámparas (7 m), que ya parpadeaban con ella cerca.
  El aviso de la caza sigue siendo justo sin sonido: trae interferencia en la imagen y el sobresalto.
- Pruebas: `aislamiento.test.ts` y el recorrido `cuartoSordo.spec.ts`.

## La cabina que se detiene (P2-guion, tanda 3, 2026-10-14)

- **El sonido del ascensor salió de la máquina** (`mundo/SonidoAscensor.ts`: motor, ruido para ella, puertas,
  campanilla y golpes), como pedía la cabecera de `Ascensor.ts` antes de agregarle algo. Mismos sonidos y valores:
  lo comprueba `ascensor.test.ts` sin cambios.
- **Un guion puede detener la cabina entre pisos** (`Ascensor.detener` / `reanudar`, fase `detenido`): puertas
  cerradas, motor apagado, sin vibración, y al soltarla sigue desde el mismo punto del viaje. El guion mira
  `viajandoHacia` y `avanceViaje`.
- **Un encuentro sin cuerpo** (`ia/EncuentroSinCuerpo.ts`): ella escucha desde un punto fijo donde no se la ve (el
  techo). Son las reglas del encuentro de `EstadoInvestigando`: mientras se arrastra, su ruido tapa mi respiración y
  solo lo fuerte (`umbralCaza`) me delata; quieta, la gracia y la duración de la dificultad, y cualquier ruido mío
  que le llegue me delata. **La justicia del aire:** no se pone a escuchar mientras aguanto ni con menos de 0.95 de
  aire (con miedo máximo el aire alcanza para el encuentro más largo por 0.35 s); tope de 9 s.
- **Mientras avisa, no atrapa** (`Entidad.avisando`, que marca `EstadoCazando`; `Juego` lo respeta al atrapar). Antes,
  una caza que empezaba a menos de 0.85 m mataba sin el aviso que promete la regla de justicia. En el juego normal
  casi no pasaba; cayendo dentro de la cabina, pasaba siempre.
- **La escena** (`pisos/piso2/cabinaDetenida.ts`): frena al 30 % del viaje al 1 (antes de la mitad, cuando ya se
  arma el piso de destino; hasta el 2026-10-14 frenaba al 55 %, cuando el 1 no existía), algo cae sobre el techo, se
  arrastra, se queda a escuchar (la luz de la cabina titila todo el rato). Superada: trepa por el pozo, se marca
  `cabina:superada`, el Piso 2 queda completado y la cabina sigue al Piso 1. Fallida: revienta la trampilla, cae adentro (`Entidad.caerDesde`) y
  caza con la causa que me delató; reaparezco en el 202 con la llave.
- Pruebas: `cabinaDetenida.test.ts`, `ascensor.test.ts` (detener y reanudar) y el recorrido `cabinaDetenida.spec.ts`
  (los dos caminos, cada uno en su partida).

## El pulido del Piso 2 (tanda 4, 2026-10-14)

- **La trampilla del techo de la cabina** (`ModeloAscensor`: marco de caucho negro y tapa de acero con bisagra;
  `VistaAscensor.fijarTrampilla`). Va corrida 34 cm del centro, en el eje que se aleja del tubo de la lámpara (que
  siempre va a lo largo de X): en el centro quedaba debajo del tubo. `Ascensor.sacudirTrampilla` la hace temblar
  (se calma sola) y `reventarTrampilla` la deja colgando hasta restablecer la cabina. La escena de la cabina la sacude
  con el golpe y cada rasguño, y la revienta antes de que ella caiga.
- **El frenazo suena** (`SonidoAscensor.freno`: fricción de metal grave y los cables sacudiéndose arriba).
- **El Piso 2 tiene rastros** (frase, mano y humedad: solo datos) y **la radio** de Hernando en el pasillo, sobre la
  caja del fondo: es la radio genérica del nivel; el director la puede encender y la atrae lejos del 202.
- Pruebas: `ascensor.test.ts` (la trampilla), `cabinaDetenida.spec` (tiembla al caer encima; abierta al caer adentro)
  y `rastrosPiso2.spec`.

## El Piso 1 (P1-guion, tanda 1, 2026-10-14)

- **El último piso del catálogo** (`pisos/piso1/`): no tiene `siguiente`, así que su `terminarPartida` es el final del
  juego. Mapa propio de 32×20 (no el esqueleto de los apartamentos): vestíbulo, portería, el cuarto de don Aurelio
  (101), contadores y el pasillo de la escalera; la cabina en la misma celda (5, 11).
- **El ascensor se queda sin corriente al llegar:** el guion, la primera vez que las puertas se abren, revienta el tubo
  y marca `ascensor:sin_corriente` (la luz se aplica en vivo con `aplicarLuzDe`). El panel es el mismo de siempre, pero
  todas sus paradas piden `corriente:ascensor`, que nunca se cumple. La escalera, tapada arriba y con la reja abajo.
- **Las paradas al 1** (`pisos/paradasAscensor.ts`): desde el 2, con la llave de servicio; desde el 3 y el 4
  (`PARADA_AL_1_DESDE_ARRIBA`), solo después de haber estado en el 1, que en la práctica nunca pasa (no se sube).
- **La puerta principal** (`interaccion/objetos/PuertaPrincipal.ts`, tipo de interactuable `salida`; el nivel las
  guarda en `Nivel.salidas` y las actualiza en cada fotograma): tres cerraduras en orden, cada una con su momento
  (1.2–1.8 s) y un ruido que a ella le llega como una puerta (0.35–0.5: va a investigar, no sale cazando). Cada una
  queda en `cerradura:1..3`; la última pide el objeto del paquete (`llaves_aurelio`). Abiertas las tres, marca la
  bandera del paquete (`puerta:abierta`) y el guion hace la salida: lluvia, fundido, la tarjeta "Sobreviviste" con la
  ventana del 401 y `terminarPartida`.
- **Puntos de control:** al llegar (el pasillo), al leer el libro de minuta (la portería) y al tomar las llaves (el
  vestíbulo, frente a la puerta). Los dos últimos son mayores (cuentan en Difícil); en Pesadilla, ninguno. Las
  cerraduras no guardan: morir las vuelve a cerrar.
- **El final del juego** (`PantallaFin`): sin piso siguiente, el título es "Sobreviviste", no hay "Próximamente" y
  salen los créditos de `config/Creditos.ts` (también en la pantalla de créditos del menú).
- **Lo que falta** (tandas 3–4 del P1-guion): afinar la dificultad de las cerraduras con ella cerca y el pulido.

## El citófono (P1-guion, tanda 2, 2026-10-14)

- **Una pieza del motor** (`interaccion/objetos/Citofono.ts`, tipo de interactuable `citofono`; el dibujo en
  `ModeloCitofono.ts` y la tira de papel en `texturaEtiquetasCitofono`). El mapa dice dónde está el panel y sus
  `timbres` (`DefTimbre`: rótulo, texto del indicador, subtítulo y dónde suena). El panel no se enfoca: se enfocan sus
  botones, que el nivel mete en `interactuables` como los del ascensor (`Nivel.citofonos`).
- **Pulsar un botón:** un clic donde estoy (ruido mío de 0.15, causa `citofono`: menos que un paso), y medio segundo
  después su timbre suena tres veces donde está (ruido del entorno de 0.8, como la campanilla del ascensor). Ella lo
  oye como cualquier ruido: desde los muros va hacia allá, y si ya investigaba, la distrae (lo mismo que la radio o la
  grabadora). Después la línea queda ocupada 15 s: los botones dicen "Línea ocupada" y no hacen nada, ni ruido.
- **Llamadas que entran** (`Citofono.llamarDesde`): el panel timbra sin ser un ruido para ella, la luz de esa línea
  parpadea y su botón dice "Contestar". Si nadie contesta, suena 6 veces y avisa al guion; contestar es el mismo clic, y
  la línea queda abierta hasta que el guion cuelga (`colgar`).
- **La llamada de ella en el Piso 1** (`pisos/piso1/guion.ts`): una vez, 4 s después de tomar las llaves, desde la
  línea del ascensor. Contestar usa `EncuentroSinCuerpo` en el panel: mientras habla (la voz de Hernando), solo lo
  fuerte me delata; cuando escucha, las reglas de cualquier encuentro, con la justicia del aire. Superada, se corta; si
  me oye, sale del muro más cercano (a 4–8 m) y caza con su aviso. Durante la llamada, ella y el director son de este
  momento. Al cargar con las llaves, ya no llama.
- **Telemetría:** el evento `citofono` (timbre, ocupado, llamada, contestada, ignorada, colgada) con el estado de
  peligro, y el clic cuenta como `ruido:citofono`. La muerte por el clic tiene su explicación ("Oyó el botón del
  citófono").
- Pruebas: `citofono.test.ts` y el recorrido `citofono.spec.ts`.

## El final: "la puerta la llama" (P1-guion, tanda 3, 2026-10-15)

Medido con un robot antes de cambiar nada ([informe](pruebas/cerraduras-robot-2026-10-15.md)): abrir las tres
seguidas ganaba en 6 s y alejarla con el citófono perdía. Lo que cambió:
- **Las cerraduras son ruido mío** (causa `cerradura`, origen `jugador`; `PuertaPrincipal`): bajito al empezar
  (`RUIDO_EMPEZAR`, 0.2) y fuerte al ceder (0.35–0.5). Durante un encuentro me delatan como cualquier ruido mío; antes,
  con origen `puerta`, nunca cazaban y durante un encuentro contaban como "un ruido ajeno": el encuentro se superaba.
  La muerte tiene su explicación ("Oyó la cerradura.").
- **Abrir una es un momento** (cadena 3 s, cerrojo 2.5 s, llave 3.5 s). Alejarme más de `ALEJARSE_LA_SUELTA` (0.9 m)
  la suelta a medias: no cede y no suena su final.
- **"La puerta la llama"** (`EstadoParedes`): si lo último que oyó fue una cerradura, va por los muros con prisa
  (`LLEGADA_PUERTA`, 3 s, como cuando él mide), con un roce y rasguños que se oyen (y su subtítulo), y junto a la
  puerta sale aunque el director no lo permita, a `DISTANCIA_SALIDA_PUERTA` (3.5 m) del jugador y con poca pausa. Una
  vez por cerradura: si vuelve al muro, se queda vigilando.
- **"El timbre la ocupa"** (`Memoria.registrarRuido`): el último ruido guarda su causa; un timbre del citófono (origen
  del entorno) la ocupa `OCUPADA_POR_TIMBRE` s (10): un ruido más débil que el timbre o que `SACA_DEL_TIMBRE` (0.15) no
  cambia adónde va, ni en los muros ni investigando (`atendioUltimo`). Los demás señuelos, como estaban.
- **La salida espera si me caza** (guion del Piso 1): si la última cerradura cede con ella cazándome, salgo cuando
  sobreviva y vuelva a la puerta. Antes, la puerta abierta la mandaba a las paredes en el mismo instante.
- **La caza da el último paso** (`EstadoCazando`): en la celda del jugador, si sabe dónde está, se desliza hasta él (el
  camino termina en el centro de la celda, y una esquina queda a 0.92 m; atrapa a 0.85). Cambia todas las cazas del
  juego: solo en ese caso, que antes dejaba una caza sin final.
- La primera cerradura que suena trae la pista de la regla. Los botones del citófono van a 10 cm.
- **El pulido (tanda 4, 2026-10-17):** el evento `cerradura` (empieza, suelta, cede; lo registra la telemetría con el
  estado del peligro); dos modelos nuevos para lo que se examina: `sobres` y `ninguno` (solo la zona de toque, para
  mirar un mueble que ya está); en el Piso 1, tres rastros, dos examinables y el viento en la rendija de la puerta
  principal. Pruebas: `rastrosPiso1.spec.ts`. La calle caminable al salir es una propuesta aparte
  ([C3](propuestas/C3-salir-a-la-calle.md)).
- Pruebas: `puertaPrincipal.test.ts`, `puertaLaLlama.test.ts` (las dos reglas, con una entidad falsa),
  `cazaUltimoPaso.test.ts` y el recorrido `cerraduras.spec.ts`. La medición con el robot, a pedido:
  `medirCerraduras.spec.ts` (con `robotFinal.ts` y `ayudasFinal.ts`).
- Pruebas: `puertaPrincipal.test.ts` y el recorrido `piso1.spec.ts` (llegar en la cabina desde el 4, el libro, las
  llaves, las tres cerraduras y "Sobreviviste"); `piso2.spec` y `cabinaDetenida.spec` ahora terminan en el Piso 1.

## Lo que se lee y lo que se examina

- **Documentos** (`interaccion/objetos/Documento.ts`): abren el lector y **pausan** el mundo (estado `documento`).
  La forma del papel (`narrativa/TiposNarrativa.ts`) decide el modelo y la letra: `orden` y `cinta` a máquina;
  `diario`, `nota` (de pie, pegada) y `hoja` (suelta, acostada) a mano; `carta` en tinta. El indicador dice lo de su
  tipo ("Leer", "Leer el diario") salvo que el documento declare su `accion` ("Leer el cuaderno"). Leer marca `leyo:<id>`.
- **Examinables** (`interaccion/objetos/Examinable.ts`, datos en `examinables` del paquete): algo que se mira y no se
  lleva (modelos `palo`, `carrito`, `dibujo`). Con E flota una línea en la tarjeta `nota`: sin panel, **no pausa** (la
  criatura sigue oyendo), se queda según lo larga que sea (`duracionTarjeta`) y marca `examinado:<id>`. En PC va entre
  el indicador y los subtítulos; en un teléfono acostado no cabe ahí y va encima de la mira (`notaExaminar.spec.ts`).
- `paquetesDePiso.test.ts` exige que todo documento y examinable del mapa exista en su paquete y que no sobre ninguno:
  antes, un id mal escrito se veía como una nota en blanco.

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
