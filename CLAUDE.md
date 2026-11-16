# Las Paredes Oyen

Juego de terror en primera persona desarrollado con TypeScript, Three.js/WebGL 2 y Web Audio API, sin utilizar un motor comercial. Es un proyecto propio del creador y su objetivo a largo plazo es publicarlo en Google Play Store.

## 1. Contexto y continuidad del proyecto

**Al empezar cualquier sesión, lee [`docs/05-ESTADO-DEL-PROYECTO.md`](docs/05-ESTADO-DEL-PROYECTO.md).** Este documento contiene el estado actual del proyecto, los avances realizados, las tareas pendientes, las decisiones por tomar y los pasos siguientes.

El creador puede cambiar de computador y no debería tener que explicar nuevamente el contexto del proyecto en cada sesión.

Antes de comenzar a trabajar, identifica las prioridades, las restricciones y las decisiones anteriores que sean relevantes para la tarea solicitada.

**Al terminar una sesión de trabajo, actualiza la bitácora** en `docs/05-ESTADO-DEL-PROYECTO.md` y los demás documentos que hayan quedado desactualizados. Registra los cambios realizados, las pruebas ejecutadas, sus resultados, los problemas encontrados y los próximos pasos. No marques como completada una tarea que no hayas verificado.

## 2. Comunicación y forma de trabajo

- Responde siempre en español, con claridad, franqueza y precisión. El creador prefiere conocer la situación real, incluidos los errores, riesgos, limitaciones y problemas pendientes.
- Explica las decisiones técnicas importantes con un lenguaje comprensible, sin ocultar información relevante ni afirmar que algo funciona sin haberlo comprobado.
- Prioriza la estabilidad, la experiencia del jugador, la accesibilidad, el rendimiento y la calidad técnica.
- Antes de modificar sistemas existentes, revisa su implementación y las pruebas relacionadas. Evita reemplazar o eliminar funcionalidades sin comprender sus dependencias.
- Respeta las decisiones de diseño ya documentadas. Si detectas una contradicción o consideras necesario cambiar una decisión importante, explica el motivo antes de modificarla.
- No afirmes que una prueba pasó, una funcionalidad se completó o un despliegue tuvo éxito sin contar con resultados que lo demuestren.
- No amplíes innecesariamente el alcance de una tarea ni realices cambios destructivos que no sean necesarios para cumplirla.

## 3. Reglas de Git y protección del proyecto

El repositorio local del proyecto se encuentra en:

`D:\JuegoDeTerror`

Cuando sea necesario resolver restricciones de `safe.directory` en Git, utiliza el formato correspondiente a este repositorio:

`git -c safe.directory=D:/JuegoDeTerror ...`

Antes de ejecutar operaciones importantes, comprueba la rama activa, el estado del directorio de trabajo y las referencias remotas pertinentes.

### Ramas y publicación

- El sitio público se publica desde `origin/main`.
- El trabajo de desarrollo habitual se realiza en `sprint-4`.
- **No hagas merge a `main` sin preguntarle primero al creador y obtener su autorización expresa.**
- No publiques cambios ni reescribas el historial remoto sin autorización expresa del creador.
- No elimines ramas, etiquetas, respaldos ni referencias existentes sin comprobar antes sus consecuencias.
- Antes de una operación que pueda reescribir o eliminar historial, verifica que exista un respaldo válido y que las referencias remotas no hayan cambiado inesperadamente.
- No ejecutes operaciones destructivas como `git reset --hard`, ni utilices `git push --force`, ni reescribas commits existentes sin autorización expresa del creador.
- Cuando una operación autorizada requiera actualizar una rama remota mediante un push forzado, prefiere `--force-with-lease` y comprueba que los cambios remotos no se sobrescriban inesperadamente.

### Autoría e identidad de Git

**La autoría de los commits debe corresponder a la identidad configurada por el creador en Git.**

