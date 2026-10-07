# C2 — Escaleras que se caminan, la llave, el ascensor y misiones del Piso 3 (solo documento)

> **Sin programar.** Costos en días de una persona, con pruebas caminando. Ver la nota de C1 al final.

## 1. Escaleras que se caminan
- **Hoy el motor no tiene altura.** Es 2.5D: el jugador se mueve en x y z, la cámara va a la altura de los ojos sobre
  y = 0, las colisiones son cajas en planta y la celda `E` bloquea como un muro. La escalera sí está dibujada con
  medidas reales: 8 contrahuellas de 17 cm por medio piso y el descanso a −1.35 m.
- **Qué falta**:
  - una altura del suelo por posición, 0 en todo el piso y una rampa dentro de los tramos, que la cámara sigue suave;
  - carriles caminables dentro de las celdas `E`, solo para el jugador, con cajas en el ojo y en la baranda;
  - pasos de escalón, con su propio ritmo y sonido.
- **El corte**:
  - bajo el tramo hasta el descanso y doy la vuelta frente al muro del pozo;
  - ahí hay un corte de ~0.3 s y aparezco en el descanso de arriba del piso de abajo, mirando el otro tramo;
  - el pozo es igual en los dos pisos, así que casi no se nota.
  - Antes del descanso se puede volver atrás.
- **La criatura**: hoy, pulsar E en plena caza te saca del piso al instante (una salida de emergencia que nadie
  diseñó). Caminando son 3–4 s expuesto. Propongo que ella pueda seguirte hasta el descanso, pero nunca cambiar de piso.
- **Accesibilidad: sí**, mantener el fundido actual como opción ("Escaleras: caminar / fundido"). Una cámara que baja y
  gira puede marear, y en táctil girar en el descanso es torpe.
- **Costo y riesgo**: 4–6 días. Riesgo medio: toca el movimiento del jugador y lo que significa `E`.

## 2. La llave: encontrarla y que abrir sea un momento
- **Despiertas sin llave** (se quita `despertar.objeto`), a oscuras, con el objetivo "Encuentra cómo bajar".
- **Dónde**: bajo la silla del cuarto del 402, que mira la pared. Quien contaba los días la tenía y no alcanzó a
  usarla. Es la idea original, que se cayó porque el final terminaba el juego; con el despertar ya no lo termina.
  Llegar a ella obliga a volver por el pasillo oscuro con la criatura activa: tensión después del final.
- **Usarla**: mantener E 1.5 s en la reja (como medir). La llave gira, el candado cae y rebota en el escalón (sonido
  nuevo), la cadena se desliza entre los barrotes (sonido nuevo) y la reja se abre con un chirrido largo. Son 2–3 s de
  solo mirar, y **es ruido**: la criatura lo oye y bajas con ella detrás.
- **Motor**: reja, cadena y candado hoy están fundidos en una sola malla por material; hay que separarlos para
  animarlos.
- **Costo y riesgo**: 2–3 días, riesgo bajo.

## 3. El ascensor completo
- **Qué es**:
  - una cabina de una celda en (5, 11), el muro sur del pasillo junto a la escalera, que es macizo en los dos pisos;
  - puertas, panel con dos botones, indicador de piso, luz que parpadea;
  - vibración, con los efectos de cámara que ya existen, y zumbido de motor y cables.
- **Mirar mientras viaja: sí**, y es el caso fácil. La cabina es una caja cerrada idéntica en los dos pisos: el piso
  cambia con las puertas cerradas, sin negro.
- **El ruido atrae, y esa es la gracia.** Llamarlo zumba por los muros y la campanilla de llegada es un ruido fuerte en
  el piso nuevo: llegas anunciado. La escalera es lenta y callada; el ascensor es rápido y te delata.
- **Riesgos**:
  - una celda nueva en las dos rejillas;
  - la criatura frente a las puertas al abrir (regla de justicia: no abren si está a menos de 4 m);
  - morir adentro;
  - el director durante el viaje.
- **Costo y riesgo**: 1.5–2 semanas, riesgo alto. Propongo hacer primero lo aprobado (hueco, puerta oxidada y sonido) y
  la cabina después de las escaleras caminadas, que prueban la misma idea: cambiar de piso sin negro.

## 4. Misiones del Piso 3 que no son medir

| Misión | Qué hace el jugador | Usa | Pieza nueva |
|---|---|---|---|
| La pared que golpea | Los golpes vienen de un muro: escuchar quieto en varios hasta dar con el que es | Modo escuchar, subtítulos con dirección | Zona de escucha que marca bandera |
| Grabar la prueba | El administrador pidió pruebas: grabar un golpe con la grabadora a menos de 6 m | La cinta ya capta el mundo | Condición "la cinta captó X" |
| Sacarla del 302 | Ella está en la pared del cuarto del niño: dejar el señuelo en el 301 y entrar mientras va | Señuelo, IA | Ninguna (guion y banderas) |
| Cruzar sin respirar | Pasar junto al hueco donde duerme con el aire contenido; si sueltas, despierta | Respiración | Zona que exige aguantar |
| Juntar la libreta | Tres hojas de Andrés en el 301, 302 y 303; la tercera marca `imitacion:piso3` | Documentos | Ninguna |

Recomiendo empezar por **3 y 5** (solo datos y guion) y **1**. La 2 y la 4 piden una pieza de motor pequeña cada una.

## Orden sugerido
1. La llave (2–3 días).
2. Misiones 3, 5 y 1.
3. Escaleras caminadas (4–6 días).
4. Cabina del ascensor (1.5–2 semanas).

**C1** pide no empezar el Piso 3 sin el Gate 1. Se empezó por decisión del 2026-10-06. Antes de los puntos 3 y 4, que
son los caros, propongo al menos 3 testers del Piso 4.
