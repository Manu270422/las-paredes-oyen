# A1 — Un piso = paquete de datos + guion opcional (propuesta, sin implementar)

**Objetivo:** agregar un piso o una variante (B1) = agregar una carpeta en `src/pisos/`, sin tocar `Juego.ts` ni los sistemas.

## Formato del manifiesto

```ts
// src/pisos/TiposPiso.ts
interface PaquetePiso {
  id: string;                                   // 'piso4' — se guarda en la partida
  tarjeta: { titulo: string; subtitulo: string };
  mapa: DefMapa;                                // igual que hoy: rejilla, cuartos, puertas, luces, muebles, interactuables, puntos, guarida
  objetivos: readonly Objetivo[];
  documentos: Record<string, Documento>;
  transcripciones: Record<string, LineaTranscripcion[]>;
  puntoInicial: string;                         // 'escalera'
  puntosControl: Record<string, string>;        // bandera → punto (hoy PUNTOS_CONTROL en Juego.ts)
  reglas: {
    despiertaCon: string;                       // 'medido:401': la criatura sale y el señuelo se activa
    imitacionCompletaCon: string;               // 'medido:403': imitación etapa 3
    luzPorBandera: Record<string, { circuitos?: Record<string, EstadoLampara>; lamparas?: Record<string, EstadoLampara> }>;
    eventosPermitidos?: readonly string[];      // si falta: todo el catálogo
  };
  menu: { camara: { x: number; y: number; angulo: number }; figura: { x: number; y: number } };
  guion?: () => GuionPiso;                      // opcional: lo que no es dato
}
interface GuionPiso { conectar(ctx, acciones): void; reiniciar(ctx): void; actualizar(dt, ctx): void }
```

**TypeScript en lugar de JSON:** el compilador valida `IdSonido`, `TipoMueble` y los ids, no hace falta código de carga
y el bundle solo incluye lo que se usa. Los datos siguen siendo **datos puros** (sin funciones) salvo `guion`. Pasar a JSON
(mods, contenido remoto) se puede hacer después sin cambiar el formato.

## Qué es dato y qué es guion

| Dato (manifiesto) | Guion (código del piso) | Motor (no cambia) |
|---|---|---|
| Mapa, cuartos, puertas, luces, muebles, objetos | Tres golpes en la primera medición | Jugador, IA, director, audio, render |
| Objetivos, documentos, texto de las cintas | Reproducir la cinta y despertar a la criatura | Grabadora y captura (segunda realidad) |
| Puntos de control y su bandera | Apagón del pasillo (luces que revientan hacia ti) | Guardado, telemetría, UI |
| Qué bandera despierta a la criatura / sube la imitación | Secuencia final del 402 | Catálogo de eventos del director |
| Luces que cambian con una bandera (tablero, apagón) | Pistas de tutorial con su momento | |
| Cámara y figura del menú, tarjeta de lugar | | |

Lo que queda **fuera** de A1: cambiar de piso en plena partida (escaleras entre pisos) y reglas de la criatura por piso.
Las dos llegan cuando haya un segundo paquete (Fase C) o variantes (B1), y el formato ya les deja lugar.

## Migración del Piso 4 en 8 pasos pequeños

Cada paso: `npm test` en verde (recorrido caminando + caso del jadeo + guardado), 0 errores de consola, un commit.

1. `TiposPiso.ts` y `pisos/piso4/index.ts`, que **reexporta** lo que ya existe. `Juego.ts` recibe el paquete en lugar de
   `MAPA_PISO_4`. Sin cambio de comportamiento.
2. Puntos de control, punto inicial y cámara del menú pasan al paquete (salen de `Juego.ts`).
3. `ctx.piso` en el contexto. Objetivos, documentos y transcripciones se leen desde ahí (Progreso, lector, Documento).
4. Luces por bandera como datos (`Nivel.restablecer` deja de nombrar `lampara402` y `pasillo*`).
5. `despiertaCon` e `imitacionCompletaCon` reemplazan `'medido:401'` y `'medido:403'` en Juego, Grabadora, Acechando,
   PasosEco y los `requiere` de 2 eventos. `RadioEncendida` usa el cuarto de la radio en lugar de `'sala401'`.
6. `Guion.ts` + `SecuenciaFinal.ts` pasan a `pisos/piso4/guion.ts` (implementa `GuionPiso`).
7. Partida v2 con `piso: 'piso4'`: primera migración real con el cargador de A2 (v1 → v2), probada con una partida v1.
8. Mover físicamente `MapaPiso4`, `Objetivos`, `Documentos` y `Transcripciones` a `pisos/piso4/` y borrar las rutas viejas.

**Prueba nueva que lo protege:** una prueba unitaria que falla si algún archivo fuera de `src/pisos/` menciona `401`,
`402`, `403` o importa `pisos/piso4`. Así el motor no vuelve a llenarse de contenido.

## Riesgos

- El paso 6 es el más delicado (el guion toca mucho del contexto). Por eso va tarde, con todo lo demás ya estable.
- `DefInteractuable.objeto` es hoy la unión fija `'pilas' | 'llave_402'`: pasa a `string` y lo valida una prueba.
- `Nivel.puntoControl` cae en `'escalera'` si no encuentra el punto: pasará a `puntoInicial` del paquete.