- Conserva el `user.name` y el `user.email` configurados para el creador. No los cambies automáticamente.
- Al crear commits, no añadas líneas de atribución automática de Claude, como `Co-Authored-By: Claude`, `Claude-Session:` o `Generated with Claude Code`.
- No incluyas firmas, enlaces de sesión ni menciones de atribución de Claude en los mensajes de commit o en las descripciones de los pull requests, salvo que el creador lo solicite expresamente.
- Respeta la configuración de atribución de Claude Code definida en los archivos de configuración correspondientes, incluido `%USERPROFILE%\.claude\settings.json`.
- No inventes, sustituyas ni modifiques los campos de autor o responsable de registro para alterar artificialmente la identidad de un commit.
- Antes de registrar un commit, revisa su mensaje para comprobar que no contenga atribuciones automáticas de Claude.
- Si Claude Code o alguna otra herramienta añade una atribución a pesar de la configuración, detente y corrige el origen del problema antes de publicar el commit. No ocultes el incidente ni reescribas commits ya publicados sin autorización expresa.
- **No reescribas commits existentes para cambiar mensajes, autores, responsables de registro o atribuciones, salvo que el creador lo solicite expresamente.**
- Una instrucción de este archivo no sustituye la configuración de Claude Code ni garantiza por sí sola su comportamiento. Si la herramienta ignora estas reglas, comprueba su configuración efectiva y el mensaje generado antes de continuar.

## 4. Pruebas y verificación

Las pruebas rápidas se ejecutan mediante:

```bash
npm run test:rapido
```

Su duración habitual es de aproximadamente 10 segundos, aunque depende del entorno.

La batería completa se ejecuta mediante:

```bash
npm test
```

Su duración puede rondar los 27 minutos e incluye recorridos caminando por el juego real.

- Ejecuta las pruebas adecuadas al alcance del cambio.
- Después de modificar sistemas críticos, revisa los resultados de las pruebas y de la compilación.
- No sustituyas las pruebas del juego real por pruebas simuladas cuando sea necesario comprobar el comportamiento durante una partida.
- Informa de las pruebas ejecutadas, las que pasaron, las que fallaron y las que quedaron pendientes.
- Si una prueba falla por un problema ajeno al cambio realizado, documenta la evidencia y evita atribuir el fallo al código nuevo sin investigarlo.
- No elimines, debilites ni omitas pruebas para conseguir una ejecución satisfactoria artificialmente.
- Antes de dar por finalizado un cambio, verifica que no introduzca regresiones en las funcionalidades relacionadas.

## 5. Pruebas con jugadores y telemetría

Los resultados, registros e informes de las pruebas con jugadores se encuentran en `docs/pruebas/`.

- Revisa los informes anteriores cuando sean relevantes para la tarea.
- Distingue entre resultados automatizados y resultados obtenidos con personas que juegan.
- No presentes una muestra pequeña de participantes como prueba concluyente de la calidad o dificultad del juego.
- Mantén las conclusiones vinculadas a los datos observados y documenta las limitaciones de cada prueba.
- Conserva la privacidad de los participantes y respeta el funcionamiento local y opcional de la telemetría.
- Cuando se modifique el sistema de pruebas, actualiza la documentación correspondiente y registra las diferencias relevantes respecto de las sesiones anteriores.

## 6. Criterios para finalizar una tarea

Antes de considerar terminada una tarea:

1. Comprueba que los cambios solicitados estén implementados.
2. Ejecuta las verificaciones y pruebas apropiadas.
3. Revisa los posibles efectos secundarios y las funcionalidades relacionadas.
4. Confirma que no se hayan introducido cambios no solicitados.
5. Actualiza la documentación y la bitácora cuando corresponda.
6. Resume lo que se modificó, las pruebas realizadas, los resultados reales y los asuntos que todavía están pendientes.
7. Si se creó un commit, verifica su mensaje y su identidad de autoría antes de publicarlo.

**Regla fundamental:** la estabilidad del proyecto, la integridad del historial de Git y la autoría configurada por el creador deben preservarse durante todo el proceso de desarrollo.