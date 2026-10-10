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
| Sistemas (IA, audio, director, guardado, UI, pruebas) | ~90 % | Sólidos: 360 unitarias + 52 recorridos caminando, todo verde |
| **Piso 4 como experiencia** | **~55 % (sin validar)** | La ronda 1 lo mostró en ~2 min y sin tensión ([informe](pruebas/ronda-1-2026-10-08.md)). Con [P4-ritmo](propuestas/P4-ritmo.md) ya hay encuentro temprano, medir atrae, la historia lleva a la llave y el 402 tiene clímax. Hasta que lo jueguen personas nuevas, es una hipótesis |
| Piso 3 | ~80 % (sin validar) | Completo de principio a fin ([P3-guion](propuestas/P3-guion.md)): libreta, apagón, grabar la pared del cuarto de Andrés, ella en el pasillo, final. Falta: el ascensor (solo sonido) y que lo jueguen personas |
| Android | ~30 % | Capacitor 8, APK de prueba compilado ([06-ANDROID](06-ANDROID.md)). Falta: verlo en un celular, ícono, firma, cuenta de Play Console, prueba cerrada |
| Validación con jugadores nuevos (Gate 1) | ~5 % | La ronda 1 fue con jugadores que ya conocían el juego |
| Hacia la Play Store | ~20 % | Faltan: Piso 4 con ritmo, final del juego, audio real, rendimiento móvil medido, fuente propia, Capacitor |

## Qué sigue (en orden)

El creador aprobó el orden el 2026-10-09: primero el Piso 4, y "cuando todo esté bien" el Piso 3.

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
4. ~~El guion del Piso 3~~ **hecho el 2026-10-09** con su final. Queda: el ascensor (solo el sonido) y partir
   `PintorRastros.ts` en un commit aparte.
5. **Android:** instalar el APK en un celular real y revisar la lista de [06-ANDROID](06-ANDROID.md); después el
   ícono, la firma y la cuenta de Play Console (lo que más tarda es la verificación de la cuenta).
6. **`Juego.ts` está en 699 de 700 líneas.** Lo próximo que lo toque tiene que sacar algo primero.

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
| 2026-10-10 | En el PC del creador (repo en F:): revisión de lo hecho en el portátil. **Autoría:** los 64 commits de `origin/main` son del creador y ninguno tiene coautor; el historial local, tampoco. Pero los 4 commits viejos con `Co-Authored-By: Claude` (`278fde9`, `8fb667e`, `37a5ade`, `addd799`) siguen guardados en GitHub sin rama, y estuvieron en `main` del 9 de octubre de 19:54 a 20:50 UTC: por eso "claude" sigue en Contributors. Falta pedirle a GitHub Support que los borre y refresque la lista. En este PC, la configuración de Claude Code agregaba la atribución y permitía `git add`/`git commit` sin preguntar: se apagó la atribución y se quitaron esos permisos. `android/.idea/` queda ignorada. `test:rapido`: 367/367. `sprint-4` local va 2 commits por delante de GitHub (Android y Piso 3 completo), sin atribución y sin push. |
| 2026-10-08 | El 302: libreta de Andrés, examinables y rastros (`9646829`, en otro computador). Revisión honesta del proyecto. Exportar el registro desde la pausa y protocolo para testers a distancia (`278fde9`). |
| 2026-10-09 | El creador reescribió los commits sin atribución y publicó `sprint-4` en `main` (`1fb67d6`); su `CLAUDE.md` nuevo pide commits sin atribución y no publicar sin autorización. **Android:** Capacitor 8, APK de prueba compilado, botón atrás, Compartir para el registro ([06-ANDROID](06-ANDROID.md)). **Piso 3 completo** ([P3-guion](propuestas/P3-guion.md)): golpes al llegar, apagón, grabar la pared, el pasillo y el final con "Piso 3 completado". La cinta pasó a `narrativa/Cinta.ts`. Commits locales, sin push (esperan autorización). |
| 2026-10-09 | El creador jugó el Piso 4 nuevo ("no me había cagado tanto en esta vida"). Con la reja cerrada y sin llave, el tramo dice "Revisar la reja" (antes prometía "Bajar al Piso 3"). Decidió publicar `sprint-4` en `main` él mismo y apunta a la Play Store el 31 de octubre (ver la meta arriba). |
| 2026-10-09 | Ritmo del Piso 4 ([P4-ritmo](propuestas/P4-ritmo.md)): medir atrae de verdad, primer encuentro en el pasillo, la nota del estudio lleva a la llave en el 401, clímax del 402, puntos de control nuevos, el objetivo se recuerda cada 90 s, y las partidas guardadas con la llave vieja se reparan al cargar. Corrección: la calidad "alta" del P2 fue elegida a mano; el problema real es que "baja" apaga el HRTF. |
| 2026-10-09 | Análisis de la ronda 1 (4 compañeros que ya conocían el juego, jugando juntos): [informe](pruebas/ronda-1-2026-10-08.md), datos en `docs/pruebas/ronda-1/`. Este documento y `CLAUDE.md` para retomar desde cualquier computador. |
