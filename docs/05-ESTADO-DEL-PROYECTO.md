# Estado del proyecto — dónde quedamos

> **Léelo primero al empezar una sesión.** El creador trabaja desde varios computadores (algunos prestados) y la
> memoria de Claude se queda en cada máquina: lo que hay que recordar vive aquí y en el repo.
> **Actualízalo al final de cada sesión** (sección "Bitácora" y lo que haya cambiado arriba).
>
> Última actualización: 2026-10-10.

## La meta

Proyecto propio del creador (Manu270422), no de la universidad. **Sueño: publicarlo en la Play Store.**
Eso implica: Android con Capacitor (Fase 14), rendimiento en celulares de gama media y que el juego sea bueno para
alguien que no lo conoce, no solo para quien lo hizo.

El creador pide **la verdad sin suavizar**, en español. Nada de porcentajes inflados.

## Meta de fecha: Play Store el 31 de octubre de 2026

El creador quiere el juego descargable en la Play Store el 31 de octubre. Lo que se sabe (2026-10-09, fuentes de
desarrolladores, sin página oficial confirmada; verificar en la Play Console):
- Una cuenta personal **nueva** necesita una **prueba cerrada con ≥ 12 testers durante 14 días seguidos** antes de
  pedir acceso a producción; después viene la revisión de Google (puede tardar días).
- Además: la cuenta de desarrollador (pago único de 25 USD y verificación de identidad, que puede tardar días),
  empaquetar con Capacitor (Fase 14), firmar el AAB, política de privacidad, clasificación de contenido y el
  formulario de seguridad de datos.
- **Realista:** el 31 de octubre como lanzamiento web de Halloween + prueba cerrada ya corriendo en Play Store;
  publicación abierta en noviembre. Para llegar, la prueba cerrada tiene que empezar a más tardar ~el 15 de octubre.

## Ramas y publicación

| Qué | Dónde |
|---|---|
| Sitio público | `almendros.elmundodemanu.com`, publica **`origin/main`** (hoy `1fb67d6`: Piso 4 con el ritmo nuevo y el Piso 3 hasta la libreta) |
| Trabajo en curso | **`sprint-4`** (Piso 3 a medias, escalera, llave, reja, libreta del 302, exportar desde la pausa) |
| Ver qué commit está publicado | En el bundle en vivo aparece `0.1.0+<sha>` (buscar en `assets/index-*.js`) |
| Enlace de los testers | `https://almendros.elmundodemanu.com/?telemetria=1` (protocolo §2) |

**No hacer merge de `sprint-4` a `main` sin preguntar.** Publicaría un Piso 3 sin final a los testers, y desde el
despertar en la escalera el Piso 4 ya no termina en la pantalla final.

El `main` local puede estar desactualizado: comparar siempre con `origin/main`.

## Avance honesto (2026-10-09, después de la ronda 1 y del ritmo del Piso 4)

| Qué | Avance | Nota |
|---|---|---|
| Sistemas (IA, audio, director, guardado, UI, pruebas) | ~90 % | Sólidos: 417 unitarias + 60 recorridos caminando (2026-10-12) |
| **Piso 4 como experiencia** | **~55 % (sin validar)** | La ronda 1 lo mostró en ~2 min y sin tensión ([informe](pruebas/ronda-1-2026-10-08.md)). Con [P4-ritmo](propuestas/P4-ritmo.md) ya hay encuentro temprano, medir atrae, la historia lleva a la llave y el 402 tiene clímax. Hasta que lo jueguen personas nuevas, es una hipótesis |
| Piso 3 | ~80 % (sin validar) | Completo de principio a fin ([P3-guion](propuestas/P3-guion.md)): libreta, apagón, grabar la pared del cuarto de Andrés, ella en el pasillo, final. Desde el 2026-10-12 tiene el ascensor (sube al 4 y baja al 3). Falta que lo jueguen personas |
| Android | ~30 % | Capacitor 8, APK de prueba compilado ([06-ANDROID](06-ANDROID.md)). Falta: verlo en un celular, ícono, firma, cuenta de Play Console, prueba cerrada |
| Validación con jugadores nuevos (Gate 1) | ~5 % | La ronda 1 fue con jugadores que ya conocían el juego |
| Hacia la Play Store | ~20 % | Faltan: Piso 4 con ritmo, final del juego, audio real, rendimiento móvil medido, fuente propia, Capacitor |

