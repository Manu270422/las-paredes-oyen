# LAS PAREDES OYEN — Diseño maestro

> *"Las paredes oyen."* — refrán popular.
> En este juego no es una metáfora. Es la regla.

---

## 1. Concepto general

Terror psicológico en primera persona, **basado en sonido**. Soy un técnico de acústica contratado para medir el "tono de sala" de los apartamentos del Edificio Almendros (Bucaramanga) antes de su demolición. El edificio está vacío. Algo vive dentro de los muros: es ciego, solo oye, y aprende de todo lo que escucha.

**La mecánica central convierte el miedo en obligación:** para avanzar tengo que quedarme **quieto y en silencio durante seis segundos** sobre una marca en el piso, en la oscuridad, sabiendo que algo me escucha. El juego obliga al jugador a hacer justo lo que más miedo le da.

## 2. Premisa narrativa

Durante años, todo el edificio oyó lo que pasaba en el 402: los gritos, los golpes contra la pared, un niño llorando bajito. Y todos subieron el volumen del televisor. Nadie dijo nada.

Lo que nadie dijo no se fue a ningún lado. Se quedó en las paredes, oyendo, aprendiendo voces, pasos, golpes. Ahora que ya no queda nadie a quien escuchar, **tiene hambre**.

La historia no se explica: se arma con fragmentos (orden de trabajo, diario de la vecina del 401, casete del 403, carta sin enviar, lo que capta la grabadora). ¿Es una criatura? ¿Es la culpa colectiva del edificio? El juego no responde.

## 3. Qué lo hace diferente

| Idea | Por qué es distinta |
|---|---|
| **El jugador es quien escucha… y quien es escuchado** | El audio no es ambientación: es la interfaz del peligro. |
| **Medir = quedarse quieto** | Invierte el reflejo del género (huir). El jugador debe exponerse. |
| **La grabadora capta lo que no oíste** | Al reproducir aparece lo que "no estaba": una voz, tus propios pasos cuando estabas quieto. |
| **Las paredes llevan el sonido** | Regla espacial aprendible: caminar pegado al muro te delata. Cambia cómo te mueves en cada cuarto. |
| **La criatura imita** | Tus pasos tienen "eco" que llega un poco tarde… y da un paso más cuando te detienes. |
| **Identidad latinoamericana** | Edificio de los 60–70, zócalo verde, granito pulido, parqué, papel de colgar, red eléctrica de 60 Hz, silencio vecinal cómplice. |

No es un clon de: Amnesia (no hay cordura ni escondites mágicos), Outlast (no hay cámara-linterna infinita), Slender (no es colección + persecución), FNAF (no es gestión estática).

## 4. Tipo de terror

**Psicológico y acústico**, con amenaza física real. Mezcla: anticipación, incertidumbre perceptiva ("¿eso fue mi paso?"), vulnerabilidad (sin armas), espacios familiares que cambian, y muy pocos sustos directos pero ganados.

## 5. Miedo extremo sin abusar de jumpscares (sistemas, no trucos)

| Técnica | Sistema jugable que la implementa |
|---|---|
| Anticipación | **Director de terror** con ciclo *calma → acumulación → pico → relajación*; la intensidad sube por escalones. |
| Incertidumbre | Sonidos dentro de la pared (filtrados, sin dirección clara); susurros con fonemas falsos que casi se entienden. |
| Vulnerabilidad | Sin armas. Solo: agacharse, contener la respiración (aire limitado), cerrar puertas, señuelo. |
| Miedo a quedarse quieto | Medición obligatoria de 6 s + evento *respiración detrás* si te quedas quieto sin motivo. |
| Miedo a moverse | Cada paso emite ruido (según piso, velocidad y cercanía a muros). |
| Falsas zonas seguras | La luz de emergencia de la escalera parpadea (nunca muere, pero duda). Fase de *relajación* con falsa retirada de la criatura. |
| Memoria del jugador | **Memoria del mundo**: puertas y muebles que el jugador ya vio cambian cuando no mira. |
| Sensación de ser observado | Estado *acechando*: la criatura sigue tu rastro a 6–8 m e imita tus pasos. |
| Repetición con variaciones | Los "tres golpes" a veces son dos… y el tercero llega tarde y más cerca. |
| Fatiga y respiración | Respiración ligada al estrés: con miedo jadeas, y el jadeo es ruido real. |
| Silencio | Evento *silencio total*: el ambiente cae a cero 9 s. Luego un crujido junto a ti. |
| Jumpscare ganado | Solo dos: al ser atrapado y al final del vertical slice. |
| Muerte justa | La pantalla de muerte dice **qué oyó** ("Oyó tu respiración") y lo hace sonar como ella lo oyó, apagado a través del muro. El consejo práctico solo aparece la primera vez por causa. |

