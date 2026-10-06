# Tarea 4 — Dificultad (estructura, sin balance)

> **Aprobada** con cambios (ver "Decisiones del dueño" al final). Paso 1 hecho: tabla, `ctx.dificultad`, foto y golden master.
> Paso 2 hecho: puntos de control por dificultad, Pesadilla sin guardar ni borrar y **partida v4** (adelantada del paso 3:
> sin ella, "Continuar" no sabría si la partida es de Normal o de Difícil). Morir en Pesadilla = partida nueva en Pesadilla:
> estadísticas en 0 y +1 partida iniciada en el perfil (confirmado por el dueño).
> Paso 3 hecho: pantalla para elegir (Nueva partida y Jugar otra vez), Ajustes → Juego (cambiar en plena partida, al
> instante y sin castigo), pistas e indicador del aire por dificultad (Accesibilidad lo devuelve) y **partida v5**
> (dificultad inicial y más baja jugada). Los ajustes no cambian de versión: las claves nuevas toman su valor por defecto.

> **Sin programar.** Todos los números son **provisionales hasta el Gate 1**: en el código llevarán el comentario
> `// PROVISIONAL (Gate 1)`. Normal es **idéntico** al juego de hoy. Los probadores del Gate 1 juegan `main` (congelado,
> sin dificultades), así que **los 5 juegan Normal** y los datos son comparables entre sí y con lo que se afine después.

## 1. La tabla (un solo lugar: `config/Dificultad.ts`, como `FIRMAS`)

| Valor | Dónde existe hoy | Historia | **Normal (= hoy)** | Difícil | Pesadilla | Suelo de justicia |
|---|---|---|---|---|---|---|
| Aviso antes de cazar (s) | `ARRANQUE` en `EstadoCazando` | 1.2 | **0.8** | 0.65 | 0.5 | ≥ 0.5 |
| Oído de la criatura (× ruido percibido) | nuevo multiplicador en `Entidad.oir` (umbrales de `CONFIG.entidad`) | 0.8 | **1** | 1.15 | 1.25 | — |
| Presencia sin ruido (m) | `CONFIG.entidad.radioPresencia` | 1.6 | **1.9** | 2.0 | 2.1 | ≤ radio del encuentro − 0.4 |
| Velocidad de caza (m/s) | `CONFIG.entidad.velocidadCazar` | 2.9 | **3.15** | 3.3 | 3.4 | ≤ 95 % de correr (3.42) |
| Encuentro: duración / gracia (s) | `DURACION_ENCUENTRO`, `GRACIA_INHALACION` en `EstadoInvestigando` | 2.4–3.8 / 1.1 | **2.8–4.6 / 0.9** | 2.8–4.6 / 0.75 | 2.8–4.6 / 0.6 | existe siempre; duración máx. + 0.3 ≤ aire con miedo máx. (**4.95 s**); gracia ≥ 0.6 |
| Batería (s) | `CONFIG.duracionBateria` | 720 | **480** | 380 | 320 | — |
| Presupuesto del director (× límite de fase) | `LIMITE_FASE` en `PresupuestoTension` | 0.8 | **1** | 1.15 | 1.3 | — |
| Alivio tras muertes seguidas | `DirectorTerror.reiniciar` | 20 %/muerte, tope 60 %, **alarga los intervalos** | **15 %/muerte desde la 2.ª, tope 45 %, baja el techo** | 10 %, tope 30 %, techo | 0 | — |
| Puntos de control | `paquete.puntosControl` | todos | **todos** | solo los "mayores" (medir un apartamento) | ninguno | — |
| Pistas de tutorial | guion → bus `pista` → HUD | sí | **sí** | no | no | — |
| Indicador del aire | HUD | sí + ayuda visual | **sí** | no ¹ | no ¹ | — |
| Explicación de la muerte | `ExplicacionesMuerte` | sí | **sí** | sí | sí | siempre |

¹ La opción de accesibilidad lo devuelve: **la accesibilidad nunca depende de la dificultad**.

- **Por qué el encuentro no se alarga en Difícil**: el aire dura `9 × (1 − 0.45 × miedo)` s; con miedo máximo, 4.95 s.
  Normal ya llega a 4.6 s (margen 0.35 s). Alargarlo haría el encuentro imposible: se endurece por la gracia y el oído.
- **Cómo se conecta**: `ctx.dificultad` (los valores de la elegida) en el contexto. Cada sistema lee su valor de ahí en vez de
  su constante. Ningún `if (dificultad === …)` en el motor. Los puntos "mayores" son un dato nuevo del paquete
  (`puntosControlMayores: ['medido:401', 'medido:403']`), con prueba de coherencia.

## 2. Normal idéntico al juego de hoy (cuatro pruebas)

1. **Foto de Normal**: una prueba unitaria (`dificultad.test.ts`) compara `TABLA.normal` con los valores **de la etiqueta
   `gate1-congelado`**, leídos con `git show` y escritos a mano con su archivo y línea. Si alguien toca Normal, falla.
