# Hoja de ruta

> Publicado en Vercel: [almendros.elmundodemanu.com](https://almendros.elmundodemanu.com).

## Hecho en este ciclo (vertical slice jugable)

| Fase | Contenido | Estado |
|---|---|---|
| 1. Fundamentos | Vite + TS estricto, bucle, bus tipado, programador, contexto, configuración | ✅ |
| 2. Plataforma, entrada y render | Detección de dispositivo, orientación horizontal, pantalla completa, teclado/ratón, mando, táctil, WebGL2, perfiles de calidad, resolución dinámica, postprocesado propio | ✅ |
| 3. Escenario | Rejilla de datos → geometría (vanos de puertas, guardaescobas), texturas procedurales PBR, muebles y sábanas, colisiones | ✅ |
| 4. Iluminación | Linterna con cookie y sombras, pool de luces, lámparas con parpadeo e interferencia, niebla | ✅ |
| 5. Audio | Motor Web Audio, HRTF, oclusión por muros, reverb por habitación, 34 sonidos sintetizados (39 desde el Sprint 2), ambiente y dron | ✅ |
| 6. Interacción | Puertas (llave, lento/normal), documentos, recogibles, medición, tablero, radio | ✅ |
| 7. IA | Criatura con 5 estados, percepción auditiva, memoria, A*, apertura de puertas, falsa retirada, imitación de pasos | ✅ |
| 8. Eventos de terror | Director con fases + 13 eventos + memoria del mundo + visibilidad | ✅ |
| 9. Narrativa | 5 documentos, objetivos, transcripciones, apagón, final | ✅ |
| UI/UX | Menús, pausa, ajustes (4 pestañas), lector, muerte, final, HUD mínimo, accesibilidad, mando en menús | ✅ |

## Siguiente

### Fase 10 — Playtesting y afinado (1–2 semanas) ← **prioridad**

#### Sprint 1 — Justicia, instrumentación y terror de alto impacto ✅ (2026-09-28)
| Tarea | Resultado |
|---|---|
| Muerte injusta: en *investigando* la criatura caminaba hasta la celda del ruido y mataba a un jugador quieto | **Encuentro de presencia**: se detiene a ~2.5 m y escucha; quieto y sin respirar = se va. Solo mata cazando |
| Fuga: el eco del director (`PasosEco`) quedaba escuchando para siempre si morías o salías en esos 15 s | `Programador.limpiarDespues` (limpiezas garantizadas) |
| El final podía matarte si la criatura estaba afuera al empezar | La secuencia final la devuelve a las paredes |
| Dos ecos duplicados (acecho y director) sin relación | `ia/Imitador.ts` con 3 etapas aprendibles |
| Pantalla de muerte con pista al azar | Dice qué oyó + lo hace sonar a través del muro; consejo solo la 1.ª vez |
| Medición fallida con mensaje genérico | Dice la causa ("Mi respiración quedó en la grabación") |
| Medir era seguro después del 401 | Medir la atrae por los muros: rasguños que se acercan y luego silencio |
| No había datos de las pruebas | `telemetria/` local, opcional, exportable + protocolo `04-PROTOCOLO-PLAYTESTING.md` |

Verificado en el juego real (navegador headless): encuentro superado, muerte por respiración, muerte por presencia,
imitación etapa 3, fuga corregida, final seguro, atracción por medición, telemetría con resumen. 0 errores de consola.

#### Hotfix — el vertical slice no se podía completar (2026-09-28)
Encontrado por el creador jugando (no por las pruebas automáticas, que teletransportaban al jugador):
| Bloqueo | Causa | Arreglo |
|---|---|---|
| Ninguna puerta cerrada se podía abrir | La hoja de una puerta cerrada está dentro de su propia celda y la comprobación "¿hay muro en medio?" la contaba como obstáculo | Parche del creador en `SistemaInteraccion.ts`: la celda del propio objeto no bloquea |
| El director podía cambiar una puerta cerrada **mientras la mirabas** (y nunca contaba como "vista") | El mismo defecto en `Visibilidad.puntoEnVista` | `puertasQueTapan()` en `Visibilidad.ts`, también usada por la telemetría |
| Imposible entrar (o salir) del 401 | El sofá cubierto invadía el vano: 23 cm de paso para un jugador de 56 cm | Sofá movido al este de la puerta (`MapaPiso4.ts`) |
| Entrada al dormitorio del 402 casi bloqueada | La cama dejaba 8 cm de holgura | Cama contra la pared oeste |

Verificado caminando de verdad: escalera → abrir el 401 con E → rodear el sofá → medir → objetivo 403. Las 10 puertas se
cruzan en ambos sentidos; un objeto detrás de un muro sigue sin poderse tocar. **Lección:** toda prueba automática nueva
debe incluir un recorrido caminando, sin teletransporte.

#### Primera ronda informal de pruebas (2026-09-28)
Amigos del creador, sin telemetría: la mayoría murió asustada y abandonó; **uno terminó el juego** (abrió el 402 con la llave).
El núcleo se puede completar con habilidad. El riesgo que muestra: quien muere varias veces seguidas se rinde.

#### Sprint 2 — Director adaptativo, firma sonora y segunda realidad ✅ (2026-09-28)
| Tarea | Resultado |
|---|---|
| Director con memoria de tensión | `director/PresupuestoTension.ts`: cada susto gasta presupuesto (vida media 40 s); cuentan también encuentros, cazas, imitaciones y sustos. Respiro obligado tras un encuentro o una retirada. Nunca lanza eventos durante una medición, un encuentro o una caza |
| Adaptación al estilo de juego | `director/PerfilJugador.ts`: rasgos pared / corre / acampa / escucha (promedio móvil ~45 s). Cada evento declara `afinidad`: si te pegas a los muros, los muros contestan; si acampas, la calma se corta a los 20 s |
| Alivio tras muertes seguidas | `MemoriaMundo.muertesSinProgreso`: 2 muertes sin avanzar → límite de tensión −15 %, 3 → −30 %, tope −45 %. Se reinicia al alcanzar un punto de control |
| Firma sonora por estado | `ia/FirmaSonora.ts` (tabla de datos) + 5 sonidos: `jadeo_entidad` (bucle al cazar, dice dónde está), `respira_acecho` (bucle lentísimo), `chasquido` (articulaciones al escuchar), `friccion_muro` (paredes, yendo hacia un ruido), `arrastre` (retirada; en la falsa retirada se calla). Al acechar cerca, el ambiente baja hasta 30 % |
| Audio híbrido | `BibliotecaSonidos`: sintetiza todo y luego lee `public/audio/manifiesto.json`; cada grabación reemplaza o suma variantes, con ganancia. Si un archivo falla, queda la síntesis |
| Grabadora como segunda realidad | `jugador/CapturaGrabadora.ts`: la cinta capta los sonidos del mundo a < 12 m y la **presencia silenciosa** de la criatura (< 6 m en el muro, < 8 m con cuerpo), con dirección y distancia. Se mezcla con las líneas de la historia sin duplicarlas |
| Deuda técnica | `nucleo/SecuenciaMuerte.ts` (tiempo de juego, sin `setTimeout`) y `nucleo/Susto.ts` fuera de `Juego.ts` (717 → 679 líneas); 9 getters sin uso eliminados |

Verificado en el juego real (navegador headless, recorrido caminando escalera → puerta del 401 con E → X de medición):
medición completa con 0 eventos del director encima, cinta con presencia captada, presupuesto/respiro/vida media/alivio
exactos, bucles de la firma siguiendo al cuerpo y recreándose tras detener el audio, muerte a 1.50 s de tiempo de juego,
archivo real cargado y archivo faltante con respaldo sintético, costura del jadeo sin clic. 0 errores de consola.

**Pendiente de oído (no se puede verificar con pruebas):** escuchar la firma con audífonos y afinar volúmenes en la tabla
`FIRMAS`. En desarrollo: `__juego.audio.reproducir('jadeo_entidad')` en la consola.

#### Hotfix — caza sin oportunidad (encontrado con la telemetría, 2026-09-29)
En 2 de 2 muertes: un jadeo → la caza empezó a 3.5 m → muerte en 1.3 s, con 0 encuentros. En la sesión 1, en el
segundo exacto en que terminó la cinta del 401.
| Causa | Arreglo |
|---|---|
| Con sospecha ≥ 1, `EstadoParedes` salía del muro a 3.5 m **ya cazando** (nunca pasaba por el encuentro) | Sale siempre a **investigar**, a ≥ 5 m, y se queda 1.5 s escuchando antes de caminar |
| La caza corría desde el primer fotograma | `EstadoCazando`: 0.8 s de aviso (quieta, gira, jadea) antes de correr. Atrapar a 4 m: 1.3 → 1.8 s |
| Con Q apretada, tras el jadeo forzado volvía a aguantar al 35 % y jadeaba cada ~4.5 s | Hay que soltar Q para volver a aguantar |
| Soltar Q con < 30 % de aire también era jadeo (contradecía el consejo de muerte) | Solo jadeas si el aire se acaba; soltar a tiempo es una exhalación honda (ruido 0.14) |

Verificado reproduciendo el caso (punto de control 401, criatura en el muro a ~3 m, aguantar hasta jadear): sale a
5.2 m, investiga, encuentro con 95 % de aire, superado 3/3. Si no contienes el aire en el encuentro, sigue matando.
La telemetría ahora guarda el `motivo` de cada caza.

#### Pendiente de la Fase 10
- **Probar con 5+ personas con `?telemetria=1`** siguiendo el protocolo: ahora la telemetría también guarda la carga de
  tensión, el estilo detectado (`adaptacion`) y lo que captó cada cinta (`cinta`).
- Afinar con los datos: umbrales de audición, duración del encuentro, límites del presupuesto, afinidades y alivio.
- **Pruebas a distancia (2026-10-08):** los compañeros del creador juegan solos, cuando pueden. Enlace:
  `https://almendros.elmundodemanu.com/?telemetria=1`; mandan el `.json` y una nota de voz (protocolo §2). La pausa
  trae "Exportar registro de la prueba" con la telemetría encendida, porque desde el despertar en la escalera el
  Piso 4 ya no termina en la pantalla final; exportar a media partida guarda antes lo jugado, con su resumen.

#### Ronda 1 con telemetría (2026-10-08) — [informe](pruebas/ronda-1-2026-10-08.md)
4 compañeros que **ya conocían el juego**, jugando juntos en el salón (1 PC, 3 celulares; no cuenta como Gate 1).
Con la ruta aprendida, el Piso 4 se pasa en 1:45–2:44, con el estrés en 0 casi todo el tiempo y la criatura presente
solo tras el apagón (1 encuentro y 1 muerte en total). En Difícil, el jugador no murió: se perdió. El apagón es el
único pico. **Recomendación:** alargar y tensar el Piso 4 antes del guion del Piso 3 (ver `05-ESTADO-DEL-PROYECTO.md`).

### Contenido adelantado: escaleras, otros pisos y el Piso 3 (desde 2026-10-06)
El creador pidió más pisos, escaleras y frases de sangre (todavía no hay datos de jugadores), y decidió adelantar
este contenido sin esperar la ronda de testers de la Fase 10 (el Gate 1), que sigue pendiente.

| Tarea | Estado |
|---|---|
| Hueco de escalera visible (celdas `E`), sangre narrativa del 402, motor de cambio de piso | ✅ |
| Piso 3, tanda 1: el final del 402 despierta al jugador en la escalera; mapa del Piso 3; escalera de ida y vuelta | ✅ |
| Piso 3, tanda 2: frases escritas con el dedo (2 en el Piso 4, 3 en el Piso 3), manchas en escena (pasillo del 402, sala del 303) y la humedad roja en el techo del pasillo del Piso 3, justo bajo el charco del Piso 4 | ✅ |
| `Juego.ts` bajo 700 líneas, con prueba del tope; la escalera no es salida durante la caza | ✅ |
| Pantalla de fin reconectada: tarjeta "Piso 4 superado" al bajar por primera vez, pantalla final con una línea por piso (partida v7) | ✅ |
| La llave de la reja ya no se regala: aparece bajo la silla del cuarto del 402 con el final; al despertar se oye caer, y si se tarda, una pista escrita | ✅ |
| Abrir la reja con peso: la llave gira, el candado cae (hace ruido), la cadena se desliza y las hojas se abren; queda abierta | ✅ |
| El 302 y la libreta de Andrés: 5 documentos (carta del administrador y hoja de Andrés en el 301, hoja en el 303, cuaderno y carta de la mamá en el 302), 3 cosas para examinar (una línea flotando, sin pausar), rayas de estatura y un arrastre hacia adentro en el 302, 2 pilas y el punto de control del cuarto del 302. Juntar la libreta marca `imitacion:piso3` | ✅ |
| Guion del Piso 3 (golpe en la pared, apagón al juntar la libreta, la criatura en el pasillo al volver) | Siguiente |
| Ascensor: solo el sonido del hueco | Pendiente |

**Resuelto:** la regla `imitacionCompletaCon` del Piso 3 (`imitacion:piso3`) ya se cumple: la marca el guion del
Piso 3 al leer las tres partes de la libreta, en cualquier orden. Desde ahí la criatura del Piso 3 llega a la
imitación completa (etapa 3: repetir tu ritmo cuando te detienes). Lo prueban `guionPiso3.test.ts` y, caminando,
`libretaPiso3.spec.ts` (incluida la partida guardada un instante antes de que el guion marcara la bandera).

**Regla de las frases:** pocas y con razón. Las escribió gente que ya no podía hablar (él repite las voces, como
cuenta el diario del 401); nunca son mensajes de la criatura. Viejas y oscuras como el resto de la sangre: sin
linterna casi no se ven.

### Fase 11 — Calidad visual (3–4 semanas)
- Modelo de la criatura en glTF con esqueleto (Blender) manteniendo la animación a 12 fps.
- Texturas escaneadas CC0 (ambientCG, Poly Haven) mezcladas con el desgaste procedural.
- Oclusión ambiental precalculada por vértice (barata en móvil), volumétrico falso en el haz de la linterna.

### Fase 12 — Audio de foley real (2 semanas)
- Grabar pasos, puertas y respiraciones reales (Zoom H1n o celular + espuma). Mantener la síntesis para variaciones y la criatura.

### Fase 13 — Contenido (4–8 semanas)
- "El hueco" entre el 401 y el 403, piso 3 en espejo, sótano de bombas, azotea.
- Escondites acústicos (armario: amortigua tus sonidos, pero no oyes bien afuera).

### Fase 14 — Optimización y empaquetado
- Caché de texturas en IndexedDB, compresión KTX2 para assets reales.
- Tauri 2 (Windows/macOS/Linux) y Capacitor (Android/iOS), pruebas en dispositivos reales.

### Fase 15 — Pulido y lanzamiento
- Localización (inglés/portugués), logros, página en itch.io/Steam.
