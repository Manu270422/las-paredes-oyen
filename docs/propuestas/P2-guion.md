# P2 — Diseño del Piso 2 (propuesta, sin programar)

> 2026-10-12. Lo pidió el creador para revisarlo. **No se programa hasta que él hable con los testers del Piso 4 y
> el 3** (decisión del 2026-10-12). Respeta lo que ya existe: el Piso 3 termina con tres golpes desde abajo, detrás de
> la reja del Piso 2, y el orden aprobado es Piso 2 → Piso 1 → salir del edificio con "Sobreviviste".
> Principio de C1: **variar antes que multiplicar**. El Piso 2 cambia una regla, no agrega diez.

## La idea en una línea

El Piso 4 cuenta lo que el edificio oyó; el 3, lo que nadie quiso oír. **El 2 es de quien se encargó de que no se
oyera**: Hernando, el administrador, el de "son las tuberías". Vivía en el 202 y forró su apartamento con colchones y
espuma para no oír nada. Ahí adentro el sonido no viaja por los muros: ella no te oye... y tú tampoco la oyes a ella.

## La regla nueva: el piso sordo

| Dónde | Qué pasa con el sonido |
|---|---|
| Cuartos acolchados (el 202 y parte del 201) | Tus pasos y tu respiración no pasan por los muros (más seguro), pero tampoco oyes los suyos: sin rasguños, sin jadeo, sin pasos. Solo te quedan la linterna que parpadea y las lámparas |
| Pasillo y el 203 (sin forrar) | Como en los pisos de arriba |

Es la mecánica central dada vuelta: en todo el juego se sobrevive oyendo; aquí hay un lugar donde ella no te encuentra
por el oído, pero tú quedas ciego de oído. **No es refugio**: ella entra caminando (no por el muro) y, adentro, solo
la delata la luz. Esconderse ahí es apostar.

## El arco

| # | Momento | Qué pasa | Por qué |
|---|---|---|---|
| 1 | La reja se abre sola | Cambia el final del Piso 3: después de los tres golpes, la cadena de la reja de abajo cae sola, despacio. Nadie a la vista. Se baja caminando | "Para que sepas que oyó": alguien te abrió. Ya no es el fin de la partida |
| 2 | Llegada | Silencio raro: el pasillo del 2 suena distinto (la reverberación de los cuartos forrados). La escalera que sigue bajando está **tapiada** con ladrillo nuevo | Dice sin texto que por la escalera no se sigue |
| 3 | La oficina (201) | El libro de quejas: años de reportes por ruido del 302 y del 402, todos contestados "tuberías", con la misma letra. Un llavero sin la llave del ascensor | Hernando sabía. El llavero dice qué buscar |
| 4 | El 202 forrado | Colchones clavados a las paredes, espuma en el techo, un radio a todo volumen que se apagó. La llave de servicio del ascensor está ahí | El lugar sordo: la regla se aprende entrando |
| 5 | **Grabar el cuarto sordo** | La medición del piso, en el centro del 202. La cinta: silencio absoluto durante segundos... y una voz desde adentro de los colchones, con el tono de Hernando: "Son las tuberías." | Vuelve la mecánica de grabar. La criatura aprendió también la voz que mandaba a callar |
| 6 | El ascensor | Con la llave, el botón «1» del panel funciona. Es el **único** camino a abajo | El atajo ruidoso se vuelve obligatorio una vez: hay que llamarlo y esperarlo |
| 7 | Clímax: se detiene entre pisos | Bajando, la cabina frena de golpe entre el 2 y el 1. La luz parpadea. Rasguños en el techo de la cabina: ella está encima, escuchando. Hay que quedarse quieto y contener el aire. Si aguantas, se va y la cabina sigue | La propuesta C de C1 ("se detiene entre pisos"), un momento de guion, una sola vez. Usa el encuentro de presencia que ya existe |
| 8 | Final del Piso 2 | La cabina llega al Piso 1. Las puertas abren a la portería a oscuras. "Piso 2 completado · Próximamente: Piso 1" (o sigue, si el Piso 1 ya existe) | Deja la partida en la puerta de la salida |

Objetivos (borrador): bajar → averiguar quién lo tapó todo → encontrar la llave del ascensor → grabar el cuarto sordo
→ bajar al Piso 1.

## Lo que cambia en lo que ya existe

- **Final del Piso 3:** hoy termina la partida. Pasaría a abrir la reja de abajo (con su sonido) y la partida sigue.
  Cambian `piso3/guion.ts` y sus pruebas (`finalPiso3.spec`, `guionPiso3.test`).
- **El ascensor:** el panel pasa a tener «4», «3», «2» y «1» en los tres pisos (la validación exige que sea el mismo
  panel en todos). Cada botón puede pedir algo: el «1» pide la llave de servicio. Es una pieza pequeña (`requiere`
  por parada).
- **La escalera del Piso 2 hacia abajo:** tapiada (una opción nueva de `opcionesEscalera`, como los escombros del 4).

## Piezas de motor nuevas

| Pieza | Qué es | Costo | Riesgo |
|---|---|---|---|
| Muros acolchados | Un acabado de pared que bloquea el sonido mucho más (oclusión del audio y oído de ella) y no deja que ella oiga a través | Medio | Alto: toca la regla central; hay que medir que no se vuelva refugio |
| Parada con llave | `requiere` por botón del panel | Bajo | Bajo |
| La cabina se detiene | Una fase nueva del ascensor solo para el guion (frena, rasguños en el techo, encuentro) | Medio | Medio: morir dentro de la cabina detenida tiene que ser justo y explicable |
| Escalera tapiada | Opción de la escalera | Bajo | Bajo |

**Costo total estimado: 2–3 semanas** con pruebas caminando (mapa, textos, guion, sonidos, las cuatro piezas).

## Riesgos y preguntas para el creador

1. **¿La historia de Hernando te sirve?** Es el que cerró el Piso 3 y mandó a callar. Si prefieres otra cosa en el 2
   (por ejemplo, "el hueco" o la portería), se cambia el arco, no las piezas.
2. **El cuarto sordo** es la idea más fuerte y la más arriesgada: si ella casi no te encuentra ahí, se vuelve el
   refugio que el juego evita. Propongo que entre caminando y que adentro la delaten solo las luces.
3. **El ascensor obligatorio una vez** contradice un poco "la escalera es el camino, el ascensor el atajo". Lo
   justifica que la escalera esté tapiada a la vista. ¿Te gusta?
4. **El clímax en la cabina detenida:** es un encuentro de presencia en 1.3 × 1.3 m. Si muere ahí, ¿reaparece en el
   201 o dentro del 202? Propongo el 202, con la llave ya en el bolsillo.
5. **Duración:** apuntaría a 12–18 minutos, como el Piso 3.
6. **Lo que digan los testers manda:** si la ronda 2 dice que el ascensor no se entiende o que el Piso 3 traba, eso
   se arregla antes que este piso.
