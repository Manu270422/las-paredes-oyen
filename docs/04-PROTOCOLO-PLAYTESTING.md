# Protocolo de playtesting — Fase 10

> Objetivo: convertir "a mí me dio miedo y cerré el juego" en datos repetibles.
> No preguntamos "¿te gustó?". Queremos saber **cuándo** tuvo miedo, **qué** lo causó,
> **cuándo dejó de tenerlo** y **qué muerte sintió injusta**.

---

## 1. Hipótesis que esta ronda debe confirmar o tumbar

| # | Hipótesis | Cómo la medimos | Se cae si… |
|---|---|---|---|
| H1 | La medición (6 s quieto) es el momento de más tensión | Reacciones fuertes y marcas F9 durante `medicion`; entrevista | Menos de 3/5 la mencionan como tensa |
| H2 | El jugador aprende las reglas de la criatura sin tutorial | Causas de muerte repetidas; entrevista ("¿qué la atrae?") | La misma causa mata 3+ veces a la misma persona |
| H3 | El encuentro de presencia (se detiene a 2.5 m y escucha) es memorable | `encuentros.superados`; entrevista (¿lo cuenta espontáneamente?) | Nadie lo menciona sin preguntar |
| H4 | La imitación de pasos genera duda ("¿fui yo?") | Reacciones a `imitacion-1/2/3`; entrevista | Nadie nota el eco o lo toma como un fallo técnico |
| H5 | Ninguna muerte se siente injusta | Entrevista; muertes por `desconocido` | Alguien dice "me mató porque sí" y la telemetría no muestra la causa |
| H6 | El primer miedo llega antes de los 3 minutos | `tiempoPrimerSusto`, `tiempoPrimeraReaccionFuerte` | Mediana > 180 s |
| H7 | La tensión sube y baja (no es plana ni constante) | `curva` (estrés y tensión cada 5 s) | Curva plana, o estrés > 0.7 durante más de 3 min seguidos |
| H8 | La cinta revela algo que el jugador entiende ("estaba ahí y no lo oí") | Eventos `cinta` con `presencia: true`; entrevista (pregunta 7b) | Nadie la menciona o nadie entiende que la línea "Tú no oíste nada" era real |
| H9 | En una persecución, el jugador sabe de dónde viene la criatura | Muertes con `motivo` de caza; entrevista (pregunta 8b) | Alguien dice "no sé de dónde salió" en una muerte por caza |

---

## 2. Preparación

**Equipo**
- Audífonos cerrados, **obligatorios**. El juego es audio 3D: sin audífonos la prueba no sirve.
- Habitación oscura o con poca luz. Brillo calibrado en Ajustes → Video (cuadro izquierdo casi invisible).
- Si es posible: grabar pantalla + audio del juego + la cara del probador (solo con su permiso).

**Enlace de prueba**
- Abrir el juego con `?telemetria=1` al final de la dirección, por ejemplo
  `http://192.168.1.10:5173/?telemetria=1`. Eso enciende la telemetría local en ese dispositivo.
- Alternativa: Ajustes → **Pruebas** → "Registrar sesiones de prueba".
- Empezar con **Nueva partida** (no "Continuar").

**Participantes (mínimo 5)**
- Mezcla recomendada: 2 que jueguen terror seguido, 2 que casi no jueguen, 1 que juegue en celular.
- Al menos 1 persona en móvil (táctil) y 1 con mando si lo tienes.

---

## 3. Qué decir (y qué NO decir)

**Antes de empezar** (leer tal cual):
> "Es un juego de terror en primera persona que se juega con los oídos. No te voy a explicar cómo funciona:
> quiero ver qué descubres solo. Puedes parar cuando quieras, sin dar explicaciones.
> No hay respuestas buenas ni malas: si algo no se entiende, el problema es del juego, no tuyo."

**Durante la partida**
- No hablar. No dar pistas. No reírse ni reaccionar a los sustos.
- **No** pedir que piense en voz alta: hablar le quita el miedo y cambia cómo juega.
- Si pregunta algo: "¿Qué crees tú?" y anotar la pregunta (es un dato).
- Si quiere parar: se para. Anotar el momento exacto (es el dato más valioso de todos).