## 6. La amenaza: "El Inquilino"

- **Cuerpo:** 2.25 m en techos de 2.7 m (vive encorvado), demacrado, hombros desiguales, brazos hasta las rodillas, sin ojos, solo una ranura por boca. Se anima a **12 poses por segundo** mientras el mundo va a 60 FPS: se mueve "mal".
- **Reglas que el jugador descubre:**
  1. Es ciego. Solo oye.
  2. Dentro de los muros oye **mejor** (los muros casi no lo atenúan).
  3. Hacer ruido pegado a la pared te delata más.
  4. Si lo ves y no haces ruido, a veces se retira.
  5. **Solo mata cuando caza.** La caza siempre tiene aviso (su respiración, interferencia, sobresalto, y 0.8 s quieta girando hacia ti antes de lanzarse) y siempre una causa que la pantalla de muerte puede explicar. **Nunca sale del muro cazando**: sale a 5 m o más, se queda 1.5 s escuchando y va a investigar (hotfix del 2026-09-29: antes salía a 3.5 m ya cazando y mataba en 1.3 s).
  6. **No camina encima de ti si estás quieto** (*encuentro de presencia*, Sprint 1): se detiene a ~2.5 m, inhala despacio y **escucha** 3–4.5 s. Si contienes el aire y no te mueves, se retira. Si respiras, jadeas o te mueves, caza. Mientras ella inhala (0.9 s), su respiración tapa la tuya: es tu ventana para reaccionar.
- **Excepciones (rompen la regla):**
  - Si **te mueves** cerca de ella (< 1.9 m), te siente aunque no hagas ruido. Si estás prácticamente encima (< 1.2 m), aunque estés quieto.
  - Con la pila baja, **la linterna zumba y él la oye**.
  - Su retirada a veces es **falsa**: se oyen pasos alejándose, pero el cuerpo se queda quieto en la oscuridad. Si caminas junto a ella creyendo que se fue, te siente.
  - **Medir la atrae**: después del 401, mientras mides, se desliza por los muros hacia ti; los rasguños se acercan y, cuando llega, se callan.
- **Imitación en etapas** (`ia/Imitador.ts`): 1) eco perfecto de tus pasos ("¿acústica?"); 2) cuando te detienes, da **un paso más**; 3) tras la grabación del 403, cuando te detienes **repite tu ritmo** acercándose… y un último paso que ya no es tuyo. La etapa sube con lo vivido, no al azar.
- **Estados de IA:** en las paredes · investigando (con encuentro) · cazando · acechando · retirada.
- **Señales aprendibles:** parpadeo de linterna y lámparas cerca de él, pasos húmedos con un segundo impacto arrastrado, rasguños dentro del muro.
- **Firma sonora por estado** (`ia/FirmaSonora.ts`): roza el muro cuando va hacia un ruido, le crujen las articulaciones cuando investiga, jadea al cazar (el jadeo dice dónde está), respira lentísimo al acechar y el edificio se calla a su alrededor, arrastra un pie al retirarse (en la falsa retirada, el arrastre se calla).
- **Aparición:** solo por un punto que el jugador **no** está mirando.

## 7. Mecánicas principales (cada una con razón de ser)

| Mecánica | Razón en el terror |
|---|---|
| Medir salas (6 s inmóvil) | Obliga a la exposición. Es el "puzzle" central. |
| Contener la respiración | Silencio a cambio de un recurso que se acaba; si se acaba, jadeo fuerte. |
| Agacharse | Menos ruido, puertas despacio; más lento = más tiempo expuesto. |
| Escuchar con atención | Oyes a través de muros, pero te mueves casi nada y la vista se cierra. |
| Linterna con batería | Ver vs. ser oído (clic y zumbido). |
| Señuelo (grabadora) | Te la juegas: la dejas sonar y luego debes volver a recogerla. |
| Puertas | Decisión constante: cerrar retrasa a la criatura, abrir de pie cruje. |
| Documentos | Narrativa y enseñanza de reglas sin tutoriales explícitos. |

## 8. Primeros niveles

**Piso 4 (vertical slice, implementado):** escalera (zona "segura" con luz roja) → pasillo estrecho de 1.3 m → 401 (lámpara encendida sin electricidad) → 403 (estudio del vecino que grababa las paredes) → cuarto de servicio sin salida con el tablero → 402 cerrado, todo cubierto con sábanas. Entre 401 y 403 hay **3.9 m de muro macizo que no deberían existir**.

