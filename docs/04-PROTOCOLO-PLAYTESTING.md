# Protocolo de playtesting — Fase 10

> Objetivo: convertir "a mí me dio miedo y cerré el juego" en datos repetibles.
> No preguntamos "¿te gustó?". Queremos saber **cuándo** tuvo miedo, **qué** lo causó,
> **cuándo dejó de tenerlo** y **qué muerte sintió injusta**.

---

## 1. Hipótesis que esta ronda debe confirmar o tumbar

| # | Hipótesis | Cómo la medimos | Se cae si… |
|---|---|---|---|
| H1 | La medición (6 s quieto) es el momento de más tensión | Reacciones fuertes y marcas F9 durante `medicion`; entrevista | Menos de 3/5 la mencionan como tensa |
| H2 | El jugador aprende las reglas de la criatura sin tutorial | Causas de muerte repetidas; entrevista ("¿qué la atrae?") | La misma causa mata 3+ veces a la misma persona |
| H3 | El encuentro de presencia (se detiene a 2.5 m y escucha) es memorable | `encuentros.superados`; entrevista (¿lo cuenta espontáneamente?) | Nadie lo menciona sin preguntar |
| H4 | La imitación de pasos genera duda ("¿fui yo?") | Reacciones a `imitacion-1/2/3`; entrevista | Nadie nota el eco o lo toma como un fallo técnico |
| H5 | Ninguna muerte se siente injusta | Entrevista; muertes por `desconocido` | Alguien dice "me mató porque sí" y la telemetría no muestra la causa |
| H6 | El primer miedo llega antes de los 3 minutos | `tiempoPrimerSusto`, `tiempoPrimeraReaccionFuerte` | Mediana > 180 s |
| H7 | La tensión sube y baja (no es plana ni constante) | `curva` (estrés y tensión cada 5 s) | Curva plana, o estrés > 0.7 durante más de 3 min seguidos |
| H8 | La cinta revela algo que el jugador entiende ("estaba ahí y no lo oí") | Eventos `cinta` con `presencia: true`; entrevista (pregunta 7b) | Nadie la menciona o nadie entiende que la línea "Tú no oíste nada" era real |
| H9 | En una persecución, el jugador sabe de dónde viene la criatura | Muertes con `motivo` de caza; entrevista (pregunta 8b) | Alguien dice "no sé de dónde salió" en una muerte por caza |

**Ronda 2 (preview de `sprint-4`, desde 2026-10-12): además**, lo nuevo después del Piso 4: la llave, la escalera que
se camina, el ascensor y el Piso 3.

| # | Hipótesis | Cómo la medimos | Se cae si… |
|---|---|---|---|
| H10 | La escalera se baja y se sube caminando sin ayuda | `piso-cambiado` con `por: "caminando"`; hoja 4.4 (momento 14) | Alguien pasa más de 2 min frente al tramo abierto sin saber cómo bajar, o activa "Escaleras con fundido" porque se marea |
| H11 | La llave de la escalera se encuentra por el ruido de su caída | Tiempo entre `piso-cambiado` con `por: "despertar"` y la bandera `objeto:llave_escalera`; evento `pista` | La mayoría necesita la pista escrita o tarda más de 5 min |
| H12 | El ascensor se entiende como un atajo que hace ruido | `ascensor-llamado`, `piso-cambiado` con `por: "cabina"`, muertes con `motivo: "maquina"`; entrevista (14) | Nadie lo usa, o alguien muere por él y no sabe por qué |
| H13 | El Piso 3 se termina sin trabarse | Banderas `averiguo:piso3`, `imitacion:piso3`, `medido:302`, `final:piso3` y el tiempo entre ellas | Alguien pasa más de 10 min sin cambiar de objetivo y sin saber qué hacer |

**Ronda 3 (sitio principal desde 2026-10-14, etiqueta `ronda3`): además**, el Piso 2 completo. El enlace es el
principal con `?telemetria=1`. **No se fusiona nada a `main` mientras dure la ronda** (el Piso 1 se construye en
`sprint-5`): si no, cada uno juega una versión distinta. `entorno.compilacion` dice cuál jugó cada uno.

