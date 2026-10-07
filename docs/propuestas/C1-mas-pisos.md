# C1 — Más pisos, escaleras y ascensor (Tarea 5, solo documento)

> **No implementar.** Principio: *variar antes que multiplicar*. Nada de esto empieza antes del Gate 1.
>
> **Actualización 2026-10-07:** el creador adelantó parte de esto sin el Gate 1. Ver "Decisiones del creador" al final.

## 1. ¿Cuántos pisos?

- **`docs/01` (diseño maestro)** contempla **5 espacios**: el Piso 4 (hecho), el Piso 3 (el 301 es el 401 en espejo, con
  los muebles sin cubrir… y alguien comiendo), "el hueco" (el pasillo entre el 401 y el 403 que no está en los planos), el
  sótano con el cuarto de bombas y la azotea.
- **El borrador del Sprint 3** propone **5 niveles** con una regla nueva cada uno: 4, 3, 2, 1/lobby y sótano.
- **Mi recomendación honesta: construir 1 piso más ahora (el Piso 3), con la meta de 3 en total** (Piso 4 → Piso 3 →
  sótano como final), más "el hueco" como tramo especial dentro del Piso 4.
- **Por qué no 4 o 5**:
  - Cada piso nuevo cuesta 2–3 semanas con sus pruebas caminando, en un equipo de una persona.
  - Lo que hace bueno al juego (oír, contener el aire, la cinta) todavía no está validado con jugadores.
  - Cinco pisos a medias asustan menos que tres bien hechos.
- **Los pisos 2 y 1 y la azotea** quedan como opción si los datos dicen que la gente termina y pide más.

## 2. Que la escalera se vea como escalera (sin cambiar de piso)

Hoy es un cuarto de 3 × 5 celdas con una baranda. Propuesta: las **filas 11–12** (el sur de la escalera, donde ya están la
baranda y el viento) pasan a ser **el hueco de la escalera**:

- **Un tramo que baja** hacia la oscuridad: 8 escalones visibles, el descanso y, a la vuelta, una **reja con cadena**
  (al Piso 3, todavía cerrado). El viento sube desde ahí, como hoy.
- **Un tramo que sube** pegado al muro: termina en **escombros** que tapan el paso al Piso 5.
- **La baranda** rodea el hueco. El "4" pintado ya está en el muro norte.
- **Técnica**:
  - un carácter nuevo en la rejilla (`E` = hueco de escalera) sin piso y sin techo encima;
  - escalones como cajas en `Muebles`;
  - para caminar es muro y para el sonido y la vista es aire. El viento y los ruidos de abajo deben atravesarlo; la
    criatura no camina por él.
- **Costo**: ~1.5–2 días con capturas y pruebas (rejilla, `ConstructorGeometria`, oclusión de audio, A*).
- **Riesgo para los recorridos: bajo.** Todas las rutas salen de la escalera por la fila 10.5 y el punto de control
  `escalera` está en (2.2, 10.5), fuera del hueco. Lo que hay que vigilar:
  - que la nueva celda no tape el sonido (prueba de oclusión);
  - que nadie aparezca dentro del hueco (prueba de coherencia: ningún punto, mueble ni lámpara en celdas `E`).
- **¿Antes o después del Gate 1?** No cambia el juego, solo el escenario; aun así, propongo **después**, para que lo que
  prueban los testers y lo que está en `sprint-4` no se separen más.

## 3. Cambiar de piso en plena partida (lo que falta en el motor)

| Pieza | Qué hace falta | Impacto |
|---|---|---|
| Mundo | Descargar un `Nivel` y cargar otro (escena, luces, colisiones) sin recargar la página | Medio |
| Progreso | Banderas por piso (`piso3:medido:301`) o globales con prefijo | Partida v5 con migración |
| Guardado | La partida ya dice `piso`; falta el progreso de cada piso visitado | Bajo (A2 ya existe) |
| Criatura | Al cambiar de piso, reaparece en la guarida del piso nuevo. Que **te siga por la escalera** es un susto aparte, para después | Medio |
| Director | Reinicia la fase al cambiar de piso, pero conserva la carga (el miedo viaja contigo) | Bajo |
| Pruebas | Un recorrido que baja por la escalera, juega un tramo del Piso 3 y vuelve | Obligatorio |

Total estimado: **1–2 semanas**, antes de cualquier contenido del Piso 3.

## 4. El ascensor como mecánica de terror (no adorno)

| Propuesta | Cómo asusta | Costo / riesgo |
|---|---|---|
| **A. El hueco del ascensor conduce el sonido** (ascensor roto) | Encaja con la regla del Piso 3 ("el edificio conduce el sonido entre pisos"): oyes por el hueco lo que pasa arriba y abajo, y ella te oye a ti | **Bajo**: es audio y oclusión. **Recomendado primero.** |
| B. Atajo ruidoso | Llamarlo zumba por todos los muros; la campanilla al llegar es un ruido fuerte en tu posición; las puertas tardan 3 s en abrir y hay que esperar quieto | Alto: necesita el cambio de piso y probar el ruido entre pisos |
| C. Se detiene entre pisos | La luz parpadea y oyes rasguños en el techo de la cabina; un momento de guion, no repetible | Medio: es guion, pero la cabina es un mapa propio |

## 5. Orden de construcción (cada paso con su condición)

1. **Gate 1** (en curso): 5 personas, 1 en celular.
2. **Arreglar lo que diga el Gate 1** y afinar la dificultad. **Condición**:
   - H2 (aprende las reglas sin tutorial) y H5 (ninguna muerte injusta) se sostienen en ≥ 4 de 5;
   - ≥ 3 de 5 terminan;
   - el celular va a ≥ 30 FPS.
3. **B1 (Turno del día)**: variaciones del Piso 4, más rejugable y sin pisos nuevos.
4. **La escalera visual** (sección 2) y **C1 en el motor** (sección 3).
5. **Piso 3** como variación del 4 (mapa en espejo, una regla nueva) + **ascensor A**. **Condición**:
   - en el Gate 1, la mayoría termina el Piso 4 en < 25 min;
   - ≤ 1 de 5 se pierde de apartamento (la pregunta nueva de la hoja), porque un piso nuevo multiplica las oportunidades
     de perderse.
6. **Gate 2** con el Piso 3. Solo si se sostiene: **el sótano como final**, y después el ascensor B o C.

**Más misiones sin más pisos**: B1 y "el hueco" dan contenido nuevo reutilizando el Piso 4. Es la forma más barata de
crecer sin bajar la calidad de lo que ya funciona.

## Decisiones del creador (fuera del orden de arriba)

- **2026-10-06.** El creador pidió más pisos, escaleras y frases de sangre, y decidió adelantar los pasos 4 y 5 sin
  esperar el Gate 1, que sigue pendiente. Hecho desde entonces:
  - escalera visible y motor de cambio de piso;
  - Piso 3, tandas 1 y 2: llave al despertar, mapa, escalera de ida y vuelta, frases, manchas y humedad.
- **Riesgo aceptado.** Lo que el Piso 3 construye encima (oír, contener el aire, la cinta) sigue sin validarse con
  jugadores, y `sprint-4` se aleja de `main`, que es lo que prueban los testers.
- **2026-10-07, tope.** Nada de lo caro de C2 (escaleras caminadas y cabina del ascensor) se empieza sin al menos
  **3 testers del Piso 4**.
- **Orden hasta entonces:**
  1. la llave bajo la silla del 402, con una pista para que nadie se atasque (C2 §2);
  2. las misiones de solo datos y guion (C2 §4);
  3. lo caro, después de los testers.