**Marcas del observador (F9)**
Quien observa pulsa **F9** en el teclado del equipo de juego cuando el probador:
- salta, grita, se echa hacia atrás o se tapa la cara;
- se queda inmóvil más de 5 s sin razón aparente;
- dice algo en voz alta ("¿qué fue eso?").

Cada F9 queda anotado con el segundo exacto de juego y se cruza luego con los eventos.
En móvil no hay F9: anotar la hora a mano en la hoja.

---

## 4. Hoja de observación (una por probador, impresa o en el celular del observador)

> Regla de oro: anotar **lo que hizo**, no lo que creemos que sintió. "Se echó para atrás y dejó de caminar 8 s"
> sirve; "le dio miedo" no sirve.

### 4.1 Datos de la sesión (antes de empezar)

| Campo | Valor |
|---|---|
| Código del probador | P__ (sin nombre real) |
| Fecha y hora de inicio | |
| Dispositivo | PC / portátil / celular / tableta — modelo: |
| Entrada | teclado y ratón / mando / táctil |
| Audífonos | cerrados / abiertos / de botón — ¿bien puestos? sí / no |
| Luz de la habitación | oscura / penumbra / con luz |
| ¿Juega terror seguido? | nunca / a veces / seguido |
| ¿Ya conocía el juego? | no / vio videos / ya lo jugó |
| Enlace usado | ¿termina en `?telemetria=1`? sí / no |
| ¿Grabación con permiso? | pantalla / cara / voz / ninguna |

### 4.2 Escala de reacción (para no discutir después)

| Nivel | Qué se ve |
|---|---|
| **0** | Nada: sigue igual |
| **1** | Atención: se detiene, gira la cámara, se acerca a la pantalla |
| **2** | Sobresalto leve: respira fuerte, se echa atrás, dice algo ("¿qué fue eso?") |
| **3** | Susto fuerte: salta, grita, se tapa la cara, suelta el mouse o el celular |

Nivel 2 o 3 = pulsar **F9** (en PC). En celular, anotar la hora del reloj en la columna "Hora".

### 4.3 Línea de tiempo (llenar durante la partida)

| Hora | Min. de juego | Qué pasaba en el juego | Reacción (0–3) | ¿F9? | Lo que dijo (textual) |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

### 4.4 Momentos clave (marcar si ocurrió y cómo reaccionó)

| # | Momento | Hipótesis | ¿Ocurrió? | Min. | Reacción (0–3) | Qué hizo |
|---|---|---|---|---|---|---|
| 1 | Leyó la orden de trabajo en la escalera | — | sí / no | | | |
| 2 | Primera medición (401): los tres golpes mientras no se puede mover | H1 | sí / no | | | ¿se movió? ¿contuvo el aire? |
| 3 | Escuchó la cinta del 401 | H8 | sí / no | | | ¿leyó los subtítulos o los saltó? |
| 4 | La criatura se detuvo cerca a escuchar (encuentro) | H3 | sí / no | | | ¿contuvo el aire? ¿se movió? |
| 5 | Eco de sus pasos / un paso de más (imitación) | H4 | sí / no | | | ¿se giró? ¿paró? |
| 6 | Persecución (jadeo de la criatura detrás) | H9 | sí / no | | | ¿huyó hacia dónde? ¿cerró puertas? |
| 7 | Murió | H2, H5 | sí / no · cuántas veces: | | | causa en pantalla: |
| 8 | Medición del 403 | H1 | sí / no | | | |
| 9 | Apagón del pasillo (las lámparas revientan hacia él) | H7 | sí / no | | | |
| 10 | Llegó al 402 / al final | — | sí / no | | | |

### 4.5 Conducta observada (sí / no / no aplica)

| Pregunta | Respuesta | Minuto / nota |
|---|---|---|
| ¿Entendió solo que tenía que quedarse quieto para medir? | | ¿en qué intento? |
| ¿Contuvo la respiración alguna vez **sin** que el juego se lo pidiera? | | |
| ¿Se quedó sin aire (jadeo) por aguantar demasiado? | | ¿siguió apretando la tecla después? |
| ¿Caminaba pegado a las paredes? ¿Cambió eso en algún momento? | | |
| ¿Usó la grabadora como señuelo? ¿Volvió por ella? | | |
| ¿Usó "escuchar con atención"? | | |
| ¿Corrió? ¿Cuándo? | | |
| ¿Se atrincheró en un cuarto mucho tiempo? ¿Cuál? | | |
| ¿Qué zona evitó? ¿Volvió a algún cuarto sin necesidad? | | |
| ¿Se confundió de apartamento o no supo en cuál estaba? (p. ej., buscó la llave del 402 dentro del 402) | | cuál creía y cuál era; minuto |
| ¿Apagó la linterna a propósito? | | |
| ¿Pidió ayuda o preguntó algo? (anotar la pregunta textual) | | |
| ¿Quiso abandonar? ¿Abandonó? | | minuto exacto y qué acababa de pasar |

