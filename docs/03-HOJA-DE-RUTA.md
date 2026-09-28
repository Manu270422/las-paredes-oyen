# Hoja de ruta

## Hecho en este ciclo (vertical slice jugable)

| Fase | Contenido | Estado |
|---|---|---|
| 1. Fundamentos | Vite + TS estricto, bucle, bus tipado, programador, contexto, configuración | ✅ |
| 2. Plataforma, entrada y render | Detección de dispositivo, orientación horizontal, pantalla completa, teclado/ratón, mando, táctil, WebGL2, perfiles de calidad, resolución dinámica, postprocesado propio | ✅ |
| 3. Escenario | Rejilla de datos → geometría (vanos de puertas, guardaescobas), texturas procedurales PBR, muebles y sábanas, colisiones | ✅ |
| 4. Iluminación | Linterna con cookie y sombras, pool de luces, lámparas con parpadeo e interferencia, niebla | ✅ |
| 5. Audio | Motor Web Audio, HRTF, oclusión por muros, reverb por habitación, 34 sonidos sintetizados, ambiente y dron | ✅ |
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

#### Pendiente de la Fase 10
- **Probar con 5+ personas** siguiendo el protocolo. Nada de lo siguiente debería priorizarse sin esos datos.
- Afinar con los datos: umbrales de audición, duración del encuentro, fases del director, volúmenes de la imitación.

#### Sprint 2 propuesto (después de la primera ronda de pruebas)
1. **Firma sonora de El Inquilino por estado** (paredes / investigando / cazando / acechando / retirada): capas de respiración, fricción contra el muro, paso húmedo doble, silencios. Requiere escuchar en audífonos: no se diseña a ciegas.
2. **Pipeline de audio híbrido**: `BibliotecaSonidos` carga grabaciones reales por `IdSonido` cuando existan (manifiesto + `decodeAudioData`) y cae a la receta sintética si no. Base de la Fase 12.
3. **Grabadora como segunda realidad con reglas**: lo que "capta" una medición sale de lo que realmente ocurrió fuera de vista durante esos 6 s (posición de la criatura, eventos no vistos), no solo de un guion fijo.
4. **Director con memoria de tensión**: presupuesto de intensidad reciente, no lanzar eventos que pisen un encuentro o una medición, y primeras señales de adaptación (jugador que se pega a las paredes, que corre, que acampa) usando los mismos contadores de la telemetría.
5. **Deuda técnica**: `Juego.ts` (~700 líneas) → extraer el flujo de muerte/final; secuencia de muerte con `setTimeout` real (debería usar tiempo de juego); getters sin uso.

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
