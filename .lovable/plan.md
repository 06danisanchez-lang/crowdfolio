

## Ajustes finales — Inversiones Futuras

### A. Estados finales derivados

| Estado | Condición | Badge variant |
|---|---|---|
| Abre hoy | `days === 0` | destructive |
| Abre pronto | `1 <= days <= 7` | default |
| Pendiente | `days > 7` | secondary |
| Sin fecha | `estimatedOpenDate` es null | outline |
| Revisar | `days < 0` (fecha pasada) | destructive |

"Revisar" sustituye a "Ya abierta". Semánticamente indica que la oportunidad requiere acción del usuario: invertir, descartar o actualizar la fecha.

Ordenación por urgencia:
1. Abre hoy
2. Revisar (fecha pasada, más reciente primero)
3. Abre pronto (1-7d, ascendente)
4. Pendiente (>7d, ascendente)
5. Sin fecha

### B. Filtros finales

Misma lista en desktop y móvil (en móvil como chips horizontales con scroll):

| Filtro | Muestra |
|---|---|
| Todas | Todo |
| Abre hoy | `days === 0` |
| Abre pronto | `1-7 días` |
| Sin fecha | Sin `estimatedOpenDate` |
| Revisar | `days < 0` |

No añado filtro "Pendientes" separado. "Todas" ya las incluye, y un filtro para >7 días no es lo suficientemente accionable como para justificar un chip propio.

### C. Orden final móvil

1. Header (título + botón añadir)
2. 4 KPIs (grid 2x2)
3. Filtros rápidos (chips scroll horizontal)
4. Banner de atención (si hay items "Abre hoy" o "Revisar")
5. Lista principal priorizada

### D. Regla para Capital planificado

- Si **todas** las oportunidades tienen `estimatedAmount` → mostrar solo la cifra.
- Si **alguna** no tiene `estimatedAmount` → subtítulo visible: `"Sobre X de Y oportunidades"` / `"Based on X of Y opportunities"`, donde X = las que tienen importe.
- Si **ninguna** tiene `estimatedAmount` → mostrar `0 €` con subtítulo `"Sin importes registrados"` / `"No amounts recorded"`.