### 4.6 Solo en celular o tableta

| Pregunta | Respuesta |
|---|---|
| ¿Encontró los botones (contener aire, escuchar, linterna) sin ayuda? | |
| ¿Algún botón le tapó algo importante o lo pulsó sin querer? | |
| ¿Giró el teléfono a vertical? ¿Entendió el aviso? | |
| ¿El celular se calentó o el juego se puso lento? ¿En qué momento? | |
| FPS que mostró el juego (Ajustes → Video → mostrar FPS), si se activó | |

### 4.7 Cierre de la sesión (el observador, justo al terminar)

| Campo | Valor |
|---|---|
| Duración total (reloj) | |
| ¿Terminó el juego? | sí / no — si no, ¿dónde paró y por qué? |
| Archivo exportado | `P__-dispositivo-AAAA-MM-DD.json` |
| Momento de más miedo según lo observado | |
| Muerte que pareció injusta (según lo observado) | |
| Algo que pareció un error técnico | |

### 4.8 Resumen de la ronda (llenar al final, con los 5 o más)

Marcar ✓ si la hipótesis se sostuvo con esa persona, ✗ si se cayó, — si no aplica. Una hipótesis se **cae** si
cumple la condición de la columna "Se cae si…" de la sección 1.

| Hipótesis | P1 | P2 | P3 | P4 | P5 | ¿Se sostiene? |
|---|---|---|---|---|---|---|
| H1 Medición = máxima tensión | | | | | | |
| H2 Aprende las reglas sin tutorial | | | | | | |
| H3 El encuentro es memorable | | | | | | |
| H4 La imitación genera duda | | | | | | |
| H5 Ninguna muerte injusta | | | | | | |
| H6 Primer miedo antes de 3 min | | | | | | |
| H7 La tensión sube y baja | | | | | | |
| H8 La cinta revela algo que entiende | | | | | | |
| H9 Sabe de dónde viene en la persecución | | | | | | |

**Gate 1 cumplido** cuando: 5 o más personas, al menos 1 en celular, cada una con su JSON y su hoja.
Se entregan juntos: los `.json`, estas hojas y las notas de la entrevista.

---

## 5. Entrevista posterior (10–15 min, grabada si acepta)

Hacerla **justo al terminar**, con las luces aún bajas. Preguntas abiertas, en este orden:

1. Cuéntame qué pasó, como se lo contarías a un amigo. *(No interrumpir. Anotar qué cuenta primero: es lo memorable.)*
2. ¿Cuál fue el primer momento en que sentiste miedo de verdad?
3. ¿Hubo un momento en que dejaste de tener miedo? ¿Por qué?
4. ¿Hubo algún susto que viste venir? ¿Cómo lo supiste?
5. ¿Qué sonido te hizo reaccionar más?
6. ¿Qué crees que atrae a la criatura? ¿Qué la aleja? *(Mide si aprendió las reglas.)*
7. ¿Alguna vez escuchaste pasos que no eran tuyos? ¿Cuándo empezaste a dudar?
   - 7b. Cuando escuchaste la grabación de una medición, ¿qué había en ella? ¿Crees que eso pasó de verdad? *(H8)*
8. Si moriste: ¿sabes por qué? ¿Te pareció justo? *(Comparar con la causa en la telemetría.)*
   - 8b. Si te persiguió: ¿sabías por dónde venía? ¿Cómo lo sabías? *(H9)*
9. ¿Hubo algo que no entendiste? ¿Algo que pasó y no sabes si fue real o un error?
   - 9b. ¿Supiste siempre en qué apartamento estabas? ¿Te equivocaste de puerta alguna vez? *(Orientación: la versión del Gate 1 no tiene placas con números; sirve para comparar cuando las tenga.)*
