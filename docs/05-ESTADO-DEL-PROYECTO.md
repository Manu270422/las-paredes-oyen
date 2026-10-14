# Estado del proyecto — dónde quedamos

> **Léelo primero al empezar una sesión.** El creador trabaja desde varios computadores (algunos prestados) y la
> memoria de Claude se queda en cada máquina: lo que hay que recordar vive aquí y en el repo.
> **Actualízalo al final de cada sesión** (sección "Bitácora" y lo que haya cambiado arriba).
>
> Última actualización: 2026-10-14.

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
| Sitio público | `almendros.elmundodemanu.com`, publica **`origin/main`** (2026-10-14: `19bb33d`, el PR #3 del creador. Trae los pisos 4, 3 y 2 con las tandas 1 y 2 del Piso 2; la tanda 1 entró con el PR #2) |
| Trabajo en curso | **`sprint-5`** (local). El creador publica con un PR de GitHub que, al fusionarse, borra la rama remota: que `origin/sprint-5` no exista después de un PR es normal, y `git push -u origin sprint-5` la vuelve a crear |
| Ver qué commit está publicado | En el bundle en vivo aparece `0.1.0+<sha>` (buscar en `assets/index-*.js`) |
| Enlace de los testers | Ronda 2: la etiqueta `ronda2` (`be7e516`); ver 04-PROTOCOLO. El preview de `sprint-4` sigue en `9c3bd61` |

**Claude no fusiona con `main` ni publica:** lo hace el creador, cuando decide (CLAUDE.md).

**Comandos de git con mucha salida** (`git diff --cached --stat`, `git log`): pasarlos como `git --no-pager …`. Si no,
Git abre el paginador, se come los comandos que se pegaron después y la letra `s` ("guardar") crea un archivo con el
resto de la línea como nombre (pasó el 12 y el 13 de octubre con el mensaje del commit).

El `main` local puede estar desactualizado: comparar siempre con `origin/main`.

## Avance honesto (2026-10-09, después de la ronda 1 y del ritmo del Piso 4)

| Qué | Avance | Nota |
|---|---|---|
| Sistemas (IA, audio, director, guardado, UI, pruebas) | ~90 % | Sólidos: 489 unitarias + 69 recorridos caminando, la batería completa en verde (2026-10-14) |
| **Piso 4 como experiencia** | **~55 % (sin validar)** | La ronda 1 lo mostró en ~2 min y sin tensión ([informe](pruebas/ronda-1-2026-10-08.md)). Con [P4-ritmo](propuestas/P4-ritmo.md) ya hay encuentro temprano, medir atrae, la historia lleva a la llave y el 402 tiene clímax. Hasta que lo jueguen personas nuevas, es una hipótesis |
| Piso 3 | ~80 % (sin validar) | Completo de principio a fin ([P3-guion](propuestas/P3-guion.md)): libreta, apagón, grabar la pared del cuarto de Andrés, ella en el pasillo, final. Desde el 2026-10-12 tiene el ascensor (sube al 4 y baja al 3). Falta que lo jueguen personas |
| Piso 2 | ~85 % (sin validar) | Las 4 tandas (2026-10-14): el cuarto sordo, la cabina que se detiene con ella encima y el pulido. Solo lo jugó el creador (4:01 en la tanda 3). Faltan jugadores nuevos y revisar los textos |
| Android | ~30 % | Capacitor 8, APK de prueba compilado ([06-ANDROID](06-ANDROID.md)). Falta: verlo en un celular, ícono, firma, cuenta de Play Console, prueba cerrada |
| Validación con jugadores nuevos (Gate 1) | ~5 % | La ronda 1 fue con jugadores que ya conocían el juego |
| Hacia la Play Store | ~20 % | Faltan: Piso 4 con ritmo, final del juego, audio real, rendimiento móvil medido, fuente propia, Capacitor |

## Qué sigue (en orden)

**Orden aprobado el 2026-10-10** (ver C1): arreglar la trampa del Piso 3 (hecho) → **escaleras que se caminan**
(hecho: C2 §1, el fundido queda como opción) → **monstruo más tenebroso**, mejorando en código "El Inquilino"
(hecho; Blender queda para la Fase 11) → **ascensor** (C2 §3, hecho el 2026-10-12) → Piso 2 → Piso 1 → **salir del edificio** con
"Sobreviviste" (la idea final del creador: muy difícil, como Granny, pero posible).

El 2026-10-13 el creador eligió hacer el Piso 2 antes que lo de Android: la prueba cerrada de la Play Store (12
testers, 14 días) no alcanza a empezar a tiempo para el 31 de octubre, así que la tienda queda para después.

**Ahora (2026-10-14): el Piso 2 está terminado (sus 4 tandas) y el Piso 1 espera las decisiones del creador** en
[P1-guion](propuestas/P1-guion.md) (el portero y el citófono, y el final "Sobreviviste"). El creador eligió el 13 hacer
los pisos antes que lo de Android, sabiendo que la Play Store pasa del 31 de octubre; con el Piso 1 el juego tendría
principio y fin, y sería el momento de cerrar la 1.0 y volver a la prueba cerrada. La ronda 2 de testers juega la
etiqueta `ronda2` (`be7e516`) con `?telemetria=1`; el creador enviará los registros. Rama de trabajo: `sprint-5`.

## Textos nuevos del Piso 2 que el creador debe revisar (2026-10-13, borradores)

- **Libro de quejas (201):** las quejas del 302, 402, 301 y 403, todas contestadas "Son las tuberías. — H."; la del
  302 del 28 de octubre, tachada; y la última hoja: "Ya no lo oigo. / Tapié la escalera para que no baje. / O para que
  no suba. Ya no sé de qué lado está."
- **Lista de llaves (201):** la del ascensor tachada, con "La tengo yo. Que nadie baje. — H."
- **Cuaderno de Hernando (202):** los colchones de la plaza, "Ni mi respiración", la radio a todo volumen en el
  pasillo, "Hoy me habló desde el colchón. Con mi voz." y la llave escondida entre los colchones.
- **Cinta del cuarto sordo:** "[Nada. Ni siquiera el siseo de la cinta]", la voz de hombre desde los colchones: «Son
  las tuberías.», y "[Algo de metal cae entre los colchones, en el rincón de la sala]".
- **Final del Piso 3 (cambia):** después de los golpes, "[El candado cae. La reja de abajo se abre sola]". La reja
  cerrada dice: "La cadena está dada vuelta con candado. Abajo no se ve nada."
- **Ascensor:** "El botón del 2 no se enciende." y "El botón del 1 tiene una cerradura. Hace falta una llave de
  servicio." La llave: "Una llave pequeña con una etiqueta: «Ascensor — servicio»."
- **Objetivos:** "Averigua quién tapó todo esto: la administración es el 201", "Graba el cuarto sordo: la X está en la
  sala del 202", "En la cinta sonó algo de metal, en el rincón de la sala del 202. Búscalo", "Baja al Piso 1 en el
  ascensor: el botón del 1 pide la llave de servicio".
- **Cuarto sordo (tanda 2):** la primera vez que entras a un cuarto acolchado, "Colchones clavados en todas las
  paredes. Aquí adentro no se oye nada de afuera." y, con pistas, "En un cuarto acolchado no la oyes, y ella tampoco a
  ti. Si entra, solo la delatan la linterna y las lámparas."
- **La cabina detenida (tanda 3):** "[La cabina frena de golpe entre dos pisos]", "algo cae sobre el techo de la
  cabina", "algo se arrastra sobre el techo", "algo se detiene encima de ti y escucha", "[Se va trepando por el pozo,
  hacia arriba]", "[La trampilla del techo revienta]" y la pista "Está encima de ti. Cuando se quede quieta
  escuchando, no te muevas y aguanta el aire ({aguantar})."
- **Tanda 4:** la frase en el pasillo, "MENTIROSO", junto a la puerta de la administración; y la carta del 203, sin
  enviar ("Don Hernando: desde que usted forró el 202, lo de arriba se oye más en mi pared… Anoche dijo mi nombre. Con la
  voz suya… Las llaves se las dejo al portero, que es el único que todavía contesta. — Rosalba, 203"). Ojo: la carta
  menciona al portero, que podría ser el hilo del Piso 1 (ver [P1-guion](propuestas/P1-guion.md)); si se decide otra
  cosa, esa línea se cambia.
- **Final del Piso 2 (después de la cabina):** a negro, "[Las puertas se abren. Abajo, la portería está a
  oscuras]" y la pantalla "Piso 2 completado · Próximamente: Piso 1".

## Textos y decisiones del ascensor que el creador debe revisar (2026-10-12)

- **Muerto (Piso 4, sin la llave de la escalera):** "El botón no se enciende. El ascensor está muerto, como todo el
  edificio."
- **Subtítulos de sonido:** "[el ascensor, moviéndose por el pozo]", "[la campanilla del ascensor]" y "[el ascensor
  se puso en marcha solo]" (al tomar la llave).
