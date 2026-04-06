

## Notificaciones de inversiones futuras — 3 puntos cerrados

### 1. Regla para "Ya abierta"

La fase "ya abierta" se muestra durante **48 horas** desde la fecha/hora de apertura. Pasadas 48h, el recordatorio desaparece automáticamente de la campana sin intervención del usuario.

Justificación: 24h es poco si el usuario no abre la app a diario; 48h da margen sin acumular ruido.

### 2. Umbrales temporales exactos

**Inversión con fecha + hora exacta:**

| Fase | Condición | Mensaje |
|---|---|---|
| 7d | 2 días < restante ≤ 7 días | "Abre en X días" |
| 2d | 1 hora < restante ≤ 2 días | "Abre en X días" / "Abre mañana" |
| 1h | 0 < restante ≤ 1 hora | "Abre en menos de 1 hora" |
| open | 0 ≥ restante > -48h | "Ya abierta" |
| (nada) | restante ≤ -48h | Sin recordatorio |

**Inversión con solo fecha (sin hora):**

Se trata como si la hora fuera 00:00 del día indicado.

| Fase | Condición | Mensaje |
|---|---|---|
| 7d | 2 días < restante ≤ 7 días | "Abre en X días" |
| 2d | 0 < restante ≤ 2 días | "Abre en X días" / "Abre mañana" |
| today | día actual = día de apertura | "Abre hoy" |
| open | fecha pasada, dentro de 48h | "Ya abierta" |
| (nada) | fecha pasada > 48h | Sin recordatorio |

La fase "1h" no existe para inversiones sin hora. En su lugar se usa "Abre hoy".

Solo se muestra **una fase por inversión**: la más actual.

### 3. NotificationBell.tsx — reescritura interna

Se **mantiene el contenedor visual** (Popover + ScrollArea + campana con badge) pero se **reescribe toda la lógica interna**:

- Se elimina la dependencia de `useNotifications` (que consulta tabla `notifications` en BD).
- Se sustituye por `useFutureReminders` (derivado en cliente desde `futureInvestments`).
- Se elimina `markAsRead` / `markAllAsRead` → se reemplaza por `dismiss(futureInvestmentId)`.
- Se simplifica el renderizado de cada item: nombre de proyecto + mensaje de fase + botón descartar.

En la práctica es un componente nuevo con la misma cáscara visual. No hay riesgo de adaptación frágil porque no se reutiliza lógica del sistema anterior.

### Plan de implementación

**Crear (1):**
- `src/hooks/useFutureReminders.ts` — calcula fases, filtra descartados (localStorage), expone `reminders[]`, `activeCount`, `dismiss()`.

**Editar (2):**
- `src/components/layout/NotificationBell.tsx` — reescribir interior con `useFutureReminders`, mantener shell visual.
- `src/components/layout/AppLayout.tsx` — mover campana del sidebar a header bar en `<main>` (desktop).

**No se tocan:** `useNotifications.ts`, `FutureInvestmentList.tsx`, ninguna migración, ningún otro archivo.

**Total: 1 nuevo + 2 editados.**