**Siguientes pisos (diseño):**
- **Piso 3:** los apartamentos se repiten con variaciones (el 301 es el 401 en espejo, pero con los muebles sin cubrir… y alguien comiendo).
- **"El hueco":** el espacio entre el 401 y el 403, accesible rompiendo el papel de colgar. Un pasillo que no aparece en los planos.
- **Sótano / cuarto de bombas:** metal y agua; sonido muy reverberante que confunde direcciones.
- **Azotea:** único exterior. Viento que tapa todo sonido: no oyes, no sabes dónde está.

## 9. Sistema de eventos dinámicos

- **DirectorTerror** decide *cuándo* (fases, enfriamientos, tope de intensidad creciente) y *qué* (13 eventos, cada uno en su archivo, con condiciones propias).
- Selección **ponderada por novedad**: lo que no ha pasado hace rato pesa más; nada se siente repetido.
- **Memoria de tensión** (`PresupuestoTension`): cada susto gasta presupuesto (vida media 40 s); nunca lanza eventos durante una medición, un encuentro o una caza.
- **Perfil del jugador** (`PerfilJugador`): pegado a los muros, corriendo, atrincherado o escuchando; cada evento declara a qué estilo "contesta". Tras 2+ muertes seguidas sin avanzar, el director afloja (hasta −45 %).
- **MemoriaMundo**: habitaciones visitadas, tiempo en cada una, puertas vistas/usadas → "esa habitación no era así".
- **Visibilidad**: casi todo cambio ocurre fuera de la vista; lo visible ocurre en la **periferia**, 0.22 s.
- **Guion** separado del director para los golpes narrativos que deben ocurrir siempre (apagón, transcripciones, final).

## 10. Sistema de audio

- Web Audio API nativa. Buses: ambiente, efectos, entidad, voz, interfaz → compresor final.
- **Audio 3D HRTF** (binaural) en calidad media/alta; paneo simple en baja.
- **Oclusión por rejilla**: cuento muros y puertas cerradas entre oyente y fuente → filtro pasa-bajos + atenuación; los muros "reverberan" más.
- **Reverb por habitación** con convolución: impulsos generados por código (pasillo, sala, cuarto, baño, escalera, ducto metálico) y fundido cruzado al cambiar de cuarto.
- **Todo sintetizado** (41 sonidos con variantes): pasos por superficie, crujidos por *stick-slip*, golpes, respiración con formantes, susurros con fonemas falsos, zumbido de 60 Hz, tuberías inarmónicas, y la firma de la criatura.
- **Audio híbrido**: `public/audio/manifiesto.json` permite reemplazar (o sumar variantes a) cualquier `IdSonido` con una grabación real; si falla, queda la síntesis. Hoy el manifiesto está vacío.
- **La grabadora como segunda realidad** (`jugador/CapturaGrabadora.ts`): la cinta capta los sonidos reales a < 12 m y la presencia silenciosa de la criatura, con dirección y distancia.
- **Modo escuchar**: baja ambiente, sube la entidad, reduce la oclusión.
- **Dron de tensión** (segunda menor) + **acúfeno** con estrés alto.
- Subtítulos de efectos **con dirección** (accesibilidad).

## 11. Sistema de iluminación

- Linterna = SpotLight con **cookie** procedural (punto caliente, anillo del reflector, suciedad), **sombras** dinámicas, sostenida abajo a la derecha (las sombras se mueven), con retraso de mano, luz de rebote barata, curva de batería real.
- **Pool de luces** fijo por calidad (2/4/6) asignado a las lámparas más relevantes: sin recompilar shaders.
- Lámparas con estados: encendida, parpadeante (patrón realista), apagada, rota; **interferencia** cerca de la criatura.
- Niebla exponencial negra: el fondo del pasillo desaparece.
- Postprocesado propio HDR: ACES, aberración y distorsión por estrés, viñeta con el latido, grano, interferencia VHS.

## 12. Arquitectura técnica

Ver `02-ARQUITECTURA.md`. Resumen: **módulos por responsabilidad**, comunicación por **bus de eventos tipado**, **contexto** compartido, niveles como **datos**, estado derivado de **banderas** (guardar/cargar trivial).

## 13. Lenguaje y stack — decisión justificada

**TypeScript + WebGL 2 (Three.js como librería de dibujo) + Web Audio API + Vite.**

| Opción | Ventajas | Desventajas | Veredicto |
|---|---|---|---|
| C++ + Vulkan/DirectX | Máximo techo visual en PC | Portar a Android/iOS/tabletas = otro proyecto; meses de infraestructura antes del primer susto | ❌ Choca con tu requisito de "todos los dispositivos" |
| Rust + wgpu | Seguro, multiplataforma, WebGPU | Ecosistema de audio/UI inmaduro; curva alta | ⚠️ Buena opción para una v2 |
| **TypeScript + WebGL2 + Web Audio** | **Un solo código para móvil, tableta, portátil, PC y TV**; audio HRTF nativo; iteración instantánea; empaquetable | Techo gráfico menor que un motor AAA; rendimiento JS | ✅ **Elegido** |

