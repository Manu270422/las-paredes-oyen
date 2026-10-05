# Idea: la placa que cambia cuando no la miras (para después del Gate 1)

> **No implementar todavía.** Va después del Gate 1, cuando haya datos de varios testers. Nació con las placas de
> la Tarea 2 (Sprint 4).

## La idea

Un evento del director que cambia el número de una placa mientras el jugador no la está mirando. Por ejemplo, la
placa del 403 dice **402** un rato, o la del 401 aparece sin número, solo con los cuatro agujeros de los tornillos.
Al volver a mirarla está como siempre. Con eso el jugador no puede confiar del todo en lo único que lo orienta.

Encaja con el tema del juego: el edificio repite, imita y miente. La criatura imita voces y pasos; el edificio
imitaría su propia numeración.

## Cómo encaja con lo que ya existe

- **Ya hay casi todo.** El director tiene eventos que cambian el mundo sin que se vea (`ObjetoMovido`, la puerta
  que aparece abierta) y una memoria de qué mira el jugador (`MemoriaMundo`, `VigilanciaEvento`).
- **Las placas son datos del paquete** (`placas: [{ puerta, texto }]`). El evento cambiaría solo la
  TEXTURA de una placa ya colgada; los datos no se tocan.
- **Se restauraría sola**: al cargar un punto de control, `Nivel.restablecer` tendría que volver a pintar el
  número real (hoy las placas no cambian, así que no lo hace).

## Riesgos (por qué no ahora)

- **Puede romper la orientación que la Tarea 2 acaba de arreglar.** Un tester ya se confundió de apartamento sin
  placas; con placas que mienten, la confusión deja de ser un error del juego solo si se entiende como intención.
- **Necesita datos**: que los testers lean las placas (telemetría: cuántas veces se ilumina una placa) y que ya no se
  pierdan. Si nadie las mira, el evento no se nota; si dependen de ellas, puede frustrar.
- **Regla de justicia propuesta:** nunca en la placa de la puerta que lleva al objetivo actual, y nunca dos veces
  seguidas en la misma partida.

## Qué haría falta

1. Que `colgarPlaca` deje cambiar el texto de una placa (repintar el lienzo) y volver al original.
2. Un evento `PlacaCambiada` en `director/eventos/` con su `puedeOcurrir` (que la placa no esté a la vista).
3. Una prueba con recorrido: mirar la placa, darse vuelta, que cambie, volver a mirarla y que esté igual al cabo de
   un rato.