## Qué sigue (en orden)

**Orden aprobado el 2026-10-10** (ver C1): arreglar la trampa del Piso 3 (hecho) → **escaleras que se caminan**
(hecho: C2 §1, el fundido queda como opción) → **monstruo más tenebroso**, mejorando en código "El Inquilino"
(hecho; Blender queda para la Fase 11) → **ascensor** (C2 §3, hecho el 2026-10-12) → Piso 2 → Piso 1 → **salir del edificio** con
"Sobreviviste" (la idea final del creador: muy difícil, como Granny, pero posible).

Para el 31 de octubre alcanza, siendo realistas: la trampa, el Piso 3 publicado, las escaleras y el monstruo. El
ascensor ya está (2026-10-12); los pisos 2 y 1 llegan después.

## Textos y decisiones del ascensor que el creador debe revisar (2026-10-12)

- **Muerto (Piso 4, sin la llave de la escalera):** "El botón no se enciende. El ascensor está muerto, como todo el
  edificio."
- **Subtítulos de sonido:** "[el ascensor, moviéndose por el pozo]", "[la campanilla del ascensor]" y "[el ascensor
  se puso en marcha solo]" (al tomar la llave).
- **Muerte por el ascensor:** "Oyó el ascensor." Consejo: "El ascensor se oye en todo el edificio: el motor por los
  muros y la campanilla al llegar. Úsalo cuando esté lejos."
- **Botones:** "Llamar al ascensor", "Bajar al Piso 3", "Subir al Piso 4". La placa del panel dice "4 PERSONAS ·
  300 KG".
- **Decisión a confirmar:** en el Piso 4 el ascensor funciona desde que tomas la llave de la escalera. Con la llave
  puedes bajar en ascensor sin abrir la reja (más rápido, pero ruidoso). Si prefieres que haya que bajar la primera
  vez por la escalera, es cambiar una línea del paquete.
- **Riesgo a mirar con testers:** las paredes de la cabina usan la textura de metal con manchas rojizas de óxido: en
  la luz fría se leen como sangre seca. A mí me parece que suma, pero es una impresión, no un dato.

Lo que sigue es la lista anterior (2026-10-09), que se mantiene para lo técnico y lo de Android:

1. ~~Que el Piso 4 dure 10–15 min y dé miedo también a quien ya lo conoce.~~ **Hecho en `sprint-4` el 2026-10-09**
   ([P4-ritmo](propuestas/P4-ritmo.md)). Falta comprobarlo con jugadores (punto 3).
2. **Técnico para móvil:** incluir la fuente en el juego (hoy `system-ui`, y un celular la cambió por una
   manuscrita). La calidad "alta" del P2 (~33 FPS) la eligió alguien a mano: en celular, la automática nunca da
   "alta". Lo serio es otra cosa: el perfil "baja" apaga el HRTF (audio binaural) y el P4 jugó sin él. Hay que
   medir en un celular real si el HRTF cabe en "baja".
3. **Ronda 2** con jugadores **nuevos**, solos y con audífonos, que manden el JSON y una **nota de voz**. Los
   compañeros de la ronda 1 prueban lo nuevo como expertos. **Decisión pendiente del creador:** para que la
   jueguen hay que publicar `sprint-4` (merge a `main`), y eso trae el Piso 3 sin terminar después del 402. Se
   puede pedir a los testers que paren en la tarjeta "Piso 4 superado" (la pausa ya tiene "Exportar registro").
4. ~~El guion del Piso 3~~ **hecho el 2026-10-09** con su final. El ascensor ya está (2026-10-12). Queda partir
   `PintorRastros.ts` en un commit aparte.
5. **Android:** instalar el APK en un celular real y revisar la lista de [06-ANDROID](06-ANDROID.md); después el
   ícono, la firma y la cuenta de Play Console (lo que más tarda es la verificación de la cuenta).
6. **`Juego.ts` está en 698 de 700 líneas.** Lo próximo que lo toque tiene que sacar algo primero.
7. **Cambiar de piso sin recompilar shaders** (propuesto el 2026-10-12, tarea corta y aparte): rótulos, placas,
   rastros, el fondo de la escalera y las zonas de toque sueltan sus materiales en cada cambio de piso y el piso nuevo
   recompila 8 programas. Conservarlos como los del ascensor acortaría el cruce caminando (y el tirón en celular) y
   quitaría la fragilidad del tope de 2 s de `escaleraCaminada`.