- **Muerte por el ascensor:** "Oyó el ascensor." Consejo: "El ascensor se oye en todo el edificio: el motor por los
  muros y la campanilla al llegar. Úsalo cuando esté lejos."
- **Botones:** "Llamar al ascensor", "Bajar al Piso 3", "Subir al Piso 4". La placa del panel dice "4 PERSONAS ·
  300 KG".
- **Decidido el 2026-10-12:** la primera bajada es obligatoriamente por la escalera. En el Piso 4 el ascensor
  funciona desde que se abre la reja (no desde que se toma la llave), y en ese momento se pone en marcha solo.
- Los textos los revisa el creador jugando en el preview.
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
6. **`Juego.ts` está en 674 de 700 líneas** (2026-10-12: el audio y los efectos de cada fotograma salieron a su propio archivo).
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
- **El PC del creador tiene 3,7 GB de RAM.** Con VS Code abierto, la batería completa puede fallar por falta de memoria
  (Windows lo anota en el registro del sistema, evento 2004): revisar eso antes de culpar al código y repetir solo lo que
  falló. Las extensiones de Java/Kotlin de VS Code arrancan el demonio de Gradle de `android/` (1,5 GB), que muere
  sin memoria y deja archivos `hs_err_pid*.log` en la raíz (ignorados en git desde el 2026-10-13).
