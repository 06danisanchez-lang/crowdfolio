
## Plan: Tres bloques en Inversiones + regla tracking_ready

### Decisión de naming (Ajuste 3)

**Opción B: renombrar a `tracking_ready`.**

Razón: `portfolio_ready` sugiere "datos mínimos para aparecer en cartera", pero la nueva regla significa "inversión suficientemente completa para que Crowdfolio la siga en el tiempo". El nombre `tracking_ready` refleja exactamente eso.

Cambios derivados:
- `completeness.ts`: `isPortfolioReady` → `isTrackingReady`, `isComplete` (alias) → apunta a `isTrackingReady`
- `useIncompleteCount.ts`: usa `isInvestmentComplete` (alias) — sin cambio en la interfaz pública
- Resto del código que usa `isPortfolioReady`: actualizar referencias

Se mantiene `isForecastReady` sin cambios (su semántica sigue siendo correcta).

---

### Orden de implementación

| Paso | Archivo(s) | Qué se hace |
|------|-----------|-------------|
| 1 | **Migración BD** | Quitar `DEFAULT 'bullet'` de `income_model`. Quitar `DEFAULT 'at_maturity'` de `principal_return_type`. |
| 2 | **`completeness.ts`** | Renombrar `isPortfolioReady` → `isTrackingReady`. Añadir `expectedReturn` y `expectedEndDate` como obligatorios. Mantener alias `isComplete` → `isTrackingReady`. Actualizar comentarios de cabecera. |
| 3 | **`translations.ts`** | Añadir todas las claves nuevas: sección "Finalizadas", campo `expectedEndDate` como faltante, mensajes de validación, labels de la nueva sección. Adelantado para evitar claves crudas en pasos posteriores. |
| 4 | **`InvestmentForm.tsx`** | Hacer `expectedEndDate` obligatorio en `investmentSchema`. Añadir al `fieldMap` del banner de error. |
| 5 | **`useIncompleteCount.ts`** | Añadir `expected_return` y `expected_end_date` al select y pasarlos a `isInvestmentComplete`. |
| 6A | **`useInvestments.ts` — Paso A: separación de arrays** | Derivar 3 arrays: `incompleteInvestments`, `activeInvestments`, `completedInvestments`. Exportarlos. Limpiar fallbacks `|| 'bullet'` y `|| 'at_maturity'`. NO tocar summary todavía. |
| 6B | **`useInvestments.ts` — Paso B: rehacer summary** | `activeSummary` usa solo `activeInvestments`. `historicalSummary` usa solo `completedInvestments`. Exportar `completedCount`. |
| 7 | **`useTaxSummary.ts`** | Limpiar fallbacks `|| 'bullet'`. Separar obtención de payments (todas las inversiones) de inversiones para proyección (solo tracking_ready + activas). |
| 8 | **`InvestmentList.tsx`** | Recibir `completedInvestments`. Añadir sección "Finalizadas" colapsable. Limpiar fallback `|| 'bullet'` en edición de drafts. |
| 9 | **`Index.tsx`** | Cablear `completedInvestments` desde `useInvestments`. Pasar a `InvestmentList`. Gráficos: distribución usa activas+completed, timeline solo activas. |

---

### Detalle por paso

#### Paso 1 — Migración BD
```sql
ALTER TABLE public.investments ALTER COLUMN income_model DROP DEFAULT;
ALTER TABLE public.investments ALTER COLUMN principal_return_type DROP DEFAULT;
```
Sin impacto funcional inmediato (el código ya inserta valores explícitos).

#### Paso 2 — completeness.ts
- Renombrar interfaz: `isPortfolioReady` → `isTrackingReady`
- Añadir checks: `expectedReturn == null` → missing, `!expectedEndDate` → missing
- `isComplete` sigue como alias de `isTrackingReady`
- `isForecastReady` sin cambios (ya depende de tracking_ready)
- Actualizar `isInvestmentComplete()` para usar `isTrackingReady`