2. **El alivio no cambia**: la prueba que ya existe (`[0, 0, 0.15, 0.3, 0.45, 0.45]` según las muertes) sigue igual.
3. **Golden master del director**, grabado con el código de **`gate1-congelado`**: con `Math.random` sembrado, la
   secuencia de eventos y fases (id y segundo) en 10 corridas de 400 s para 0 a 4 muertes seguidas
   (`pruebas/datos/director-normal-gate1.json`, 696 eventos). La etiqueta se extrajo con `git archive`, que solo lee el
   repositorio; un `git worktree` escribe en `.git`. Grabarla dos veces da el mismo archivo. Resultado: el sprint-4
   **antes** del refactor y **después** de conectar la tabla da la misma secuencia, evento por evento
   (`directorNormal.spec.ts`).
4. **La suite completa** de recorridos pasa sin cambiar ninguna expectativa.

## 3. Piso de justicia (una prueba que recorre las cuatro)

Con aviso antes de cazar, encuentro sobrevivible, caza más lenta que correr, gracia mínima y explicación de muerte. La
prueba falla si una dificultad baja del suelo; la verifico bajando a mano el aviso de Pesadilla a 0.3 s.

## 4. Puntos de control y Pesadilla

- **Historia y Normal**: los de hoy. **Difícil**: solo al medir un apartamento.
- **Pesadilla**: **no guarda ni borra**. Hay un solo hueco de guardado: la partida de otra dificultad queda intacta y
  "Continuar" la sigue ofreciendo. Al morir se vuelve a empezar desde la escalera; salir al menú la pierde. Al elegirla
  se avisa que no guarda. **Se desbloquea al terminar el Piso 4** (el perfil ya lo sabe: `pisosCompletados`).

## 5. Dónde se elige y qué pasa al cambiarla

- **Nueva partida** y **Jugar otra vez**: una pantalla con las cuatro, una línea cada una. Viene marcada la última
  elegida, guardada en Ajustes (migración v1 → v2, por defecto Normal). Pesadilla aparece bloqueada con el motivo.
- **Ajustes → Juego → Dificultad**: en el menú cambia la de la próxima partida; **en plena partida cambia la actual al
  instante**. Bajar nunca se bloquea. Subir se puede, hasta Difícil; Pesadilla, solo al empezar.
- **Continuar**: usa la dificultad **guardada en la partida** (partida v4: `dificultad`; las v3 migran como Normal).
- **Oferta de bajar**: tras **3 muertes seguidas sin avanzar**, la pantalla de muerte agrega un botón secundario que
  ofrece **un solo escalón**: desde Difícil, Normal; desde Normal, Historia. Una vez por tramo, nunca automático. No se
  ofrece en Historia ni en Pesadilla.
- **El final y el perfil** muestran la **más baja jugada** en esa partida ("Difícil → Normal"). Es un dato, no un castigo.
  **¿Lo apruebas así?**

## 6. Telemetría

En el entorno de cada sesión: `dificultad` y `compilacion` (versión de `package.json` + los 7 primeros caracteres del
commit). Además, un evento `dificultad` {de, a, motivo: `ajustes` | `oferta`}.
- **Compilación**: Vercel ya expone `VERCEL_GIT_COMMIT_SHA` al compilar. Se inyecta con `define` en `vite.config`, sin
  `vercel.json` ni dependencias. Si no está, dice `local`. Al entregar ese paso reviso un preview: si el preview dice
  `local`, aviso para revisar la configuración de Vercel.
- **Sesiones**: suben a v2 con migración; las viejas quedan como `normal` / `desconocida`.

## 7. Accesibilidad: qué entra ahora y qué queda para A3

- **Entra (en Ajustes, sin castigo e independiente de la dificultad)**:
  - **Modo sin sustos fuertes**: la cara y el grito de la muerte y del final se cambian por un fundido con el grito apagado.
  - **Ayuda visual del aire**: el borde de la pantalla late cuando queda menos del 25 % de aire, y un subtítulo avisa antes del jadeo.
- **No entra como opción aparte**: la **sensibilidad al ruido**. Ya es el "oído" de la tabla; dos perillas para lo mismo
  confundirían. Si los probadores lo piden, va a A3.
- **Queda en A3**: el HUD oculto solo con `opacity` (lector de pantalla), el tamaño del texto y el remapeo de controles.

## 8. Pasos (un commit cada uno; Juego.ts no crece)

1. Tabla, `ctx.dificultad`, foto de Normal y golden master. Es un refactor sin cambio de comportamiento.
2. Puntos de control por dificultad y Pesadilla.
3. Pantalla de selección, Ajustes y ajustes v2 (la partida v4 ya llegó en el paso 2).
4. Oferta de bajar, telemetría y versión de compilación.
5. Las dos opciones de accesibilidad.

En Juego.ts, cablear la dificultad suma ~10 líneas. Lo compenso mudando `registrarInicioTelemetria` (18 líneas) a
Telemetria, que es donde pertenece.

## Decisiones del dueño (aprobación)

1. Pesadilla no guarda ni borra (un solo hueco de guardado); al elegirla se avisa.
2. El final y el perfil muestran la dificultad **más baja jugada**: sí.
3. La sensibilidad al ruido no es una opción aparte (es el "oído"): sí.
4. El indicador del aire se oculta en Difícil y Pesadilla, y la opción de accesibilidad lo devuelve: sí.
5. El golden master y la foto de Normal salen de `gate1-congelado`, no del sprint-4.
6. La oferta de bajar sube un escalón a la vez: Difícil → Normal, Normal → Historia.
7. Versión de compilación: `local` si falta `VERCEL_GIT_COMMIT_SHA`, y se avisa.
