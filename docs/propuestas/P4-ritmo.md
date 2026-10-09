# P4 — Ritmo del Piso 4: que dure y que dé miedo (después de la ronda 1)

> Aprobada por el creador el 2026-10-09 ("hagámoslo como dices"). Origen: [ronda 1](../pruebas/ronda-1-2026-10-08.md).
> Meta: 10–15 min para quien no lo conoce y ≥ 5 min con resistencia real para quien ya se sabe la ruta.

## El problema, en una línea

Con la ruta aprendida, el Piso 4 es una línea recta de ~2 min. La criatura solo tiene cuerpo después del apagón,
medir no atrae nada a tiempo y la orden de trabajo dice dónde está todo.

## Los cambios

| # | Cambio | Por qué | Dónde |
|---|---|---|---|
| 1 | **Medir la atrae de verdad.** Dentro del muro va a la velocidad necesaria para llegar en ~4 s (tope 7 m/s); los rasguños se acercan y paran antes de que termine la medición | Hoy va a 1.6 m/s: desde 20 m no llega en 6 s y medir no asusta | `ia/estados/EstadoParedes.ts` |
| 2 | **Primer encuentro guionizado.** Al salir al pasillo después de la cinta del 401, se desprende del muro a ≥ 5 m, fuera de la vista, y viene a escuchar. Quieto y sin respirar, se va. La pista "Si la ves, no hagas ruido" pasa a este momento | La regla más importante del juego se aprende a los 2 min, no nunca. Hoy hubo 1 encuentro en 4 partidas | `pisos/piso4/guion.ts` |
| 3 | **La llave del 402 cambia de lugar y la historia lleva hasta ella.** La orden de trabajo ya no dice "encima del escritorio": dice que se la dejó al vecino del 403. En el escritorio del estudio, donde estaba la llave, ahora está la nota de M.: la llave volvió al cajón de la mesita de doña Rosalba, en el 401, junto al diario. La llave aparece al leer la nota | Hay que leer para avanzar; el camino va y vuelve por el pasillo (401 → 403 → 401 → servicio → 402) y pasa por el diario, que nadie leía | `pisos/piso4/documentos.ts`, `mapa.ts`, `objetivos.ts`, `index.ts` |
| 4 | **El clímax en el 402.** Al empezar a medir el 402, sale del muro a ~4.5 m, a la espalda, y llega a escuchar antes de que termine la cinta. La cinta del 402 la capta | El final se medía con ella a 15 m y la cinta salía vacía | `pisos/piso4/guion.ts` |
| 5 | **Punto de control en el 402** al apagón (dentro del 402, junto a la puerta) y otro en el dormitorio del 401 al tomar la llave | El clímax ahora puede matar: no se repite medio piso por eso | `pisos/piso4/index.ts`, `mapa.ts` |
| 6 | **El objetivo se recuerda solo** cada 90 s de juego sin cambiar (en todas las dificultades, también en Difícil, que no tiene pistas) | En la ronda 1, el de Difícil vio el objetivo 6.5 s y se perdió 3 min | `narrativa/Progreso.ts` |

## Lo que no cambia

- Las reglas de justicia: nunca sale del muro cazando, el encuentro siempre se puede superar y la caza siempre avisa.
- La tabla de dificultad y el director (su golden master sigue igual).
- El apagón, el final y la escalera.

## Riesgos

- **Más encuentros = más muertes.** La primera ronda informal (2026-09-28) mostró que quien muere varias veces se
  rinde. Lo mitigan los puntos de control nuevos, la oferta de bajar la dificultad tras 3 muertes y que cada
  encuentro nuevo se pueda superar con lo que el juego ya enseñó.
- **Medir más difícil.** Si la criatura llega en el muro, no mata: solo para de rascar. Matar sigue exigiendo hacer ruido.

## Cómo se comprueba

Pruebas caminando: el primer encuentro sale en el pasillo y se supera quieto; la nota del escritorio hace aparecer la
llave en el 401; el 402 trae su encuentro y la cinta capta la presencia. Después, **ronda 2 con jugadores nuevos**.
