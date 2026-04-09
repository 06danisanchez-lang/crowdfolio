
## Fase 1 — Implementada: Tipos de inversión, schedule automático y niveles de completitud

### Cambios realizados

#### Base de datos
- `investments`: 3 columnas nuevas (`income_model`, `payment_frequency`, `principal_return_type`)
- Nueva tabla `investment_schedule` con RLS via ownership de inversiones
- Inversiones existentes: `income_model = 'bullet'` por defecto (sin ruptura)

#### Niveles de completitud (`src/lib/investment/completeness.ts`)
- `draft`: status === 'draft', solo requiere projectName
- `portfolio_ready`: platform + projectName + amount > 0 + investmentDate + incomeModel + status ≠ draft
- `forecast_ready`:
  - bullet: portfolio_ready + expectedReturn + expectedEndDate
  - periodic_fixed/amortizing: portfolio_ready + expectedReturn + expectedEndDate + paymentFrequency + schedule ≥1 fila
  - variable_or_unknown: NUNCA
- Fiscalidad: NO es nivel de inversión. Se basa en payments reales (useTaxSummary sin cambios)

#### Schedule automático (`src/lib/investment/scheduleGenerator.ts`)
- Genera cashflows esperados para periodic_fixed y amortizing
- periodic_fixed: N pagos de interés + 1 de principal al vencimiento
- amortizing: cuota constante (francés simplificado)
- Se genera en frontend (Fase 1) — migrar a edge function en Fase 2

#### Formulario (`InvestmentForm.tsx`)
- Selector de income_model (4 opciones)
- Selector condicional de payment_frequency (periodic/amortizing)
- Selector condicional de principal_return_type (amortizing)
- Schemas zod actualizados para validación completa y draft

#### Plan Free
- Límite de 3 inversiones cuenta TODO (drafts + incompletas + completas)
- Sin cambios necesarios (ya funcionaba así con allInvestmentsCount)

### Deuda técnica (Fase 2)
- Generación de schedule en backend (edge function o trigger)
- Matching automático de payments con schedule
- Alertas de pagos faltantes/retrasados
- UI para ver/editar schedule manualmente