- Mensajes de commit en español, describiendo el cambio para quien lea el historial.
- Documentos: `01` diseño, `02` arquitectura, `03` hoja de ruta, `04` protocolo de pruebas, `propuestas/` (C1, C2,
  T4, A1–A4, B1) y `pruebas/` (resultados de cada ronda con sus datos).

## Bitácora

| Fecha | Qué se hizo |
|---|---|
| 2026-10-14 | **Piso 2, tanda 4: el pulido** (y el Piso 2 queda terminado). El creador jugó la tanda 3 publicada hasta el final: 10:33 en Normal, el Piso 2 en 4:01 con 3 cazas; contó que ella "apareció de repente en el ascensor desde arriba". Por eso: **la trampilla del techo de la cabina se ve** (marco de caucho negro, corrida del tubo de luz que la tapaba), tiembla cuando cae encima y con cada rasguño, y revienta cuando cae adentro; **el frenazo suena** (metal y cables). Además: tres rastros ("MENTIROSO" junto a la administración, la mano junto al 202 y la humedad del 302 en el techo del 202), la radio de Hernando en el pasillo (el director la puede encender) y la carta del 203 (opcional; menciona al portero, posible hilo del Piso 1). Borrador del Piso 1 para decidir: [P1-guion](propuestas/P1-guion.md). **Pruebas:** **batería completa en una corrida: typecheck:tests limpio, 489/489 unitarias y 69/69 recorridos (48 min)**, con Chrome cerrado y las extensiones de Java deshabilitadas. Antes, por partes: `cabinaDetenida.spec` (con la trampilla) y `rastrosPiso2.spec` nuevo, con las capturas revisadas; `npm run build` bien. |
| 2026-10-14 | **Piso 2, tanda 3: la cabina que se detiene** (02-ARQUITECTURA, "La cabina que se detiene"; decisiones a revisar en P2-guion). Bajando al 1, la cabina frena entre pisos, algo cae sobre el techo, se arrastra y se queda a escuchar: quieto y sin aire, se va trepando por el pozo y la cabina sigue al final; si te oye, revienta la trampilla, cae adentro con el aviso de siempre y reapareces en el 202 con la llave. Son las reglas del encuentro de todo el juego, más la justicia del aire (no escucha hasta que sueltas el aire y lo recuperas). **Antes:** el sonido del ascensor salió a `SonidoAscensor.ts` (sin cambios de sonido). **Arreglo de justicia general:** mientras ella da el aviso de caza, ya no atrapa aunque esté encima (`Entidad.avisando`); antes, una caza que empezaba a menos de 0.85 m mataba sin aviso. **Pruebas:** typecheck y typecheck:tests limpios; 488/488 unitarias (nuevas: `cabinaDetenida.test.ts` y detener/reanudar en `ascensor.test.ts`); `npm run build` bien. Recorridos: `cabinaDetenida.spec` nuevo 2/2 (adelantarse a aguantar no castiga; aguantar la supera y termina el piso; un paso con el aire aguantado la hace caer adentro, el aviso dura ≥ 0.75 s, la muerte dice "caminar" y se reaparece en el 202 con la llave), y `piso2` 2/2 (ahora aguanta el aire en la cabina), `piso4` 3/3, `escaleraCaminada` 2/2, `accesibilidad` 3/3, `ofertaBajar` 1/1 y `directorNormal` 1/1. `ascensor.spec` falló una vez por el tope de 2 s del cambio de piso (2.27 s en una tanda de 15 min); solo, 2/2. La batería completa no se corrió. |
| 2026-10-14 | **Piso 2, tanda 2: el cuarto sordo** (02-ARQUITECTURA, "El cuarto sordo"; decisiones a revisar en P2-guion). El creador jugó la tanda 1 publicada (PR #2 a `main`) hasta el final: 12:48 en Normal, el Piso 2 en 2:13 (lejos de los 12–18 min del diseño; faltan esta tanda, la 3 y la 4). Ahora el 202 entero y el archivo del 201 tienen colchones (textura propia, sin eco) y aíslan el sonido en los dos sentidos: adentro no se oyen sus rasguños ni sus pasos (ni sus subtítulos), y ella no oye ni el ruido más fuerte. Medir ahí no la atrae; nunca sale de un muro acolchado; con 25 s seguidos adentro sale afuera y entra caminando por la puerta, y solo la delatan la linterna y las lámparas. Primera vez adentro: una línea y, con pistas, la regla. **Pruebas:** typecheck y typecheck:tests limpios; 476/476 unitarias (nueva `aislamiento.test.ts`; ajustó el oído de ella a través de los colchones de ×0.03 a ×0.01, porque correr pegado a un muro en Pesadilla quedaba en el borde); `npm run build` bien. Recorridos: `cuartoSordo.spec` nuevo 3/3 (dos veces, capturas revisadas), `piso2` 2/2, `piso4` 3/3, `directorNormal` 1/1 (el director igual que en `gate1-congelado`). Una tanda falló dos veces por memoria (0.17 GB libres: captura en blanco, errores de shader con el registro vacío, "Target crashed"); con Chrome cerrado y las extensiones de Java deshabilitadas, todo pasó. La batería completa no se corrió. |
| 2026-10-13 | **Piso 2, tanda 1** ([P2-guion](propuestas/P2-guion.md), "Construcción"; motor en 02-ARQUITECTURA, "Lo que trajo el Piso 2"). El final del Piso 3 ya no termina la partida: después de los tres golpes, la reja de abajo se abre sola, el piso queda completado y se baja caminando (al bajar, la tarjeta "Piso 3 superado"); si se vuelve a subir, el final no se repite. El Piso 2: mismo esqueleto, la administración en el 201 (libro de quejas, lista de llaves), el apartamento de Hernando en el 202 (su cuaderno, la X del cuarto sordo), el 203 sin forrar; la escalera que sigue bajando, tapiada con ladrillo nuevo. Grabar el 202 trae su cinta (silencio, «Son las tuberías.», algo de metal) y al terminar aparece la llave de servicio. El panel del ascensor tiene 4, 3, 2 y 1 en los tres pisos: el 2 no se enciende hasta haber llegado ahí por la escalera, y el 1 pide la llave; como el Piso 1 no existe, la cabina baja hasta el 2 y su guion cierra la partida ("Próximamente: Piso 1"). Los textos son borradores para revisar (arriba). **Pruebas:** typecheck y typecheck:tests limpios; 471/471 unitarias (nuevas: botones con requisito y viaje al piso por hacer, `visitado:`, la tapia, la reja que se abre sola, guion del Piso 2); `npm run build` bien. Recorridos: `piso2.spec` nuevo (baja caminando del 4 al 3 y al 2, empuja contra la tapia, lee, graba, toma la llave, ascensor al 1, pantalla final) 2/2 dos veces, con las capturas revisadas; `finalPiso3.spec` 2/2; `escalera`, `piso3`, `cambioPiso`, `finDePiso`, `guardado`, `telemetriaViajes`, `llaveEscalera` pasan. `ascensor.spec` y `escaleraCaminada.spec` fallaron una vez por el tope de 2 s del cambio de piso (2.7 y 2.9 s) a mitad de una tanda de 10 min con 0.4 GB de RAM libre; medido después, seis cruces con cada versión en las mismas condiciones: `ronda2` 1.31 s de promedio, la nueva 1.28 s. Repetidos solos: 4/4. **Pendiente:** la batería completa no se corrió (1 h, y en este PC falla por memoria). `Ascensor.ts` subió de 451 a 483 líneas: antes de la tanda 3 (que lo toca), sacar el sonido a su archivo, como dice su cabecera. **Hallazgo del PC:** las extensiones de Java/Kotlin de VS Code arrancaban el demonio de Gradle de `android/`, que murió 26 veces sin memoria (archivos `hs_err_pid*.log`, ya borrados e ignorados en git). |
| 2026-10-12 | **Lista la ronda 2** (etiqueta `ronda2`). La primera bajada es obligatoriamente por la escalera: en el Piso 4 el ascensor revive al abrir la reja (con la llave sola sigue muerto). `Juego.ts` pasó de 698 a 674 líneas (el audio y los efectos de cada fotograma salieron a `MezclaFotograma.ts` y `EfectosFotograma.ts`). Pantalla final: sin mejor tiempo en los totales; en cada piso, las veces que te cazó y "nunca lo pasaste tan rápido" solo si se batió el tiempo de ese piso; partidas y perfiles viejos se actualizan solos. Telemetría: la versión, cada cambio de piso con cómo fue (`caminando`, `fundido`, `cabina`, `despertar`) y cada llamada al ascensor con la distancia a ella. 04-PROTOCOLO con H10–H13 y la versión congelada; diseño del Piso 2 en [P2-guion](propuestas/P2-guion.md), sin programar. **Pruebas:** typecheck y typecheck:tests limpios; 422/422 unitarias; batería e2e completa **58/61** (1 h). Fallaron `escalera` (el juego no cargó en 120 s), `escaleraCaminada` (errores de shader `VALIDATE_STATUS false`) y `tarjetaLugar` (la tarjeta ya se había ocultado). Coinciden con tres avisos de Windows de memoria virtual insuficiente (17:31, 17:36 y 17:47; este PC tiene 3,7 GB y VS Code ocupaba ~2,5 GB), y el código no cambió durante la corrida. Repetidas solas con el mismo código: **4/4**, sin errores de shader. **Riesgo:** `tarjetaLugar` mide la tarjeta con reloj real (2,5 s) y camina en tiempo de juego, así que se cae cuando el PC va lento; no se tocó. Con poca memoria, la batería completa puede fallar por el entorno: conviene cerrar programas antes. |
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
