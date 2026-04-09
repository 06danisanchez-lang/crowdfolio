

## Fase 1: Tipos de inversión, schedule automático y niveles de completitud

### Cambios respecto a la propuesta anterior

1. **`portfolio_ready` ahora exige `income_model`** — una inversión sin modelo de rendimiento definido no entra en cartera
2. **`forecast_ready` para periodic/amortizing exige los 4 campos** — `expected_return` + `expected_end_date` + `payment_frequency` + schedule no vacío
3. **`principal_return_type`** — renombrado (ya aceptado)
4. **`variable_or_unknown`** — entra en cartera, nunca en previsiones, fiscalidad solo por payments

### Niveles definitivos

```text
DRAFT
  Requisito: project_name
  Entra en: solo "Pendientes de completar"
  Cuenta Free: sí

PORTFOLIO_READY
  Requisito: platform + project_name + amount > 0 + investment_date
             + income_model definido (no null) + status ≠ 'draft'
  Entra en: Dashboard/cartera

FORECAST_READY
  portfolio_ready + según income_model:
    bullet           → expected_return + expected_end_date
    periodic_fixed   → expected_return + expected_end_date + payment_frequency + schedule ≥1 fila
    amortizing       → expected_return + expected_end_date + payment_frequency + schedule ≥1 fila
    variable_or_unknown → NUNCA forecast_ready
  Entra en: previsiones de rendimiento, timeline, proyecciones

FISCALIDAD
  No es nivel de la inversión. useTaxSummary filtra inversiones portfolio_ready
  con payments reales en el año fiscal. Sin cambios.
```

### Migración DB (1 SQL)

```sql
ALTER TABLE investments ADD COLUMN income_model text DEFAULT NULL;
ALTER TABLE investments ADD COLUMN payment_frequency text DEFAULT NULL;
ALTER TABLE investments ADD COLUMN principal_return_type text DEFAULT 'at_maturity';

CREATE TABLE investment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  expected_date date NOT NULL,
  expected_amount numeric NOT NULL,
  type text NOT NULL,           -- 'interest', 'principal', 'mixed'
  status text DEFAULT 'pending', -- 'pending', 'matched', 'missed', 'skipped'
  matched_payment_id uuid REFERENCES payments(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE investment_schedule ENABLE ROW LEVEL SECURITY;
-- 4 RLS policies via investment ownership (same pattern as payments)
```

Nota: `income_model` DEFAULT NULL (no 'bullet') — inversiones existentes no tienen modelo definido, así que **no son portfolio_ready por defecto**. Esto es un problema porque rompería inversiones existentes. Alternativa: DEFAULT 'bullet' para que las existentes sigan funcionando. **Propongo DEFAULT 'bullet'** para no romper nada — las inversiones existentes se tratan como pago único final, que es el comportamiento actual.

### Archivos a modificar (7)

**1. `src/types/investment.ts`**
- Añadir tipos: `IncomeModel = 'bullet' | 'periodic_fixed' | 'amortizing' | 'variable_or_unknown'`
- `PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual'`
- `PrincipalReturnType = 'at_maturity' | 'amortizing' | 'unknown'`
- Extender `Investment` y `DraftInvestment` con 3 campos opcionales
- Añadir `InvestmentScheduleEntry` interface

**2. `src/lib/investment/completeness.ts`**
- Añadir a `CompletenessInput`: `incomeModel`, `expectedEndDate`, `paymentFrequency`, `hasSchedule`
- `isPortfolioReady`: campos base actuales + `incomeModel` definido + status ≠ draft
- `isForecastReady`: según income_model como definido arriba
- Renombrar `isComplete` → `isPortfolioReady` en `CompletionStatus`
- `isInvestmentComplete` sigue siendo alias de `isPortfolioReady` (para no romper imports)

**3. `src/lib/investment/scheduleGenerator.ts`** (nuevo)
- `generateSchedule(investment)` → `InvestmentScheduleEntry[]`
- periodic_fixed: N líneas interés + 1 principal al final
- amortizing: N líneas mixtas (cuota constante simplificada)
- bullet / variable_or_unknown: retorna []
- Nota explícita en código: "Fase 1 — generación frontend; migrar a edge function en Fase 2"

**4. `src/hooks/useInvestments.ts`**
- Mapear 3 campos nuevos desde DB (`income_model`, `payment_frequency`, `principal_return_type`)
- Fetch schedule count por investment para calcular `hasSchedule`
- Pasar campos nuevos a `isInvestmentComplete` / `getInvestmentCompletionStatus`
- `addInvestment` / `updateInvestment`: guardar campos nuevos + generar/regenerar schedule
- `addDraftInvestment`: guardar `income_model` si presente

**5. `src/components/investments/InvestmentForm.tsx`**
- Añadir selector `income_model` (4 opciones con labels descriptivos)
- Si periodic_fixed/amortizing: mostrar selector `payment_frequency`
- Si amortizing: mostrar selector `principal_return_type`
- Si variable_or_unknown: ocultar `expectedReturn` (no aplica a previsiones)
- Añadir campos a schemas zod (opcionales en draft, income_model requerido en completa)
- Al submit completa: si periodic/amortizing, generar schedule y guardar

**6. `src/lib/i18n/translations.ts`**
- Labels para income_model, payment_frequency, principal_return_type y sus valores
- ES + EN

**7. `.lovable/plan.md`**
- Actualizar con la Fase 1 definitiva

### Lo que NO cambia

- `useTaxSummary` — ya funciona con payments reales
- `AppLayout` sidebar badge — ya usa `incompleteCount`
- `InvestmentList` sección pendientes — ya implementada
- Límite Free — `allInvestmentsCount` ya cuenta todo
- Dashboard KPIs — usan `investments` (portfolio_ready filtrado)

### Inversiones existentes

Con `DEFAULT 'bullet'`: siguen siendo portfolio_ready (tienen los 4 campos base + income_model = bullet). Siguen siendo forecast_ready si tienen expected_return + expected_end_date (lógica bullet). Sin ruptura.

### Nota sobre generación frontend

La generación del schedule en frontend es una solución Fase 1 para ir rápido. Queda explícitamente marcado como deuda técnica. En Fase 2 debería migrarse a una edge function o trigger de DB para garantizar consistencia.

