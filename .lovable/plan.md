

## Plan: periodic_fixed/amortizing requieren schedule para ser activas

### 1. `src/lib/investment/completeness.ts`

Mover la exigencia de `paymentFrequency` + `hasSchedule` de `forecast_ready` a `tracking_ready` para periodic_fixed y amortizing:

```typescript
// Después de los checks base existentes (línea 54), ANTES de calcular isTrackingReady:
const model = inv.incomeModel;
if (model === 'periodic_fixed' || model === 'amortizing') {
  if (!inv.paymentFrequency) missingFields.push('investments.field.paymentFrequency');
  if (!inv.hasSchedule) missingFields.push('investments.field.schedule');
}

const isTrackingReady = missingFields.length === 0;

// forecast_ready: periodic/amortizing pasa a ser simplemente isTrackingReady
// (ya incluye frequency + schedule). Bullet y variable_or_unknown sin cambios.
```

### 2. `src/hooks/useInvestments.ts`

Pasar `paymentFrequency` y `hasSchedule` (derivado de `scheduleMap`) al llamar a `isInvestmentComplete()` / `getInvestmentCompletionStatus()`, para que la capa de datos aplique la nueva regla.

### 3. `src/components/investments/InvestmentForm.tsx`

**Sin lógica paralela.** En `handleSubmit`, después de que `investmentSchema.safeParse` pase:

1. Construir un objeto `CompletenessInput` con los datos del form
2. Para `hasSchedule`: hacer un dry-run de `generateSchedule()` con los datos actuales y comprobar que devuelve `length > 0`
3. Llamar a `getInvestmentCompletionStatus(input)` — la misma función centralizada
4. Si `!isTrackingReady`, usar `missingFields` directamente para el modal de bloqueo (ya vienen con las claves i18n correctas)

Esto reutiliza 100% la lógica de `completeness.ts` sin duplicar definiciones de completitud.

### 4. `src/lib/i18n/translations.ts`

Añadir claves:
- `investments.field.paymentFrequency` — "Frecuencia de cobro" / "Payment frequency"
- `investments.field.schedule` — "Calendario de cobros" / "Payment schedule"

### Archivos tocados

1. `completeness.ts` — mover schedule/frequency a tracking_ready
2. `useInvestments.ts` — pasar frequency + hasSchedule al check
3. `InvestmentForm.tsx` — reutilizar `getInvestmentCompletionStatus` + dry-run de `generateSchedule`
4. `translations.ts` — 2 claves nuevas