| # | Hipótesis | Cómo la medimos | Se cae si… |
|---|---|---|---|
| H14 | El cuarto sordo se entiende: adentro no la oyes y ella no te oye, y el peligro es que entre caminando | Bandera `sordo:visto`; tiempo en la sala del 202; muertes en el 202 con su `motivo`; entrevista (preguntas 18 y 19) | Alguien muere en el 202 y dice "no sé de dónde salió", o nadie nota que adentro no se oye nada |
| H15 | La cabina detenida se supera quieto y aguantando el aire, y morir ahí se entiende | Eventos `encuentro` (inicio, superado, fallido) en el Piso 2; muertes con su `motivo`; bandera `cabina:superada` y cuántos intentos | La mayoría muere 3 veces o más en la cabina, o alguien nunca aguanta el aire ahí |
| H16 | El Piso 2 se termina sin trabarse | Banderas `leyo:libro_quejas`, `medido:202`, `cinta:202`, `objeto:llave_servicio`, `cabina:superada` y el tiempo entre ellas | Alguien pasa más de 10 min sin cambiar de objetivo y sin saber qué hacer |

**Ronda 4 (el Piso 1, cuando esté en el enlace; preparada el 2026-10-17): además**, la planta baja y el final del
juego. El final ya se midió con un robot ([informe](pruebas/cerraduras-robot-2026-10-15.md)): esta ronda dice si
para una persona es "muy difícil pero justo".

| # | Hipótesis | Cómo la medimos | Se cae si… |
|---|---|---|---|
| H17 | El citófono se entiende como un señuelo: timbrar lejos la aleja de la puerta | Eventos `citofono` (`timbre`, con el estado del peligro); pista `citofono`; qué pasa en la puerta después de cada timbre; entrevista (22) | Nadie lo usa, o lo usan y ella sigue junto a la puerta cuando abren |
| H18 | La puerta es muy difícil pero justa: se sale alejándola antes de cada cerradura, y morir ahí se entiende | Eventos `cerradura` (`empieza`, `suelta`, `cede`); muertes con `motivo: "cerradura"`; intentos y tiempo desde las llaves hasta salir; entrevista (24) | Alguien abandona frustrado o muere 5 veces o más sin entender por qué; o sale sin usar el citófono en menos de un minuto (sería fácil) |
| H19 | Su llamada por el citófono asusta, y contestar se entiende como un riesgo | Eventos `citofono` (`llamada`, `contestada`, `ignorada`, `colgada`) y los `encuentro` de esa llamada; entrevista (23) | Nadie nota la llamada, o alguien muere después de contestar sin entender por qué |
| H20 | El final ("Sobreviviste", la ventana del 401 y los créditos) se siente como el final del juego | Bandera `puerta:abierta` y la pantalla final; entrevista (25) | La mayoría no entiende que terminó, o lo siente abrupto |

---

## 2. Preparación

**Equipo**
- Audífonos cerrados, **obligatorios**. El juego es audio 3D: sin audífonos la prueba no sirve.
- Habitación oscura o con poca luz. Brillo calibrado en Ajustes → Video (cuadro izquierdo casi invisible).
- Si es posible: grabar pantalla + audio del juego + la cara del probador (solo con su permiso).

**Enlace de prueba**
- El enlace de los probadores es **`https://almendros.elmundodemanu.com/?telemetria=1`**: el mismo juego, con la
  telemetría local encendida en ese dispositivo (queda encendida aunque después entren sin el `?telemetria=1`).
  En una red local sirve igual: `http://192.168.1.10:5173/?telemetria=1`.
- Alternativa: Ajustes → **Pruebas** → "Registrar sesiones de prueba".
- Empezar con **Nueva partida** (no "Continuar").
- **Ronda 2:** el enlace es el preview de `sprint-4` en Vercel con `?telemetria=1`
  (`https://las-paredes-oyen-git-sprint-4-el-mundo-de-manu.vercel.app/?telemetria=1`): trae la escalera que se
  camina, el ascensor y el Piso 3, que todavía no están en `main`. **Antes de mandarlo, ábrelo en una ventana de
  incógnito** (sin tu sesión de Vercel): si pide iniciar sesión, los probadores no van a poder entrar; hay que
  quitar la protección de los previews en Vercel o publicar en `main`. Es otro dominio: las partidas y registros de
  ahí no se mezclan con los del enlace principal. La versión exacta queda en cada registro (`entorno.compilacion`,
  "0.1.0+" y el commit) y en el pie del menú.
