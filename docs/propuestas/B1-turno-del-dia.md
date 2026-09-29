# B1 — Turno del día (propuesta, sin implementar)

> Fase B: **no se implementa antes del Gate 1**, porque cambia la dificultad. Depende de A1 (cada modificador transforma
> el paquete del piso) y conviene tener B2 (puntuación) para que el intento oficial signifique algo.

## Idea

Cada día, el mismo Edificio Almendros con **2 o 3 modificadores** elegidos por una semilla que sale de la fecha.
Todos los jugadores del mundo tienen el mismo turno el mismo día, sin servidor. El piso es el mismo, pero **se juega
distinto**: la idea es que la gente comente "¿viste el turno de hoy?".

## Semilla

- `semilla = hash("almendros:" + fechaTurno)` con FNV-1a de 32 bits. El generador es el `crearGenerador` (mulberry32)
  que ya existe en `utilidades/Aleatorio.ts`. Sin dependencias nuevas.
- **Problema con "fecha UTC" que hay que decidir:** la medianoche UTC son las **7:00 p. m. en Colombia**, justo cuando
  se juega terror. El turno cambiaría a mitad de la noche. Propongo que el día cambie a las **09:00 UTC**
  (4:00 a. m. en Colombia, 10:00–11:00 en España según la época): sigue siendo determinista y el mismo para todos.

## Modificadores (datos, no código suelto)

Cada modificador declara su **costo de dificultad**, el **recurso que ataca** y qué transforma. Cada día sale un conjunto
con costo total ≤ 2 y sin dos modificadores sobre el mismo recurso (por ejemplo, nunca "apagón" + "pila gastada").

| Modificador | Qué cambia | Recurso | Costo | Regla que refuerza |
|---|---|---|---|---|
| Apagón temprano | Las lámparas del pasillo empiezan rotas | Luz | +1 | Sin luz escuchas más |
| Pila gastada | Batería inicial al 55 %, una pila menos | Luz | +1 | La linterna es riesgo |
| Paredes finas | Multiplicador de ruido pegado al muro 1.6 → 2.0 | Movimiento | +1 | Las paredes llevan el sonido |
| Noche de tuberías | Más golpes de tubería: ruido falso que confunde | Oído | +0.5 | ¿Fue ella o el edificio? |
| Otra mudanza | Pilas y documentos en otros puntos (lista cerrada, todos alcanzables) | — | 0 | Explorar de nuevo |
| El 402 entreabierto | Sin llave: se salta un objetivo, pero la criatura despierta desde el inicio | Tiempo | +0.5 | Apurarse cuesta |
| Madrugada | Fase de calma más corta: el primer susto llega antes | Tensión | +0.5 | — |

Qué **no** puede tocar un modificador: la regla de justicia (aviso antes de cazar, encuentro, muerte explicada) ni los
umbrales de la criatura, hasta tener datos del Gate 1.

## Intento oficial y práctica

- **Oficial:** uno por día. Sin puntos de control; termina en el final o en la primera muerte (dura ~15 min). Su
  resultado va al ranking local del día.
- **Práctica:** ilimitada, con el mismo turno y con puntos de control. No cuenta para el ranking.
- **Sin castigos por faltar:** no hay rachas ni contador de días seguidos. Los turnos pasados se pueden jugar en práctica
  (archivo). No hay recompensas por volver cada día, solo el turno distinto.

## Datos y pantalla

- Clave nueva `turnos` (versionada con A2): por fecha, el resultado oficial (tiempo, muertes, puntuación B2) y la mejor
  práctica. Tope de 60 días guardados.
- Menú: "Turno del día". Antes de entrar, los modificadores dichos como la historia, no como una lista de reglas:
  *"Esta noche: el pasillo no tiene luz · la pila está a medias."*
- La tarjeta de lugar lleva la fecha: *Edificio Almendros · Piso 4 · 29 de septiembre*.
- La telemetría guarda la fecha del turno y sus modificadores (para cruzar dificultad con muertes).

## Pruebas

- Determinismo: la misma fecha da siempre los mismos modificadores (unitaria).
- Reglas del sorteo en 10 años de fechas (3 650 semillas): costo ≤ 2, sin recursos repetidos, cada modificador sale al
  menos una vez al mes (unitaria).
- "Otra mudanza": cada punto alternativo es alcanzable desde la escalera (prueba de mapa con A*).
- Recorrido caminando con el turno más difícil del catálogo (e2e).

## Preguntas para ti (antes de implementar)

1. ¿El día cambia a las 09:00 UTC (propuesto) o a medianoche UTC (7 p. m. en Colombia)?
2. ¿El intento oficial va sin puntos de control y termina en la primera muerte? Es más tenso, pero más duro.
3. ¿"El 402 entreabierto" choca con la historia (la llave y la carta)? Si choca, lo quito del catálogo.
