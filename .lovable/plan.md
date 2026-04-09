

## Ajuste UX: Sección pendientes siempre visible + badge sidebar

### Archivos a tocar (3)

**1. `src/components/investments/InvestmentList.tsx`**
- Eliminar la condición `{incompleteInvestments.length > 0 &&` (línea 162) para que el bloque se renderice siempre
- Eliminar el marcador TEST-PENDING-SECTION (línea 164)
- Cambiar el título para incluir el count inline: `Pendientes de completar (N)`
- Si `incompleteInvestments.length === 0`, mostrar un mensaje vacío sobrio: "No tienes inversiones pendientes de completar." en lugar de la lista

**2. `src/components/layout/AppLayout.tsx`**
- El badge ya existe y funciona (líneas 117-121), solo confirmar que sigue con `incompleteCount > 0`
- Ya usa la misma fuente de datos pasada como prop desde Index.tsx — no hay cambio aquí

**3. `src/lib/i18n/translations.ts`**
- Añadir clave `investments.incomplete.empty` con:
  - ES: `'No tienes inversiones pendientes de completar.'`
  - EN: `'You have no pending investments to complete.'`

### Resumen visual

- Sección siempre visible con título `Pendientes de completar (N)`
- Estado vacío con mensaje sobrio cuando N = 0
- Badge sidebar naranja cuando N > 0 (ya implementado)
- Misma fuente de datos para ambos (ya implementado via prop desde Index.tsx)
- Sin cambio de arquitectura