- **Ronda 2, versión congelada:** el enlace de arriba sigue a la rama, así que cada push a `sprint-4` cambia lo que
  juegan los probadores. La versión de la ronda es la de la etiqueta `ronda2`. Para que todos jueguen esa, manda la
  URL propia de su despliegue (Vercel → Deployments → el del commit de `ronda2` → su dominio, también probado en
  incógnito) o no hagas push a `sprint-4` mientras dure la ronda. Si se mezclaron versiones, `entorno.compilacion`
  dice cuál jugó cada uno.

**Prueba a distancia (el probador juega solo, cuando pueda)**
Sin observador no hay F9 ni hoja de observación: se pierde la parte más fina, pero el JSON y una nota de voz
siguen valiendo. Mensaje para mandarle:

> 1. Abre `https://almendros.elmundodemanu.com/?telemetria=1` (en PC con Chrome o Edge; en celular, acostado).
> 2. Audífonos puestos, luz apagada, unos 30 minutos sin interrupciones (en la ronda 2, hasta una hora: son dos
>    pisos). Nueva partida, dificultad **Normal**.
> 3. Juega sin buscar ayuda. Si te cansas o te frustras, para: eso también me sirve.
> 4. Cuando pares, o al llegar a la pantalla final: **Pausa (Esc o el botón de pausa) → "Exportar registro de la
>    prueba"** (o Ajustes → pestaña Pruebas → Exportar (.json)). En la pantalla final, el botón "Exportar registro
>    de la prueba" hace lo mismo. Se descarga un archivo `.json`; mándamelo por WhatsApp o correo.

Ajustes → Pruebas → Exportar existe en todas las versiones publicadas; el atajo "Exportar registro de la prueba" en
la pausa llega con la versión que lo trae (`sprint-4` desde 2026-10-08).
> 5. Mándame una nota de voz de 2–3 minutos: qué pasó, cuándo te dio miedo, si alguna muerte te pareció injusta,
>    qué no entendiste y si quisiste dejar de jugar (en qué momento).

La nota de voz reemplaza la entrevista: con las preguntas 1, 2, 6, 8 y 11 de la sección 5 basta. Las hipótesis que
dependen del observador (reacciones, F9) quedan sin dato para ese probador: marcar "—" en el resumen de la ronda.

**Participantes (mínimo 5)**
- Mezcla recomendada: 2 que jueguen terror seguido, 2 que casi no jueguen, 1 que juegue en celular.
- Al menos 1 persona en móvil (táctil) y 1 con mando si lo tienes.

---

## 3. Qué decir (y qué NO decir)

**Antes de empezar** (leer tal cual):
> "Es un juego de terror en primera persona que se juega con los oídos. No te voy a explicar cómo funciona:
> quiero ver qué descubres solo. Puedes parar cuando quieras, sin dar explicaciones.
> No hay respuestas buenas ni malas: si algo no se entiende, el problema es del juego, no tuyo."

**Durante la partida**
- No hablar. No dar pistas. No reírse ni reaccionar a los sustos.
- **No** pedir que piense en voz alta: hablar le quita el miedo y cambia cómo juega.
- Si pregunta algo: "¿Qué crees tú?" y anotar la pregunta (es un dato).
- Si quiere parar: se para. Anotar el momento exacto (es el dato más valioso de todos).

**Marcas del observador (F9)**
Quien observa pulsa **F9** en el teclado del equipo de juego cuando el probador:
- salta, grita, se echa hacia atrás o se tapa la cara;
- se queda inmóvil más de 5 s sin razón aparente;
- dice algo en voz alta ("¿qué fue eso?").

Cada F9 queda anotado con el segundo exacto de juego y se cruza luego con los eventos.
En móvil no hay F9: anotar la hora a mano en la hoja.

---

## 4. Hoja de observación (una por probador, impresa o en el celular del observador)

> Regla de oro: anotar **lo que hizo**, no lo que creemos que sintió. "Se echó para atrás y dejó de caminar 8 s"
> sirve; "le dio miedo" no sirve.

### 4.1 Datos de la sesión (antes de empezar)

