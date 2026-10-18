# Guía A4 — medir el juego en un celular real

> Para el amigo que presta el celular (la parte 1) y para el creador (la parte 2). Preparada el 2026-10-17.
> Es la medición que pide [A4](../propuestas/A4-rendimiento-movil.md) y la condición para hacer la calle de
> [C3](../propuestas/C3-salir-a-la-calle.md). **No es una prueba de miedo**: importa cómo corre el juego, no si da
> susto. Se puede pausar cuando haga falta.

## Parte 1 — para quien presta el celular (unos 25 minutos)

### Antes de empezar
1. **Batería en 80 % o más, y sin el cargador puesto** (cargando, el celular se calienta y la medición no sirve).
2. Cierra las otras aplicaciones. Brillo de la pantalla como lo usas siempre.
3. Si tienes audífonos, úsalos (el sonido 3D también gasta).
4. Anota **el modelo del celular** (Ajustes → Acerca del teléfono), **la versión de Android o iOS** y **el
   navegador** (Chrome, Samsung Internet, Safari…) con su versión.
5. Anota **la batería al empezar** (%).

### La carga
6. Ten a mano un cronómetro (el del reloj o de otro celular).
7. Abre este enlace y **arranca el cronómetro en el mismo momento**:
   `https://almendros.elmundodemanu.com/?telemetria=1`
8. Pon el celular **horizontal**. **Para el cronómetro** cuando aparezca "Este juego se escucha. Usa audífonos." y
   anota los segundos.
9. Toca para continuar. **No cambies la calidad gráfica** (déjala en "Auto").

### Jugar 15 minutos
10. **Nueva partida → Normal → Empezar.** Juega como jugarías normalmente, unos 15 minutos.
11. Cada vez que el juego **se trabe** (se congela un momento, va a saltos, el sonido se corta) o **la imagen se ponga
    borrosa**, anota **la hora** y **qué estaba pasando** ("bajando la escalera", "en el ascensor", "cuando apareció
    ella"…). Si hace falta, pausa para anotar.

### Al terminar
12. **Toca la parte de atrás del celular** y anota qué tan caliente está: 1 frío · 2 tibio · 3 caliente · 4 muy
    caliente (molesta). Anota **la batería al terminar** (%).
13. Toca el **botón de pausa** de la pantalla (el de las dos rayas) → **"Exportar registro de la prueba"**. Se
    descarga un archivo que empieza por `las-paredes-oyen-prueba-`. (Si no aparece el botón: Ajustes → Pruebas →
    "Exportar (.json)".)
14. Busca el archivo: en Android, la aplicación **Archivos** (en Samsung, **Mis archivos**) **→ Descargas**; en
    iPhone, **Archivos → Descargas** (o "En mi iPhone"). Si el navegador pregunta si quieres descargarlo, di que sí.
15. **Mándalo por WhatsApp como documento** (📎 → Documento, no como foto), junto con lo que anotaste (la plantilla
    de abajo).
16. Opcional, para dejar el celular como estaba: Ajustes → Pruebas → **Borrar**, y abre una vez
    `https://almendros.elmundodemanu.com/?telemetria=0` (apaga la telemetría).

El archivo solo tiene datos del juego (cuánto se jugó, los fps, qué pasó en la partida). Nada personal, y nada sale del
celular si no lo mandas tú.

### La plantilla (copiar, llenar y mandar con el archivo)

```
A4 — medición en celular
Modelo:
Android / iOS (versión):
Navegador (y versión):
Batería al empezar: ___ %   al terminar: ___ %
¿Cargando mientras jugaba?: no / sí
Audífonos: sí / no
Carga (del enlace a "Este juego se escucha"): ___ s
Minutos jugados:
Hasta dónde llegó (piso):
Tirones (hora y qué pasaba):
¿Imagen borrosa en algún momento? (hora):
Calor al final (1 frío · 2 tibio · 3 caliente · 4 muy caliente):
¿Algo más? (sonido que se corta, controles lentos, se cerró solo…):
```

## Parte 2 — para el creador

- **Cuándo**: con la versión publicada en el sitio (la que diga `entorno.compilacion` en el archivo). Si mientras
  tanto publicas otra versión, se nota ahí.
- **Qué celular**: mejor uno de **gama media** que uno de gama alta (en uno de gama alta casi todo corre bien y no
  nos dice dónde está el límite). Uno solo es un dato, no una conclusión; dos o tres, mejor.
- **Lo que hago yo con el archivo**:
  - la **calidad que eligió "Auto"** (`entorno.calidad`) y si hubo audio 3D (`entorno.hrtf`);
  - los **fps cada 5 s** (`curva`), con **el cuarto** donde estaba y lo que hacía ella: el medio, el peor tramo y
    dónde cae (escalera, ascensor, cambio de piso, vestíbulo del Piso 1);
  - cruzo las horas de sus tirones con la curva.
- **Límites que hay que saber**: el registro **no ve los tirones de más de medio segundo** (esos cuadros no entran en
  la cuenta de fps), **ni el calor, ni la batería, ni el modelo**: por eso los anota la persona. Tampoco ve si la
  resolución bajó sola (el juego la baja si caen los fps): por eso se pregunta si la imagen se vio borrosa. La memoria
  necesita un computador con cable (Chrome → `chrome://inspect`): queda para después.
- **El presupuesto que propongo** (A4, punto 2, para que lo decidas con los números en la mano): en "Auto", **30 fps
  o más de media**, **ningún tramo de 5 s por debajo de 20**, ningún tirón de más de un segundo fuera de los cambios de
  piso, y que el celular no llegue a "muy caliente" en 15 minutos. La calle de C3 no podría quitarle más de ~10 % a
  esos fps.
