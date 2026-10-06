# A3 — Accesibilidad: el HUD oculto con `opacity: 0` (propuesta, parte de A3)

Se encontró al investigar el "bug 2" de la pantalla de inicio (que resultó no ser un bug: las pantallas ocultas ya usan
`visibility: hidden` y salen del árbol de accesibilidad después de su animación de 300 ms; hay una prueba que lo protege).

## Hallazgo real

Estos elementos del HUD se ocultan **solo con `opacity: 0`**, que no los saca del árbol de accesibilidad ni de la lectura
de un lector de pantalla:

| Elemento | Archivo CSS | Riesgo |
|---|---|---|
| Texto de interacción (`.interaccion`) | `hud.css` | Anuncia "Abrir puerta" sin que se vea |
| Objetivo (`.objetivo`) | `hud.css` | Anuncia un objetivo viejo, ya oculto |
| Tarjeta de lugar (`.tarjeta`) | `hud.css` | Lo mismo |
| Pistas (`.pista`) | `hud.css` | Lo mismo |
| Indicador del aire (`.indicador`) y medidor REC (`.medidor`) | `hud.css` | Anuncia datos que no se muestran |
| Botones táctiles ocultos (`.tactil__boton--oculto`) | `tactil.css` | Siguen siendo "pulsables" para un lector de pantalla |

## Propuesta

Mantener el fundido, pero sacar el elemento del árbol al terminar: `visibility: hidden` con la misma transición
(`transition: opacity …, visibility 0s linear <duración>` en el estado oculto), como ya hace `.pantalla--oculta`.
Sin `display: none` (mataría los fundidos) y sin `inert` (no hace falta: no reciben foco).

## Dónde encaja

Es parte de **A3** (ajustes de accesibilidad). La ayuda visual del aire, el modo sin sustos fuertes y el indicador del
aire siempre visible ya se hicieron en la Tarea 4 del Sprint 4; los subtítulos direccionales ya existían. Va **después del Gate 1**: toca todo el HUD y no cambia el balance, pero conviene hacerlo con un
lector de pantalla real a mano (NVDA en Windows, VoiceOver en iOS), y eso requiere tiempo de prueba que hoy es de los
probadores.

## Prueba

Una prueba en el juego real, del estilo de la de las pantallas: tras ocultarse, cada elemento del HUD tiene
`visibility: hidden` y no aparece en `getByRole`.
