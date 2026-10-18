# Medición del final con un robot — 2026-10-15 (automatizada, no son personas)

> **Esto no es una prueba con jugadores.** Lo jugó un robot (`pruebas/recorridos/robotFinal.ts`) en el juego real,
> caminando, con ella y el director activos. Sirve para saber qué pasa con cada **estrategia** y para afinar los
> números del final (P1-guion, tanda 3). Qué tan difícil se siente, y si se entiende, solo lo dirán personas.
> Datos crudos: [`cerraduras-robot/`](cerraduras-robot/) (una línea JSON por intento).

## Cómo se midió

- `pruebas/recorridos/medirCerraduras.spec.ts`, a pedido (no está en la batería):
  `MEDIR_CERRADURAS=1 npx playwright test --config pruebas/playwright.config.ts medirCerraduras`.
- Una partida llega hasta las llaves (su punto de control es el de frente a la puerta). Cada intento retoma **ese**
  guardado con "Continuar", con la dificultad del intento, `Math.random` sembrado y sin las muertes anteriores (si no,
  el alivio del director facilitaría cada intento siguiente).
- El robot solo sabe de ella lo que oiría una persona atenta: dónde está si está a menos de 14 m, y cuándo se detiene a
  escuchar. No corre cuando lo cazan ni usa la grabadora: sus resultados son una **cota**, no una probabilidad.
- Las estrategias:
  - **seguidas** (descuidado): a la puerta y las tres cerraduras una tras otra; solo se queda quieto, sin aire, cuando
    ella escucha;
  - **paciente** (sin citófono): en la puerta, abre una solo si no la oye a menos de 10 m; si no, espera;
  - **citófono** (una por vez): timbra lejos, va a la puerta, abre una si no la oye cerca, vuelve y repite;
  - **ráfaga**: timbra una vez y abre las tres seguidas.
  - Los cuidadosos (todos menos "seguidas") se agachan si la oyen a menos de 10 m, se quedan quietos si la oyen con
    cuerpo a menos de 6 m y, si la oyen venir mientras giran una cerradura, se apartan.
- **Límite importante:** con la misma posición de partida, las semillas cambian muy poco; los intentos de una misma
  estrategia salen casi iguales (por ejemplo, 37.2–37.4 s). Por eso la última medición (abajo) también varía dónde
  empieza ella.

## Antes (el código de la tanda 1 y 2)

| Estrategia | Normal | Pesadilla |
|---|---|---|
| seguidas | **sale 3/3**, en 6 s, sin encuentros | **sale 3/3**, en 6 s; ella nunca llega a 6 m de la puerta |
| paciente | sale 2/2 (43 s y 138 s) | — |
| citófono | **0/4** (1 muerte por pasos, 3 sin tiempo; una sola cerradura abierta en total)¹ | — |
| ráfaga | sale 2/2, en 25 s | — |

¹ Dos de esos cuatro los jugó la primera versión del robot, que no se agachaba ni elegía el timbre según dónde la
oía (en `antes.jsonl` son las filas sin `soltadas`); los otros dos, la versión de la tabla de abajo.

El final estaba al revés: correr ganaba en 6 s y jugar con cuidado perdía. Las causas, en el código:
1. Las cerraduras sonaban como una puerta cualquiera (origen `puerta`), y la IA **nunca** caza por ese origen. Peor:
   durante un encuentro, una cerradura contaba como "un ruido ajeno que la distrae": el encuentro terminaba como
   superado.
2. Recién cargado el punto de control, el director está en calma y **no la deja salir del muro** por más de un minuto.
3. Las tres juntas duraban 4.4 s; ella necesita ~10 s para llegar desde lejos.
4. El timbre del citófono atraía solo un instante: ella va siempre al **último** ruido, y los pasos del jugador
   cruzando el vestíbulo (le llegan por los muros a ~16 m) le "robaban" el timbre.

## Los cambios (tanda 3)

- **Las cerraduras son ruido mío** (causa `cerradura`): bajito al empezar (0.2), fuerte al ceder (0.35–0.5). Si ella
  escucha, me delatan; la muerte dice "Oyó la cerradura.".