Three.js **no es un motor**: no aporta escenas, físicas, IA, audio, guardado ni lógica. Lo uso solo para no reescribir el cargador de shaders PBR. Toda la lógica del juego es propia.

## 14. Dependencias

| Nombre | Propósito | Versión | Instalación | Por qué |
|---|---|---|---|---|
| three | Dibujo WebGL2 (PBR, sombras) | ^0.186 | `npm i three` | Evita meses reescribiendo shaders PBR |
| typescript | Tipado estricto | ^7 | `npm i -D typescript` | Proyecto grande = tipos obligatorios |
| vite | Servidor/empaquetado | ^8 | `npm i -D vite` | Recarga instantánea, build optimizado |
| @types/three | Tipos | ^0.186 | `npm i -D @types/three` | Autocompletado y errores en VS Code |

Sin más dependencias. Futuras (solo cuando se necesiten): **Tauri 2** (ejecutable PC ligero), **Capacitor** (Android/iOS).

## 15. Estructura del proyecto

Ver `02-ARQUITECTURA.md`.

## 16. Estrategia para hardware limitado

- Perfiles **baja/media/alta** con detección automática + **resolución dinámica** (baja sola si caen los FPS).
- Lo que **nunca** se quita: oscuridad, linterna, audio 3D, niebla. Lo que se quita: sombras, MSAA, postprocesado HDR (queda grano/viñeta CSS), texturas grandes, luces extra.
- Contenido procedural: descarga casi nula (~200 KB comprimido).
- Pool de luces fijo, geometría estática fusionada por material, caras ocultas eliminadas.

## 17. Vertical slice (10–20 minutos) — **implementado**

1. Tarjeta: *Edificio Almendros · Piso 4 · 11:48 p. m.* Escalera con luz roja.
2. Orden de trabajo → objetivo: medir 401, 403, 402.
3. **401**: lámpara encendida sin luz, radio, diario de Rosalba (enseña las reglas). Medición: **tres golpes junto a ti mientras no puedes moverte**. La grabación reproduce una voz: *«…no le contestes…»*. La criatura se habilita.
4. El director empieza a trabajar: golpes, pasos arriba, puertas que cambian, radio que se enciende sola, eco de tus pasos, silueta fugaz.
5. **403**: casete del vecino (la voz que repite; la linterna que zumba). Medición: la grabación tiene **tus pasos** cuando estabas quieto.
6. **Tablero** al fondo del callejón sin salida: vuelve la luz. Alivio.
7. **Apagón**: las lámparas del pasillo revientan una por una **hacia ti**. Al final, en el extremo, algo de pie.
8. Llave en el estudio del 403 → **402**: todo cubierto, una sábana con forma de persona (que a veces ya no está).
9. **Final**: la grabación del 402 trae pasos acercándose al micrófono… luego ya no vienen de la grabadora sino de atrás. La linterna muere. Algo respira en tu nuca. La luz vuelve. Está frente a ti.

## 18. Hoja de ruta

Ver `03-HOJA-DE-RUTA.md`.

## 19. Riesgos técnicos principales

| Riesgo | Mitigación |
|---|---|
| Rendimiento en móviles de gama baja | Perfiles + resolución dinámica + pool de luces; probar en un Android de ~150 USD cada fase |
| iOS Safari: sin bloqueo de orientación, audio más estricto | Aviso de orientación + gesto inicial obligatorio (implementado) |
| Audio sintético puede sonar "de juguete" en foley cercano | `public/audio/manifiesto.json` reemplaza cualquier `IdSonido` por una grabación real sin tocar lógica (implementado, falta grabar) |
| Arte 3D procedural limita el techo visual | Pipeline de modelos glTF + texturas CC0 escaneadas en fase 4 |
| IA "injusta" (muertes que se sienten aleatorias) | Señales aprendibles + pistas en pantalla de muerte + playtesting con métricas |
| Pointer Lock en navegadores | Aviso "haz clic para mirar" + pausa automática al perderlo (implementado) |

## 20. Qué construimos primero

Ya construido y publicado en Vercel (`almendros.elmundodemanu.com`): **Fases 1–9 en forma de vertical slice jugable**, el **Sprint 1 de la Fase 10** (justicia de la IA, encuentro de presencia, imitación en etapas, muerte explicada, telemetría local) y el **Sprint 2** (director adaptativo, firma sonora, audio híbrido, grabadora como segunda realidad). Lo siguiente (Sprint 3): infraestructura que no depende de datos (pisos como paquetes, guardado versionado, pruebas en el repo) mientras se hace el **playtesting real con 5 personas con audífonos** (Gate 1). Sin esos datos no se toca balance ni se agrega contenido.