#### Paso 3 — translations.ts (adelantado)
Claves nuevas ES/EN:
- `investments.section.finished` → Finalizadas / Finished
- `investments.section.finishedEmpty` → No hay inversiones finalizadas / No finished investments
- `investments.section.finishedDescription` → Inversiones que ya han completado su ciclo / Investments that completed their cycle
- `investments.field.expectedEndDate` → Fecha fin estimada / Expected end date
- `investments.field.expectedReturn` → Rentabilidad esperada / Expected return
- `investments.status.completed` → Finalizada / Finished (para badge)
- `investments.tracking.notReady` → Faltan datos para seguimiento / Missing tracking data

#### Paso 4 — InvestmentForm.tsx
- `investmentSchema`: `expectedEndDate` pasa de `.optional()` a `.min(1, ...)`
- `fieldMap`: añadir entrada para `investments.field.expectedEndDate`
- Sin otros cambios en el formulario

#### Paso 5 — useIncompleteCount.ts
- Select: añadir `expected_return, expected_end_date`
- Pasar ambos al check de `isInvestmentComplete`

#### Paso 6A — useInvestments.ts (separación)
- Tras mapear inversiones, derivar:
  - `incompleteInvestments`: `!isInvestmentComplete(inv)`
  - `completedInvestments`: `isInvestmentComplete(inv) && inv.status === 'completed'`
  - `activeInvestments`: `isInvestmentComplete(inv) && inv.status !== 'completed'`
- Exportar los 3 arrays
- Limpiar todos los `|| 'bullet'` y `|| 'at_maturity'` en addInvestment, updateInvestment, importInvestments, mapping
- NO tocar calculateSummary en este paso

#### Paso 6B — useInvestments.ts (summary)
- `activeSummary.capital`: suma de `activeInvestments` con `status === 'active'`
- `activeSummary.count`: count de activeInvestments
- `historicalSummary.totalInvested`: suma de `completedInvestments`
- `historicalSummary.totalCollected`: payments de `completedInvestments`
- `historicalSummary.completedCount`: count de `completedInvestments`

#### Paso 7 — useTaxSummary.ts
- Limpiar `|| 'bullet'` (líneas 85, 94)
- Payments: obtener de TODAS las inversiones del usuario (no solo completas)
- Proyección: solo de inversiones tracking_ready + activas

#### Paso 8 — InvestmentList.tsx
- Nueva prop: `completedInvestments`
- Nueva sección colapsable "Finalizadas" (misma estructura que "Pendientes")
- Orden visual: Pendientes → Activas → Finalizadas
- Limpiar `incomeModel: draft.incomeModel || 'bullet'` (línea 260)

#### Paso 9 — Index.tsx
- Destructurar `completedInvestments` de `useInvestments()`
- Pasar a `InvestmentList`
- `PlatformDistributionChart`: `[...activeInvestments, ...completedInvestments]`
- `InvestmentTimelineChart`: solo `activeInvestments`
- `UpcomingMaturityList`: solo `activeInvestments` (ya filtra por expectedEndDate)

---

### Riesgos

1. **Inversiones existentes sin expectedEndDate**: pasarán a "Pendientes". Cambio visible y deseado.
2. **Defaults en BD ya aplicados**: inversiones antiguas con `income_model = 'bullet'` por DEFAULT ya tienen el valor real en BD — no se pierden.
3. **Renaming isPortfolioReady → isTrackingReady**: hay que buscar todas las referencias. Si alguna se escapa, error de compilación (fácil de detectar).
4. **Payments de inversiones incompletas**: hoy se pierden del fiscal. El paso 7 lo corrige.

### Casos de datos existentes

| Caso | Hoy | Después |
|------|-----|---------|
| Activa con todos los datos | Completadas | Activas ✓ |
| Activa sin expectedEndDate | Completadas | Pendientes |
| Activa sin expectedReturn | Completadas | Pendientes |
| status=completed con datos | Completadas (mezclada) | Finalizadas |
| Borrador | Pendientes | Pendientes |
| Payments de inversión incompleta | Excluidos de fiscal | Incluidos en fiscal |