- **Abrir una es un momento**: cadena 3 s, cerrojo 2.5 s, llave 3.5 s. Si me alejo a medias, la suelto y no suena su
  final.
- **"La puerta la llama"**: si ella oye una cerradura, viene rápido por el muro (llega en 3 s), se la oye venir, y sale
  junto a la puerta (a 3.5 m de mí) aunque el director no quiera. Una vez por cerradura.
- **"El timbre la ocupa"**: después de un timbre, durante 10 s, lo que le llega más débil que el timbre (o que 0.15)
  no la saca de ahí. Solo el timbre del citófono; la grabadora y la radio quedan como estaban.
- **Si la última cerradura cede con ella cazándome** (su ruido me delató), la puerta abierta ya no me salva en ese
  instante: salgo si sobrevivo a la caza y vuelvo a la puerta.
- **La caza da el último paso**: en la celda del jugador iba al centro y, con el jugador quieto en una esquina, quedaba
  hasta a 0.92 m sin alcanzarlo (atrapa a 0.85). Con la salida esperando, eso podía dejar la partida trabada.
- Los botones del citófono, a 10 cm (eran 7.5): con el temblor del miedo, el robot enfocaba el botón de al lado.

## Después (v2, misma posición de partida, todavía sin "el último paso" de la caza)

| Estrategia | Normal | Pesadilla |
|---|---|---|
| seguidas | **0/4**: muere 4 veces, "Oyó la cerradura" (a los 12.6 s) | **0/3**: muere a los 9 s (con el oído de Pesadilla la cerradura la lanza a cazar sin encuentro previo) |
| ráfaga | **0/4**: muere 4 veces por la cerradura (37 s; soltó 2 cerraduras por intento al oírla venir) | — |
| citófono | **sale 4/4**, mediana 94 s, 3 timbres, sin encuentros | **sale 3/3**, 94 s, sin encuentros |
| paciente | sale 3/3, mediana 160 s (11–13 esperas) | — |

En los dos casos, ella llega a la puerta a los ~4–7 s del primer ruido de cerradura.

## Después (v3: todo, y ella empieza en 6 lugares distintos)

Con `MEDIR_VARIAR=1`, cada intento la pone (dentro de los muros, sin memoria) en su guarida, el fondo del vestíbulo,
el pasillo del ascensor, los contadores, el cuarto del 101 o la portería. Datos: `despues-v3-arranques.jsonl`.

| Estrategia | Normal | Pesadilla |
|---|---|---|
| seguidas | **0/6**: muere en los 6 arranques ("Oyó la cerradura", 9–12.6 s) | **0/3** (8.6–9 s) |
| ráfaga | **0/6**: muere en los 6 (37–48 s) | — |
| citófono | **sale 5/6** (mediana 100 s); el 6.º, empezando ella en el 101 (junto a la portería), llevaba 2 cerraduras y 2 encuentros superados cuando se acabaron los 200 s | **sale 6/6** (mediana 104 s, sin encuentros) |
| paciente | sale 2/3 (169 s y 185 s); empezando ella al fondo del vestíbulo, se acabaron los 200 s | — |

Ninguna estrategia murió por otra cosa que la cerradura, y ninguna "salida" ocurrió con una caza en curso.

## Lo que esto dice (y lo que no)

- La regla del diseño se cumple con el robot: abrir las tres seguidas, o alejarla una sola vez y abrir las tres, la
  trae y te delata; alejarla antes de cada cerradura funciona.
- Sin citófono también se puede, pero esperando: unos 2.5–3 minutos frente a la puerta, con ella yendo y viniendo.
- Para el robot, el citófono es **limpio** (cero encuentros), también en Pesadilla. El robot sabe exactamente a qué
  distancia está ella cuando la oye; una persona no. Si al jugarlo se siente fácil, hay palancas medidas: el rato que
  la ocupa el timbre (10 s), lo que tarda en llegar a la puerta (3 s) y la duración de cada cerradura.
- Pesadilla ya es mucho más dura por otra razón: no tiene punto de control frente a la puerta (morir ahí es empezar
  desde el Piso 4).