| Campo | Valor |
|---|---|
| Código del probador | P__ (sin nombre real) |
| Fecha y hora de inicio | |
| Dispositivo | PC / portátil / celular / tableta — modelo: |
| Entrada | teclado y ratón / mando / táctil |
| Audífonos | cerrados / abiertos / de botón — ¿bien puestos? sí / no |
| Luz de la habitación | oscura / penumbra / con luz |
| ¿Juega terror seguido? | nunca / a veces / seguido |
| ¿Ya conocía el juego? | no / vio videos / ya lo jugó |
| Enlace usado | ¿termina en `?telemetria=1`? sí / no — ¿principal o preview de `sprint-4`? |
| Versión del juego | la del pie del menú (ej. `0.1.0+9c3bd61`) |
| ¿Grabación con permiso? | pantalla / cara / voz / ninguna |

### 4.2 Escala de reacción (para no discutir después)

| Nivel | Qué se ve |
|---|---|
| **0** | Nada: sigue igual |
| **1** | Atención: se detiene, gira la cámara, se acerca a la pantalla |
| **2** | Sobresalto leve: respira fuerte, se echa atrás, dice algo ("¿qué fue eso?") |
| **3** | Susto fuerte: salta, grita, se tapa la cara, suelta el mouse o el celular |

Nivel 2 o 3 = pulsar **F9** (en PC). En celular, anotar la hora del reloj en la columna "Hora".

### 4.3 Línea de tiempo (llenar durante la partida)

| Hora | Min. de juego | Qué pasaba en el juego | Reacción (0–3) | ¿F9? | Lo que dijo (textual) |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

### 4.4 Momentos clave (marcar si ocurrió y cómo reaccionó)

| # | Momento | Hipótesis | ¿Ocurrió? | Min. | Reacción (0–3) | Qué hizo |
|---|---|---|---|---|---|---|
| 1 | Leyó la orden de trabajo en la escalera | — | sí / no | | | |
| 2 | Primera medición (401): los tres golpes mientras no se puede mover | H1 | sí / no | | | ¿se movió? ¿contuvo el aire? |
| 3 | Escuchó la cinta del 401 | H8 | sí / no | | | ¿leyó los subtítulos o los saltó? |
| 4 | La criatura se detuvo cerca a escuchar (encuentro) | H3 | sí / no | | | ¿contuvo el aire? ¿se movió? |
| 5 | Eco de sus pasos / un paso de más (imitación) | H4 | sí / no | | | ¿se giró? ¿paró? |
| 6 | Persecución (jadeo de la criatura detrás) | H9 | sí / no | | | ¿huyó hacia dónde? ¿cerró puertas? |
| 7 | Murió | H2, H5 | sí / no · cuántas veces: | | | causa en pantalla: |
| 8 | Medición del 403 | H1 | sí / no | | | |
| 9 | Apagón del pasillo (las lámparas revientan hacia él) | H7 | sí / no | | | |
| 10 | Llegó al 402 / al final | — | sí / no | | | |
| **Ronda 2** | | | | | | |
| 11 | Despertó en la escalera después del 402 | — | sí / no | | | ¿entendió que el piso había terminado? |
| 12 | Oyó caer la llave y la buscó | H11 | sí / no | | | ¿fue al 402 solo? ¿le salió la pista escrita? |
| 13 | Abrió el candado de la reja | H11 | sí / no | | | |
| 14 | Bajó caminando por la escalera | H10 | sí / no | | | ¿dudó frente al tramo? ¿se atascó en el descanso? ¿notó el parpadeo al cambiar de piso? |
| 15 | Pulsó el botón del ascensor con la reja cerrada ("está muerto") | H12 | sí / no | | | |
| 16 | El ascensor se puso en marcha solo (al abrir la reja) | H12 | sí / no | | | ¿fue a verlo? ¿se alejó? |
| 17 | Usó el ascensor | H12 | sí / no · cuántas veces: | | | ¿para qué? (atajo / huir / curiosidad) ¿reaccionó a la vibración o a la campanilla? |
| 18 | Piso 3: tres golpes al llegar | H13 | sí / no | | | |
| 19 | Juntó la libreta (revienta la luz de la escalera) | H13 | sí / no | | | ¿leyó la carta del 301? |
| 20 | Grabó la pared del cuarto de Andrés y oyó su cinta | H8, H13 | sí / no | | | |
| 21 | Ella lo esperaba en el pasillo: cómo pasó | H13 | sí / no | | | ¿grabadora? ¿la iluminó quieto? ¿murió? |
| 22 | El final del Piso 3 (golpes desde abajo) | — | sí / no | | | |
| **Ronda 3** | | | | | | |
| 23 | La reja de abajo se abrió sola y bajó al Piso 2 | H16 | sí / no | | | ¿entendió que podía bajar? ¿vio la tarjeta "Piso 3 superado"? |
| 24 | Vio la escalera tapiada y leyó el libro de quejas | H16 | sí / no | | | ¿leyó la lista de llaves? ¿el cuaderno de Hernando? |
| 25 | Entró al cuarto acolchado (202) | H14 | sí / no | | | ¿notó el silencio? ¿leyó la pista? |
| 26 | Ella entró caminando al 202 | H14 | sí / no | | | ¿la vio venir por la luz que parpadeaba? ¿se quedó quieto? ¿murió? |
| 27 | Grabó el cuarto sordo, oyó la cinta y encontró la llave en el rincón | H16 | sí / no | | | ¿fue al rincón por lo que sonó en la cinta? |
| 28 | La cabina se detuvo con ella encima | H15 | sí / no · intentos: | | | ¿aguantó el aire cuando se quedó quieta? ¿miró la trampilla? ¿murió? ¿entendió por qué? |
| 29 | Terminó el Piso 2 y vio la pantalla final | — | sí / no | | | |
| **Ronda 4** | | | | | | |
| 30 | Llegó al Piso 1 y el ascensor se quedó sin corriente | — | sí / no | | | ¿intentó subir? |
| 31 | Leyó el libro de minuta (con el "truco de portero") | H17 | sí / no | | | |
| 32 | Usó el citófono para alejarla | H17 | sí / no · veces: | | | ¿qué timbre? ¿esperó a oírla lejos antes de ir a la puerta? |
| 33 | El citófono sonó solo (su llamada) | H19 | sí / no | | | ¿contestó? ¿aguantó el aire? ¿murió? |
| 34 | Tomó las llaves en el cuarto de don Aurelio | — | sí / no | | | ¿vio el charco? ¿leyó la nota? |
| 35 | Abrió las cerraduras | H18 | sí / no · muertes en la puerta: | | | ¿una por vez o seguidas? ¿soltó alguna? ¿la oyó venir? |
| 36 | Salió: "Sobreviviste" | H20 | sí / no | | | ¿qué dijo al verlo? |

