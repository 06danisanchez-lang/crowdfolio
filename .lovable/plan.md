

## Plan: Fase C — Previsiones y cálculos por tipo

### C1 — Exponer `scheduleMap` en `useInvestments.ts`

**Archivo**: `src/hooks/useInvestments.ts`

Actualmente el hook ya hace fetch de `investment_schedule` (línea 83-92) pero solo guarda conteos (`scheduleCountMap`). El cambio:

- En vez de (o además de) contar, guardar los datos completos: `scheduleMap: Record<string, InvestmentScheduleEntry[]>`
- El fetch actual (línea 83-86) ya trae `investment_id` — ampliarlo a `select('*')` para obtener `expected_amount`, `type`, `expected_date`, `status`
- Nuevo state: `const [scheduleMap, setScheduleMap] = useState<Record<string, InvestmentScheduleEntry[]>>({});`
- Derivar `scheduleCountMap` del `scheduleMap` para no romper los consumidores existentes: `Object.fromEntries(Object.entries(scheduleMap).map(([k, v]) => [k, v.length]))`
- Exponer `scheduleMap` en el return del hook

**Riesgo**: bajo. Amplía datos ya existentes. El `scheduleCountMap` se mantiene como derivado.

### C2 — Nueva función en `calculations.ts`

**Archivo**: `src/lib/investment/calculations.ts`

Añadir una función explícita:

```typescript
/**
 * Calcula el rendimiento esperado total para inversiones periodic_fixed o amortizing,
 * basándose en el schedule real (investment_schedule).
 *
 * - periodic_fixed: suma de expected_amount donde type === 'interest'
 * - amortizing: suma total de expected_amount - amount (el total de pagos incluye
 *   principal + intereses, así que el rendimiento es la diferencia)
 */
export function calculateExpectedReturnFromSchedule(
  schedule: InvestmentScheduleEntry[],
  amount: number,
  incomeModel: 'periodic_fixed' | 'amortizing'
): number
```

Para `periodic_fixed`: `schedule.filter(e => e.type === 'interest').reduce((s, e) => s + e.expectedAmount, 0)`

Para `amortizing`: `schedule.reduce((s, e) => s + e.expectedAmount, 0) - amount`
- Esto funciona porque en amortización francesa cada cuota incluye principal + interés. La suma total de cuotas menos el principal original = rendimiento.

Importar `InvestmentScheduleEntry` desde `@/types/investment`.

### C3 — Corregir summary en `useInvestments.ts`

**Archivo**: `src/hooks/useInvestments.ts`

En el `useMemo` del summary (líneas 442-501), cambiar las líneas 461 y 472 que usan `calculateInvestmentTotalReturn` para todas las inversiones forecast_ready.

Nueva lógica para calcular el rendimiento esperado de una inversión:

```typescript
function getExpectedReturn(inv: Investment): number {
  if (inv.incomeModel === 'periodic_fixed' || inv.incomeModel === 'amortizing') {
    const schedule = scheduleMap[inv.id];
    if (schedule && schedule.length > 0) {
      return calculateExpectedReturnFromSchedule(schedule, inv.amount, inv.incomeModel);
    }
    return 0; // sin schedule → no debería estar en forecastReady, pero safety
  }
  // bullet (y fallback)
  return calculateInvestmentTotalReturn(inv);
}
```

Aplicar esto en:
- Línea 461: `expectedProfit = forecastReady.reduce((s, i) => s + getExpectedReturn(i), 0)`
- Línea 472: `expectedReturns: forecastReady.reduce((sum, inv) => sum + getExpectedReturn(inv), 0)`

Añadir `scheduleMap` a las dependencias del `useMemo`.

### C4 — Documentar `calculateInvestmentTotalReturn`

**Archivo**: `src/lib/investment/calculations.ts`

Actualizar el JSDoc de `calculateInvestmentTotalReturn` y `calculateInvestmentTotalReturnPercent`:

```
/**
 * Calcula el rendimiento total esperado usando interés simple.
 * SOLO VÁLIDO para inversiones tipo 'bullet'.
 * Para periodic_fixed / amortizing, usar calculateExpectedReturnFromSchedule.
 */
```

No renombrar — se usa en `InvestmentDetail.tsx` (Fase D lo corregirá). Renombrar ahora obligaría a tocar más archivos fuera del alcance.

### C5 — `ReturnComparisonChart`

**Resultado de la comprobación**: el componente NO se importa en ningún sitio de la app. Es código muerto.

**Decisión**: no tocarlo. No merece la pena añadir lógica a un componente sin consumidor. Se reporta como código muerto para decisión futura (Fase D o limpieza).

### Archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useInvestments.ts` | C1: scheduleMap completo. C3: summary usa cálculo por tipo |
| `src/lib/investment/calculations.ts` | C2: nueva `calculateExpectedReturnFromSchedule`. C4: documentar limitación de funciones existentes |

### Ajuste mínimo adicional previsto

- Importar `InvestmentScheduleEntry` en `calculations.ts` desde `@/types/investment`
- Puede requerirse ajuste del import en `useInvestments.ts` para la nueva función

### Efectos visibles

- **KPIs de previsión cambiarán** para usuarios con inversiones `periodic_fixed` o `amortizing` que tengan schedule generado. Los números serán más precisos (basados en flujos reales vs interés simple genérico).
- Si una inversión periodic_fixed tiene schedule con 12 cuotas de interés de 50€, el rendimiento esperado será 600€ exactos, no una aproximación por interés simple.
- Inversiones `bullet` no cambian.
- Inversiones `variable_or_unknown` ya estaban fuera — sin cambio.

### Qué queda para Fase D

- Schedule visible en `InvestmentDetail.tsx` (sección "Cobros esperados")
- Corregir `InvestmentDetail.tsx` para usar `calculateExpectedReturnFromSchedule` en periodic/amortizing
- Badges de `incomeModel` en lista
- Badge "Sin previsión" para portfolio_ready no forecast_ready
- Labels i18n nuevos
- Decisión sobre `ReturnComparisonChart` (eliminar o activar)

