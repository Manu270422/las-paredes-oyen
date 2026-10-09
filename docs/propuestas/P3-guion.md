# P3 — Guion y final del Piso 3

> 2026-10-09. El creador pidió arrancar el Piso 3 ("si así fue el Piso 4, ¿qué me espera del 3?"). Respeta lo que
> quedó planeado el 2026-10-08 (el golpe a los 8 s, el apagón al juntar la libreta, la criatura en el pasillo al
> volver) y agrega lo que le faltaba para ser un nivel: **una medición** (la mecánica del juego) y **un final**.

## El arco

| # | Momento | Qué pasa | Por qué |
|---|---|---|---|
| 1 | Llegada | A los 8 s, tres golpes lentos desde la pared del cuarto de Andrés, en el 302: lejos, apagados por los muros, con dirección | "Después golpea tres veces, despacio, para que yo sepa que oyó" (cuaderno). Dice adónde ir sin un texto |
| 2 | Investigar | La carta del 301 y la libreta de Andrés (301, 303, 302), como ya estaba | — |
| 3 | Apagón | Al juntar la libreta revienta la luz roja de la escalera, la única del piso: se oye lejos y la linterna parpadea | El único lugar seguro se apaga, y el jugador no lo ve: lo descubre al volver |
| 4 | **Grabar la pared** | Nuevo objetivo: medir el dormitorio del 302, frente a las rayas de estatura. La medición la atrae (como en el Piso 4). La cinta: tres golpes desde adentro del muro, "Hoy mi mamá me midió" con voz de niño, y "Ya casi estoy completo" | Vuelve la mecánica central. La cinta une la libreta ("cuando esté completo") con las rayas |
| 5 | El pasillo | Al salir, ella está de pie en el pasillo, entre el jugador y la escalera, frente al 301, acechando | El pasillo mide una celda: no se puede pasar a su lado. Hay que alejarla con el señuelo, o iluminarla quieto y en silencio hasta que se retire. Las dos cosas ya las enseñó el juego |
| 6 | Final | En la escalera, a oscuras: desde abajo, detrás de la reja del Piso 2, tres golpes despacio. Fundido y pantalla "Piso 3 completado · Próximamente: Piso 2" | Cierra la partida para el lanzamiento del 31 de octubre y deja abierto el Piso 2 |

Objetivos: llegar (en silencio) → averiguar → juntar → **grabar la pared** (`medido:302`) → **volver a la escalera**
(`final:piso3`). Punto de control nuevo: `medido:302` → dormitorio del 302.

## Motor

- La cinta (transcripción + lo que captó el micrófono) pasa de `GuionPiso4` a un módulo compartido
  (`narrativa/Cinta.ts`): ahora la usan dos pisos.
- El guion del Piso 3 recibe las acciones del juego (fundido, solo mirar, terminar la partida).

## Riesgos

- **El pasillo puede frustrar.** Si alguien no descubre el señuelo, muere varias veces seguidas. Lo mitigan el
  punto de control en el 302 (a pocos pasos), la pista escrita (donde hay pistas) y la oferta de bajar la dificultad
  tras 3 muertes. Hay que mirarlo con testers.
- **Textos con voz de niño.** Son fuertes y van en la línea del cuaderno. El creador los debe leer.