### 4.5 Conducta observada (sí / no / no aplica)

| Pregunta | Respuesta | Minuto / nota |
|---|---|---|
| ¿Entendió solo que tenía que quedarse quieto para medir? | | ¿en qué intento? |
| ¿Contuvo la respiración alguna vez **sin** que el juego se lo pidiera? | | |
| ¿Se quedó sin aire (jadeo) por aguantar demasiado? | | ¿siguió apretando la tecla después? |
| ¿Caminaba pegado a las paredes? ¿Cambió eso en algún momento? | | |
| ¿Usó la grabadora como señuelo? ¿Volvió por ella? | | |
| ¿Usó "escuchar con atención"? | | |
| ¿Corrió? ¿Cuándo? | | |
| ¿Se atrincheró en un cuarto mucho tiempo? ¿Cuál? | | |
| ¿Qué zona evitó? ¿Volvió a algún cuarto sin necesidad? | | |
| ¿Se confundió de apartamento o no supo en cuál estaba? (p. ej., buscó la llave del 402 dentro del 402) | | cuál creía y cuál era; minuto |
| ¿Apagó la linterna a propósito? | | |
| ¿Pidió ayuda o preguntó algo? (anotar la pregunta textual) | | |
| ¿Quiso abandonar? ¿Abandonó? | | minuto exacto y qué acababa de pasar |
| **Ronda 2:** ¿Bajó y subió por la escalera sin ayuda? ¿Se atascó en algún escalón o en el descanso? | | |
| ¿Activó "Escaleras con fundido" (Accesibilidad)? ¿Por qué? | | |
| ¿Usó el ascensor para huir de ella? ¿Le funcionó? | | |
| ¿Se quedó dentro del ascensor con las puertas abiertas, como escondite? | | ¿qué pasó? |
| ¿Supo siempre en qué piso estaba? | | |

