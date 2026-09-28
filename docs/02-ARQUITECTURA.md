# Arquitectura

## Principios

1. **Cada cosa en su lugar**: una carpeta por responsabilidad, un archivo por concepto.
2. **Comunicación por eventos** (`nucleo/BusEventos.ts` + `nucleo/Eventos.ts`): el jugador emite `ruido`; la criatura, la grabadora y el HUD reaccionan sin conocerse.
3. **Contexto compartido** (`nucleo/ContextoJuego.ts`): referencias a todos los sistemas para eventos, estados de IA e interactuables.
4. **Niveles como datos** (`mundo/datos/`): el mapa es una rejilla de texto + listas de habitaciones, puertas, luces, muebles e interactuables.
5. **Estado derivado de banderas** (`narrativa/Progreso.ts`): puertas, luces y objetos se restauran leyendo banderas. Guardar = serializar banderas.
6. **Tiempo de juego, no reloj real** (`nucleo/Programador.ts`): los sustos programados se congelan al pausar.
7. **Nada temporal queda colgado** (`Programador.limpiarDespues`): una suscripción o efecto que debe durar N segundos registra su *limpieza*, que se ejecuta al vencer **o** al cancelar todo (muerte, menú, recarga). Antes, un eco del director podía quedar escuchando pasos para siempre.
8. **Cada ruido lleva su causa** (`Ruido.causa`, `Ruido.pared`): la criatura solo oye volumen, pero el juego sabe *qué* fue. Eso alimenta la muerte explicada, el mensaje de medición fallida y la telemetría.

## Estructura

```text
LasParedesOyen/
├─ index.html                  Contenedor: lienzo + capa de UI
├─ public/                     Manifiesto PWA (horizontal) e ícono
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
   │  └─ sintesis/             Sintetizador y recetas de los 34 sonidos
   ├─ mundo/                   Nivel, rejilla, geometría, puertas, lámparas, muebles, colisiones
   │  └─ datos/                Tipos de mapa y el Piso 4
   ├─ jugador/                 Jugador, cámara, respiración, corazón, linterna, grabadora
   ├─ interaccion/             Sistema de interacción e interactuables
   │  └─ objetos/              Puerta, documento, recogible, medición, tablero, radio, modelos
   ├─ ia/                      Entidad, modelo, navegación A*, percepción, memoria, FSM, imitador
   │  └─ estados/              Paredes, investigando (con encuentro), cazando, acechando, retirada
   ├─ director/                Director de terror, memoria del mundo, visibilidad
   │  └─ eventos/              13 eventos dinámicos + catálogo
   ├─ narrativa/               Documentos, objetivos, progreso, guion, transcripciones, final, explicaciones de muerte
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

## Estados de la aplicación

`cargando → inicio (gesto: audio + pantalla completa) → menú ⇄ jugando ⇄ pausa / documento → muerte | fin`

## Extensibilidad prevista (sin implementar todavía)

| Futuro | Dónde encaja |
|---|---|
| Perfiles / nube | `guardado/SistemaGuardado.ts` (formato versionado) |
| Logros / estadísticas | Suscriptores del bus (`bandera`, `entidad-estado`) |
| Contenido adicional | Nuevos `mundo/datos/*.ts` + eventos en `director/eventos/` |
| Cooperativo | El bus y las banderas ya separan "qué pasó" de "quién lo muestra"; faltaría red (WebRTC) |
| Audio grabado real | Reemplazar recetas en `audio/sintesis/RecetasSonidos.ts` manteniendo `IdSonido` |
| Modelos 3D | Reemplazar `ia/ModeloEntidad.ts` y `mundo/Muebles.ts` por glTF |

## Multiplataforma

- **Hoy:** cualquier navegador con WebGL 2 (Chrome, Edge, Firefox, Safari 15+), Windows/macOS/Linux/Android/iOS.
- **PC nativo:** Tauri 2 (ejecutable ~10 MB).
- **Móvil nativo:** Capacitor (Android/iOS, con orientación horizontal forzada desde el manifiesto nativo).