Lo que el creador tiene que hacer y Claude no puede: escuchar con audífonos y decir qué suena falso (`FIRMAS`),
medir FPS en su celular y conseguir testers.

## Textos nuevos del Piso 4 que el creador debe revisar (2026-10-09)

- **Orden de trabajo, página 2:** "La llave del 402 se la dejé a don Gustavo, el del 403: él guardaba las de todo el
  piso. Búsquela en su estudio." El vecino del 403 (el de las cintas) no tenía nombre: ahora se llama **don Gustavo**.
- **La nota de M.** ya no está en la nevera: está sobre el escritorio del estudio, donde Hernando creía que estaba
  la llave. Agrega: "La llave del 402 se la devolví a doña Rosalba. Está en el cajón de su mesita. No la vuelva a
  traer a esta casa."
- **La llave del 402:** "En el cajón, debajo de unas cartas: una llave con una etiqueta de cartón. «402»."

## Textos nuevos del Piso 3 que el creador debe revisar (2026-10-09)

- **La cinta del cuarto de Andrés:** "Una voz de niño, pegada al micrófono: «Hoy mi mamá me midió.»" y "La misma voz,
  más grave, con el ritmo de tu respiración: «Ya casi estoy completo.»"
- **El final:** "Abajo, detrás de la reja, alguien golpea tres veces. Despacio. Para que sepas que oyó."
- **La pista del pasillo** (solo con pistas): "Está entre tú y la escalera. Deja la grabadora lejos de ella, o
  ilumínala quieto hasta que se vaya."
- **Riesgo a mirar con testers:** al iluminarla se retira, pero en retirada todavía tiene cuerpo y se aleja hacia la
  escalera. Si el jugador la sigue enseguida, la alcanza y lo caza. La prueba automática tuvo que esperar a que se
  hundiera en la pared. Puede sentirse injusto.

## Decisiones del 302 que el creador debe revisar (de la sesión del 2026-10-08)

Commit `9646829`, "El 302: la libreta de Andrés…". Se tomaron estas decisiones y quedaron por confirmar:

- **Bandera:** se mantuvo `imitacion:piso3`, que es la del objetivo "Junta las hojas…".
- **Arrastre contrario:** en el 402 el charco está adentro y el arrastre sale hacia la puerta. En el 302 el charco
  está en el umbral, justo debajo del de arriba, y el arrastre va hacia adentro: arriba lo sacaron, aquí lo
  entraron. Cambiarlo es una línea.
- **Dormitorio del 302:** pasó de azulejo a papel de colgar, para que el lápiz de las rayas se lea. La sala y el
  cuarto siguen en azulejo.
- **Rayas del 302:** llegan a "Andrés 4 años", "5" y "6 años", sin mancha. Las del 402 siguen hasta los 7, porque la
  familia se mudó arriba el 1 de noviembre.
- **Objetivos del Piso 3:** "Averigua por qué cerraron este piso" y "Junta las hojas del cuaderno de Andrés, el niño
  del 302". Con la libreta completa, el piso se queda sin objetivo hasta que exista su guion.
- **Punto de control del cuaderno:** también cuenta en Difícil. Si se quiere Difícil más duro, se quita.
- **Nombre de la mamá:** Luz Dary, para no confundirla con la "— M." de la nevera del 403.
- **Textos fuertes, que hay que leer antes de publicar:** "Yo le dije que sí.", "Al papá no." y "Mijo, yo no me
  puedo meter en". La hoja del 303 menciona el ascensor a propósito.

## Cómo se trabaja en este repo

- **Git en discos sin dueños:** el repo está en D: en el portátil prestado y en F: en el PC del creador:
  `git -c safe.directory=F:/JuegoDeTerror …` (o la letra que toque).
- **Autoría:** el creador hace todo el git a mano; Claude solo entrega los comandos y mensajes sin atribución. En cada
  computador nuevo, revisar que `%USERPROFILE%\.claude\settings.json` tenga `"attribution": {"commit": "", "pr": ""}`
  y que no haya permisos automáticos para `git add` o `git commit`.
- `npm run test:rapido`: tipos y unitarias (~10 s). `npm test`: todo, con recorridos caminando en Chrome (~27 min).
- Toda prueba nueva de juego incluye **un recorrido caminando**, sin teletransporte (lección del hotfix del
  2026-09-28).