### 4.6 Solo en celular o tableta

| Pregunta | Respuesta |
|---|---|
| ¿Encontró los botones (contener aire, escuchar, linterna) sin ayuda? | |
| ¿Algún botón le tapó algo importante o lo pulsó sin querer? | |
| ¿Giró el teléfono a vertical? ¿Entendió el aviso? | |
| ¿El celular se calentó o el juego se puso lento? ¿En qué momento? | |
| FPS que mostró el juego (Ajustes → Video → mostrar FPS), si se activó | |
| Ronda 2: al cambiar de piso (escalera o ascensor), ¿la imagen se congeló? ¿Cuánto, más o menos? | |

### 4.7 Cierre de la sesión (el observador, justo al terminar)

| Campo | Valor |
|---|---|
| Duración total (reloj) | |
| ¿Terminó el juego? | sí / no — si no, ¿dónde paró y por qué? |
| Archivo exportado | `P__-dispositivo-AAAA-MM-DD.json` |
| Momento de más miedo según lo observado | |
| Muerte que pareció injusta (según lo observado) | |
| Algo que pareció un error técnico | |

### 4.8 Resumen de la ronda (llenar al final, con los 5 o más)

Marcar ✓ si la hipótesis se sostuvo con esa persona, ✗ si se cayó, — si no aplica. Una hipótesis se **cae** si
cumple la condición de la columna "Se cae si…" de la sección 1.

| Hipótesis | P1 | P2 | P3 | P4 | P5 | ¿Se sostiene? |
|---|---|---|---|---|---|---|
| H1 Medición = máxima tensión | | | | | | |
| H2 Aprende las reglas sin tutorial | | | | | | |
| H3 El encuentro es memorable | | | | | | |
| H4 La imitación genera duda | | | | | | |
| H5 Ninguna muerte injusta | | | | | | |
| H6 Primer miedo antes de 3 min | | | | | | |
| H7 La tensión sube y baja | | | | | | |
| H8 La cinta revela algo que entiende | | | | | | |
| H9 Sabe de dónde viene en la persecución | | | | | | |
| H10 La escalera se camina sin ayuda (ronda 2) | | | | | | |
| H11 La llave se encuentra por su ruido (ronda 2) | | | | | | |
| H12 El ascensor se entiende como atajo ruidoso (ronda 2) | | | | | | |
| H13 El Piso 3 se termina sin trabarse (ronda 2) | | | | | | |

**Gate 1 cumplido** cuando: 5 o más personas, al menos 1 en celular, cada una con su JSON y su hoja.
Se entregan juntos: los `.json`, estas hojas y las notas de la entrevista.

---

## 5. Entrevista posterior (10–15 min, grabada si acepta)

Hacerla **justo al terminar**, con las luces aún bajas. Preguntas abiertas, en este orden:

1. Cuéntame qué pasó, como se lo contarías a un amigo. *(No interrumpir. Anotar qué cuenta primero: es lo memorable.)*
2. ¿Cuál fue el primer momento en que sentiste miedo de verdad?
3. ¿Hubo un momento en que dejaste de tener miedo? ¿Por qué?
4. ¿Hubo algún susto que viste venir? ¿Cómo lo supiste?
5. ¿Qué sonido te hizo reaccionar más?
6. ¿Qué crees que atrae a la criatura? ¿Qué la aleja? *(Mide si aprendió las reglas.)*
7. ¿Alguna vez escuchaste pasos que no eran tuyos? ¿Cuándo empezaste a dudar?
   - 7b. Cuando escuchaste la grabación de una medición, ¿qué había en ella? ¿Crees que eso pasó de verdad? *(H8)*
8. Si moriste: ¿sabes por qué? ¿Te pareció justo? *(Comparar con la causa en la telemetría.)*
   - 8b. Si te persiguió: ¿sabías por dónde venía? ¿Cómo lo sabías? *(H9)*
9. ¿Hubo algo que no entendiste? ¿Algo que pasó y no sabes si fue real o un error?
   - 9b. ¿Supiste siempre en qué apartamento estabas? ¿Te equivocaste de puerta alguna vez? *(Orientación: la versión del Gate 1 no tiene placas con números; sirve para comparar cuando las tenga.)*
