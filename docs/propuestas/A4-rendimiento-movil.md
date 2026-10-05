# A4 — Rendimiento en móvil: lista de cosas por medir (propuesta)

Objetivo de A4 (del Sprint 3): definir un presupuesto (fps objetivo, memoria) y medirlo en un celular real de gama media,
sin maquillar los números. **Todavía no se ejecuta**: depende de que haya un celular a mano.

## Lista

| # | Qué | Origen | Estado |
|---|---|---|---|
| 1 | **INP de 281 ms** por un manejador de eventos en `body` | Aviso "INP Issue" en la barra de Vercel del preview de `sprint-4` (2026-10-04) | **Sin investigar a propósito.** Primero saber si viene del juego o de la propia barra de Vercel (solo aparece en previews). Medir con la barra apagada y con Chrome DevTools → Performance (Interaction to Next Paint) |
| 2 | Presupuesto de fps y memoria | Definición de A4 | Por definir con el modelo de celular elegido |
| 3 | Fps y calor tras 15 min jugando, en calidad `auto` | Definición de A4 | Por medir |
| 4 | Memoria del audio sintetizado (39 sonidos con variantes, generados al cargar) y tiempo de carga en celular | Sprint 2 | Por medir |
| 5 | Tiempo de carga con el audio real (cuando exista `manifiesto.json` con grabaciones) | Fase 12 | Después |

## Datos que debe traer cada medición

Modelo del celular, navegador y versión, calidad elegida por `auto`, fps medio y mínimo, memoria, temperatura al final,
y si hubo tirones (y en qué momento del juego). Se anota tal cual, sin redondear a favor.