- `Juego.ts` tiene tope de 700 líneas (lo vigila `topeComplejidad.test.ts`).
- Mensajes de commit en español, describiendo el cambio para quien lea el historial.
- Documentos: `01` diseño, `02` arquitectura, `03` hoja de ruta, `04` protocolo de pruebas, `propuestas/` (C1, C2,
  T4, A1–A4, B1) y `pruebas/` (resultados de cada ronda con sus datos).

## Bitácora

| Fecha | Qué se hizo |
|---|---|
| 2026-10-12 | **El ascensor** (C2 §3, ver 01-DISENO y 02-ARQUITECTURA), entre el Piso 4 y el 3. Celda nueva `A` en las dos rejillas, en (5, 11). Llamarlo zumba por los muros 7 s y la campanilla al llegar es un ruido fuerte (causa `maquina`, con su explicación de muerte); adentro vibra, la luz titila y se puede mirar y moverse; a la mitad del viaje el piso cambia sin negro y sigo en el mismo punto de la cabina. Ella no viaja (si estaba afuera, golpea el metal y se va a las paredes), con las puertas abiertas entra (no es refugio), las puertas se vuelven a abrir si alguien está en el vano, y al llegar no abren con ella a menos de 4 m (si no se va en 6 s, a las paredes). En el Piso 4 está muerto hasta tomar la llave de la escalera; entonces viene solo. En el Piso 3 su tubo revienta con la libreta. 3 sonidos nuevos (44). **Hallazgo de rendimiento:** los materiales propios del ascensor se soltaban al cambiar de piso y el piso nuevo recompilaba sus shaders (el cruce de la escalera llegó a 5.8 s en el navegador de pruebas); ahora se conservan en la biblioteca. Medido en el mismo PC, 6 cruces cada uno: último commit sin ascensor 1.5–5.0 s (mediana ~1.9 s), con ascensor 1.3–1.9 s (~1.5 s). **Pruebas:** typecheck y typecheck:tests limpios; 417/417 unitarias (20 nuevas en `ascensor.test.ts`); batería e2e completa 59/60 antes del arreglo de los materiales (falló `escaleraCaminada` por tiempo: 2.2 s contra el tope de 2 s) y, después del arreglo, 23/23 en el grupo que arma y cambia pisos (ascensor, escaleras, cambio de piso, Piso 3 completo, guardado, fin de piso, llave). **Riesgo conocido:** el tope de 2 s de `escaleraCaminada` también lo pasa a veces el código anterior con el PC cargado; 8 programas de shader que no son del ascensor (rótulos, placas, rastros, fondo de la escalera, zonas de toque) se recompilan en cada cambio de piso desde antes. Nadie lo ha jugado salvo el creador en `npm run dev`. |
| 2026-10-12 | **Las pruebas ya no atrapan el mouse del creador.** Mientras corrían los recorridos caminando, su cursor quedaba encerrado en una franja invisible y se movía solo. Causa: al empezar una partida el juego pide capturar el ratón (Pointer Lock), y desde el Chrome invisible de Playwright Windows encerraba y recentraba el cursor real durante toda la corrida (30–40 min). No era Computer Use (no está activo). Ahora, con el navegador manejado por una prueba (`navigator.webdriver`), el juego hace como si estuviera capturado sin capturar nada; para un jugador de verdad no cambia. Lo vigila `ratonLibre.spec`. |
| 2026-10-10 | **El Inquilino, más tenebroso** (en código, sin Blender). Hallazgo: con el material "estándar", aunque fuera negro puro, la linterna (que sale de los ojos) le sacaba un reflejo gris en todo el cuerpo: se veía como un maniquí de plástico claro. Ahora es mate de verdad (Lambert), con piel de manchas y venas con relieve, costillas, columna y omóplatos marcados, cuencas hundidas, una mandíbula con dientes que en el susto se desencaja, dedos de dos falanges con uñas que se crispan, y tics que a veces giran la cabeza de más; las piezas finas van fundidas (48 mallas). El susto al morir ponía la cabeza a 20 cm de la cámara, por debajo de los ojos y fuera del haz de la linterna (una mancha negra): ahora mide dónde quedó su cara y la pone a 50 cm, dentro del haz. `retratoCriatura.spec` saca una captura por pose. |
| 2026-10-10 | **Escaleras que se caminan** (C2 §1, ver 02-ARQUITECTURA). Se baja y se sube escalón por escalón; al cruzar el descanso de lado a lado se cambia de piso en un parpadeo y se sigue caminando. Ella puede seguirte por tu tramo hasta el descanso y nunca cambia de piso (el pozo no es refugio). "Escaleras con fundido" en Accesibilidad devuelve el viaje con E. Armar un piso pasó de ~1.3 s a ~0.1–0.3 s (los dibujos de rastros y letreros se pintan una vez y los de los otros pisos durante la carga). `llaveEscalera.spec` ya no falla de vez en cuando (ella podía cazar justo después del ruido del candado). |
| 2026-10-10 | **Trampa del Piso 3 arreglada.** El creador se atascó: juntó la libreta sin ver la carta del 301, el objetivo seguía en "Averigua por qué cerraron este piso" y la X decía "Primero lo que dice la orden de trabajo" (texto del Piso 4). Ahora "averiguar" se cumple con la carta o con la libreta (`averiguo:piso3`, con reparación de partidas viejas), la X dice el objetivo que falta en cualquier piso, la del 302 dice "Grabar la pared del cuarto" y la carta se ve abierta (hoja clara sobre el sobre, en los dos pisos). `finalPiso3.spec` ahora juega el final sin leer la carta. El creador aprobó el orden nuevo (ver "Qué sigue"). |
| 2026-10-10 | En el PC del creador (repo en F:): revisión de lo hecho en el portátil. **Autoría:** los 64 commits de `origin/main` son del creador y ninguno tiene coautor; el historial local, tampoco. Pero los 4 commits viejos con `Co-Authored-By: Claude` (`278fde9`, `8fb667e`, `37a5ade`, `addd799`) siguen guardados en GitHub sin rama, y estuvieron en `main` del 9 de octubre de 19:54 a 20:50 UTC: por eso "claude" sigue en Contributors. Falta pedirle a GitHub Support que los borre y refresque la lista. En este PC, la configuración de Claude Code agregaba la atribución y permitía `git add`/`git commit` sin preguntar: se apagó la atribución y se quitaron esos permisos. `android/.idea/` queda ignorada. `test:rapido`: 367/367. `sprint-4` local va 2 commits por delante de GitHub (Android y Piso 3 completo), sin atribución y sin push. |
| 2026-10-08 | El 302: libreta de Andrés, examinables y rastros (`9646829`, en otro computador). Revisión honesta del proyecto. Exportar el registro desde la pausa y protocolo para testers a distancia (`278fde9`). |
| 2026-10-09 | El creador reescribió los commits sin atribución y publicó `sprint-4` en `main` (`1fb67d6`); su `CLAUDE.md` nuevo pide commits sin atribución y no publicar sin autorización. **Android:** Capacitor 8, APK de prueba compilado, botón atrás, Compartir para el registro ([06-ANDROID](06-ANDROID.md)). **Piso 3 completo** ([P3-guion](propuestas/P3-guion.md)): golpes al llegar, apagón, grabar la pared, el pasillo y el final con "Piso 3 completado". La cinta pasó a `narrativa/Cinta.ts`. Commits locales, sin push (esperan autorización). |
| 2026-10-09 | El creador jugó el Piso 4 nuevo ("no me había cagado tanto en esta vida"). Con la reja cerrada y sin llave, el tramo dice "Revisar la reja" (antes prometía "Bajar al Piso 3"). Decidió publicar `sprint-4` en `main` él mismo y apunta a la Play Store el 31 de octubre (ver la meta arriba). |
| 2026-10-09 | Ritmo del Piso 4 ([P4-ritmo](propuestas/P4-ritmo.md)): medir atrae de verdad, primer encuentro en el pasillo, la nota del estudio lleva a la llave en el 401, clímax del 402, puntos de control nuevos, el objetivo se recuerda cada 90 s, y las partidas guardadas con la llave vieja se reparan al cargar. Corrección: la calidad "alta" del P2 fue elegida a mano; el problema real es que "baja" apaga el HRTF. |
| 2026-10-09 | Análisis de la ronda 1 (4 compañeros que ya conocían el juego, jugando juntos): [informe](pruebas/ronda-1-2026-10-08.md), datos en `docs/pruebas/ronda-1/`. Este documento y `CLAUDE.md` para retomar desde cualquier computador. |