10. ¿Qué lugar te pareció seguro? ¿Cuál evitaste?
11. ¿En algún momento quisiste dejar de jugar?
12. De todo lo que hiciste en el juego, ¿qué recuerdas más?

**Ronda 2, además** (después de la 12, sin apurar):

13. ¿Cómo bajaste al Piso 3? ¿Fue fácil? ¿Te mareaste o te trabaste en la escalera? *(H10)*
14. ¿Usaste el ascensor? ¿Por qué sí o por qué no? ¿Qué pasaba cuando lo llamabas? *(H12)*
15. ¿Cómo encontraste la llave de la reja? *(H11)*
16. En el Piso 3, ¿hubo un momento en que no supiste qué hacer? ¿Qué te sacó de ahí? *(H13)*
17. En la pantalla final, ¿qué entendiste de los tiempos de cada piso? *(El mejor tiempo ahora es de cada piso y
    solo aparece cuando se bate: comprobar que no confunda.)*

**Ronda 3 (el Piso 2):**

18. En el apartamento de los colchones, ¿qué notaste? ¿Te sentías más seguro o menos? ¿Por qué? *(H14)*
19. Si ella entró a ese apartamento: ¿cómo te diste cuenta? *(H14: la luz que parpadea es la única pista.)*
20. En el ascensor detenido, ¿qué pensaste que tenías que hacer? Si moriste ahí, ¿entendiste por qué? *(H15)*
21. ¿Hubo un momento en el Piso 2 en que no supiste qué hacer? ¿Qué te sacó de ahí? *(H16)*

**Ronda 4 (el Piso 1):**

22. ¿Para qué te sirvió el citófono? ¿Cómo lo descubriste? *(H17)*
23. Cuando el citófono sonó solo, ¿qué pensaste? ¿Contestaste? ¿Por qué? *(H19)*
24. En la puerta principal, ¿qué entendiste que tenías que hacer? Si moriste ahí, ¿entendiste por qué? ¿Se sintió
    difícil y justo, o injusto? *(H18)*
25. Al salir, ¿qué sentiste? ¿Qué crees que era la luz en la ventana del 401? *(H20)*

---

## 6. Exportar y nombrar los datos

1. Al parar, en cualquier momento: **Pausa → "Exportar registro de la prueba"** (exporta todas las sesiones de
   ese dispositivo, la de ahora incluida, con su resumen). Solo aparece con la telemetría encendida.
   También: Ajustes → Pruebas → **Exportar (.json)**, o el botón de la pantalla final cuando la haya.
   Si cerró la pestaña sin exportar no se pierde nada: vuelve a abrir el enlace y exporta desde Ajustes → Pruebas.
2. Renombrar el archivo: `P1-pc-2026-10-02.json`, `P2-movil-…` (P = probador, sin nombres reales).
3. Guardar junto con la hoja de observación y las notas de la entrevista.
4. Después de exportar, **Borrar** los registros del dispositivo si no es el tuyo.

**Qué se guarda:** tiempos de juego, eventos (mediciones, muertes y su causa, eventos del director,
reacciones), una muestra cada 5 s (estrés, tensión, cuarto, distancia a la criatura, FPS),
contadores de estilo (segundos agachado, corriendo, conteniendo el aire…) y el tipo de equipo
(táctil/PC, calidad, proporción de pantalla). **Nada personal y nada sale del dispositivo** si no se exporta.

---

## 7. Cómo leer la telemetría

Cada sesión trae un bloque `resumen`. Lo primero que hay que mirar:

| Métrica | Qué buscar | Alarma |
|---|---|---|
| `tiempoPrimerSusto` / `tiempoPrimeraReaccionFuerte` | Mediana entre 60 y 180 s | > 180 s: el inicio es lento |
| `causasMuerte` | Variedad de causas | Muchas `presencia`: la regla no se entiende. `desconocido`: bug |
| `encuentros` (iniciados / superados / fallidos) | Algunos superados | 0 superados en todos: la ventana es demasiado dura |
| `motivosCancelacion` | Sobre todo `movimiento` al principio | Mucha `respiracion` tras varios intentos: la pista no se entiende |
| `eventosNoVistos` vs `eventosVistos` | Los cambios de puertas/muebles se ven a veces | > 70 % no vistos: esos eventos no están trabajando |
| `reaccionesFuertes / reaccionesTotales` por estímulo | Qué eventos sí asustan | Evento que nunca produce reacción: candidato a cambiar |
| `regresos` | Algún regreso | Muchos regresos al mismo cuarto: posible zona "segura" a cuestionar |
| `curva` (estrés en el tiempo) | Olas: sube, baja, sube más | Plana (aburrimiento) o siempre alta (fatiga) |
| `contadores` (`segundos-corriendo`, `ruido:paso-pared`…) | Estilo de juego | Mucho `paso-pared` sin muertes: la regla central no pesa lo suficiente |
| `fpsMedio` | ≥ 45 en PC, ≥ 30 en móvil | Por debajo: revisar perfil de calidad de ese equipo |