10. ¿Qué lugar te pareció seguro? ¿Cuál evitaste?
11. ¿En algún momento quisiste dejar de jugar?
12. De todo lo que hiciste en el juego, ¿qué recuerdas más?

---

## 6. Exportar y nombrar los datos

1. Al terminar, en la pantalla final: **"Exportar registro de la prueba"**.
   Si murió y salió, o cerró antes: Ajustes → Pruebas → **Exportar (.json)** (exporta todas).
2. Renombrar el archivo: `P1-pc-2026-10-02.json`, `P2-movil-…` (P = probador, sin nombres reales).
3. Guardar junto con la hoja de observación y las notas de la entrevista.
4. Después de exportar, **Borrar** los registros del dispositivo si no es el tuyo.

**Qué se guarda:** tiempos de juego, eventos (mediciones, muertes y su causa, eventos del director,
reacciones), una muestra cada 5 s (estrés, tensión, cuarto, distancia a la criatura, FPS),
contadores de estilo (segundos agachado, corriendo, conteniendo el aire…) y el tipo de equipo
(táctil/PC, calidad, proporción de pantalla). **Nada personal y nada sale del dispositivo** si no se exporta.

---

## 7. Cómo leer la telemetría

Cada sesión trae un bloque `resumen`. Lo primero que hay que mirar:

| Métrica | Qué buscar | Alarma |
|---|---|---|
| `tiempoPrimerSusto` / `tiempoPrimeraReaccionFuerte` | Mediana entre 60 y 180 s | > 180 s: el inicio es lento |
| `causasMuerte` | Variedad de causas | Muchas `presencia`: la regla no se entiende. `desconocido`: bug |
| `encuentros` (iniciados / superados / fallidos) | Algunos superados | 0 superados en todos: la ventana es demasiado dura |
| `motivosCancelacion` | Sobre todo `movimiento` al principio | Mucha `respiracion` tras varios intentos: la pista no se entiende |
| `eventosNoVistos` vs `eventosVistos` | Los cambios de puertas/muebles se ven a veces | > 70 % no vistos: esos eventos no están trabajando |
| `reaccionesFuertes / reaccionesTotales` por estímulo | Qué eventos sí asustan | Evento que nunca produce reacción: candidato a cambiar |
| `regresos` | Algún regreso | Muchos regresos al mismo cuarto: posible zona "segura" a cuestionar |
| `curva` (estrés en el tiempo) | Olas: sube, baja, sube más | Plana (aburrimiento) o siempre alta (fatiga) |
| `contadores` (`segundos-corriendo`, `ruido:paso-pared`…) | Estilo de juego | Mucho `paso-pared` sin muertes: la regla central no pesa lo suficiente |
| `fpsMedio` | ≥ 45 en PC, ≥ 30 en móvil | Por debajo: revisar perfil de calidad de ese equipo |

Cruzar siempre con las marcas F9 (`marca-observador`): una marca sin evento del juego cerca
significa que el miedo vino de algo que el sistema no registra (¿la imaginación? ¡bien!).

---

## 8. Qué ajustar según lo que salga

| Si pasa esto… | Ajustar primero | Dónde |
|---|---|---|
| El primer susto tarda mucho | Duración de la fase de calma | `director/DirectorTerror.ts` → `DURACION.calma` |
| Muere mucho por respirar | Duración del encuentro / gracia de inhalación | `ia/estados/EstadoInvestigando.ts` |
| Nadie nota la imitación | Volumen/retraso del eco, etapa inicial | `ia/Imitador.ts` |
| La criatura "no está nunca" | Umbrales de audición | `config/ConfiguracionJuego.ts` → `entidad` |
| Se siente perseguido todo el tiempo | Fase pico y velocidad de caza | `DirectorTerror.ts`, `ConfiguracionJuego.ts` |
| Mediciones imposibles | Tolerancia de ruido | `jugador/Grabadora.ts` → `TOLERANCIA_RUIDO` |

**Regla:** cambiar **una cosa a la vez** entre rondas y anotar qué se cambió. Si no, no sabremos qué funcionó.

---

## 9. Cuidado con las personas

- Advertir antes: contenido de terror, sonidos fuertes repentinos, destellos (se pueden reducir en Accesibilidad).
- La persona puede parar en cualquier momento. Parar es un dato, no un fracaso.
- Pedir permiso explícito para grabar la cara o la voz. Sin permiso, solo notas.
- No probar con menores de edad.
