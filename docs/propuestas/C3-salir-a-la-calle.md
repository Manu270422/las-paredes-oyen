# C3 — Salir a la calle: un tramo corto antes de "Sobreviviste" (solo documento)

> **Sin programar, a la espera de A4.** Pedido por el creador el 2026-10-17, que ya decidió las preguntas (al final).
> Costos en días de una persona, con pruebas caminando. La calle completa (barrio y más presencias) es para la
> **1.1**: mi recomendación está al final.

## La idea (para la 1.0)

Hoy, al abrir la tercera cerradura, la puerta se abre, se oye la lluvia y todo se va a negro. Con C3, **sales
caminando**: un andén, la calle mojada, lluvia y niebla, un poste con su lámpara de sodio, dos o tres siluetas de carros
estacionados y la otra acera perdida en la niebla. Unos 20–25 m. Al llegar al poste (o a los ~20 s), algo te hace mirar
atrás: la fachada del Almendros y, en el cuarto piso, **la ventana del 401 con luz**. Entonces, "Sobreviviste".
Ella no sale: vive en las paredes, y afuera no hay paredes que la lleven.

## Qué necesita el motor

| Pieza | Hoy | Qué falta | Costo |
|---|---|---|---|
| **Espacio sin techo** | Toda celda de piso lleva techo a 2.7 m (`ConstructorGeometria`) | Un cuarto "exterior": sin techo, con materiales de afuera (asfalto, andén, fachada) y muros altos (la fachada, unos 12 m). La rejilla 2.5D sirve: la calle es plana. El mapa del Piso 1 crece hacia el sur | 1–1.5 días |
| **El cielo** | No hay: el fondo es el negro de la niebla | Una cúpula con un degradé oscuro (nubes y el resplandor naranja de la ciudad), sin texturas: un solo dibujo | 0.5 día |
| **La niebla** | Una sola para todo (`FogExp2` casi negra: a 20 m ya es ~90 % niebla) | Afuera, gris azulada y un poco menos densa (que se vean el poste y la ventana), con transición en la puerta | 0.5 día |
| **Las luces** | Un grupo fijo de luces puntuales (2/4/6 según la calidad, sin sombras; cambiar ese número recompila todos los shaders) | El poste usa una de esas luces, con un halo dibujado. La ventana del 401 y los carros no necesitan luz real: brillan solos | 0.5 día |
| **La lluvia** | No hay | Gotas alrededor de la cámara (miles de rayas en un solo dibujo, animadas en el shader), su sonido (sintetizado, como los demás), el asfalto brillante (sin reflejos reales) y la lluvia que se oye por la puerta abierta | 1–1.5 días |
| **La calle** | — | Andén y bordillo, el poste, siluetas de carros (cajas, como los muebles), la fachada con ventanas (la del 401, encendida) | 1 día |
| **El final** | La puerta abierta → fundido → "Sobreviviste" | La puerta solo se abre; el final llega en el poste o con el tiempo, después de mirar atrás. Telemetría: cuánto caminó y si miró | 0.5–1 día |

**Total: 5–6.5 días**, en unas 3 tandas: (1) exterior, cielo y niebla; (2) lluvia, calle y fachada; (3) el final, el
sonido, las pruebas caminando y la medición.

## Riesgo para el rendimiento en celular: medio

- **No hay todavía una medición en un celular real** (A4 está pendiente). El único dato: en la ronda 1, un celular en
  calidad alta corría a 33 fps (31–36) adentro del edificio.
- Afuera **se ve más** (no hay muros que tapen lo que hay detrás) y la lluvia es **transparente**, lo más caro para la
  GPU de un celular: pintar muchas capas una encima de otra.
- Cómo lo bajaría: la calle no se dibuja hasta que se abre la puerta; la lluvia según la calidad (en baja, pocas gotas,
  y la niebla y el sonido hacen el resto); ninguna sombra nueva; los shaders nuevos se compilan al armar el piso, no en
  la puerta (un tirón ahí arruinaría el final); y un presupuesto: no perder más de ~10 % de los fps medidos en A4.
- **Recomendación:** medir A4 primero (el juego de hoy, en un celular de gama media), y medir otra vez con la calle.

## La 1.1: la calle completa, sin perder lo que hace especial al juego

Lo especial es **una sola criatura, ciega, que oye**, y un edificio cuyas paredes llevan el sonido. Un espacio abierto
diluye eso: sin muros, nada lleva el sonido, y más amenazas lo vuelven otro juego. Mi recomendación:
1. **Una sola criatura, también afuera.** Nada de monstruos nuevos ni "presencias" con otras reglas. Las presencias del
   barrio, humanas y quietas: ventanas que se apagan cuando pasas, un televisor detrás de una pared, una persiana que se
   cierra. El barrio también oyó y calló: es el tema del juego.
2. **Ella sigue atada a las paredes.** Afuera solo se mueve por las fachadas: el centro de la calle es seguro y pegado a
   los muros es peligroso. Es la regla central del juego, a escala de barrio. La lluvia, solo ambiente: que no tape
   ruidos (se descartó en P1 porque repetía el cuarto sordo).
3. **Tramos cortos, cerrados por la niebla**, y otros edificios con paredes que oyen, no un mundo abierto. La niebla
   también es lo que lo hace posible en un celular.
4. **Después de la 1.0 y de A4:** lo exterior es lo más caro de hacer bien (arte, luz y rendimiento).

## Decisiones del creador (2026-10-17)

1. **Afuera, un respiro**, con un golpe en el vidrio de la puerta, desde adentro, mientras te alejas.
2. **La ventana del 401, solo con luz.** La silueta queda para la 1.1.
3. **Primero A4**: no se programa la calle hasta tener los números de un celular real
   ([guía de la medición](../pruebas/guia-a4-celular.md)).