**Ronda 2: eventos nuevos** (en la lista `eventos` de cada sesión; comprobado exportando un registro real en
`telemetriaViajes.spec.ts`):

| Evento | Qué trae | Para qué |
|---|---|---|
| `entorno.compilacion` (no es evento: va en la sesión) | La versión: `0.1.0+<commit>` (o `+local` en desarrollo) | Saber qué versión jugó cada probador |
| `piso-cambiado` | `desde`, `hacia` y `por`: `caminando` (escalera caminada), `fundido` (escalera con E, la opción de accesibilidad), `cabina` (ascensor) o `despertar` (tras el final del 402) | H10, H11, H12 |
| `ascensor-llamado` | `piso`, `respuesta` (`muerto`, `viene`, `abre`, `nada`) y el estado del peligro: cuarto, batería, estado de ella y distancia si tenía cuerpo | H12: ¿lo llamó con ella cerca? |
| `muerte` con `motivo: "maquina"` | Lo atrapó por el ruido del ascensor (motor o campanilla) | H12, H5 |
| `piso-completado` | `piso`, `tiempo` (solo el de ese piso) y `muertes` | Tiempo por piso |

**Ronda 4: eventos nuevos** (el Piso 1):

| Evento | Qué trae | Para qué |
|---|---|---|
| `citofono` | `accion` (`timbre`, `ocupado`, `llamada`, `contestada`, `ignorada`, `colgada`), `timbre` (cuál) y el estado del peligro | H17, H19 |
| `cerradura` | `accion` (`empieza`, `suelta`, `cede`), `numero` (1 cadena, 2 cerrojo, 3 llave) y el estado del peligro | H18: ¿abrió con ella cerca? ¿soltó al oírla venir? |
| `muerte` con `motivo: "cerradura"` o `"citofono"` | La delató una cerradura, o el botón del citófono | H18, H17 |
| `rastro-visto` | Los tres del Piso 1: `conteo_citofono`, `frase_puerta`, `charco_101` | Si se miran |

Cruzar siempre con las marcas F9 (`marca-observador`): una marca sin evento del juego cerca
significa que el miedo vino de algo que el sistema no registra (¿la imaginación? ¡bien!).

---

## 8. Qué ajustar según lo que salga

| Si pasa esto… | Ajustar primero | Dónde |
|---|---|---|
| El primer susto tarda mucho | Duración de la fase de calma | `director/DirectorTerror.ts` → `DURACION.calma` |
| Muere mucho por respirar | Duración del encuentro / gracia de inhalación | `ia/estados/EstadoInvestigando.ts` |
| Nadie nota la imitación | Volumen/retraso del eco, etapa inicial | `ia/Imitador.ts` |
| La criatura "no está nunca" | Umbrales de audición | `config/ConfiguracionJuego.ts` → `entidad` |
| Se siente perseguido todo el tiempo | Fase pico y velocidad de caza | `DirectorTerror.ts`, `ConfiguracionJuego.ts` |
| Mediciones imposibles | Tolerancia de ruido | `jugador/Grabadora.ts` → `TOLERANCIA_RUIDO` |

**Regla:** cambiar **una cosa a la vez** entre rondas y anotar qué se cambió. Si no, no sabremos qué funcionó.

---

## 9. Cuidado con las personas

- Advertir antes: contenido de terror, sonidos fuertes repentinos, destellos (se pueden reducir en Accesibilidad).
- La persona puede parar en cualquier momento. Parar es un dato, no un fracaso.
- Pedir permiso explícito para grabar la cara o la voz. Sin permiso, solo notas.
- No probar con menores de edad.
