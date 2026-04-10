

## Plan: Fase D — UI informativa del nuevo modelo

### Archivos a tocar

| Archivo | Cambios |
|---------|---------|
| `src/lib/i18n/translations.ts` | D6: claves nuevas para detail, badges, schedule |
| `src/components/investments/InvestmentList.tsx` | D1: badge incomeModel. D2: badge "Sin previsión". Props scheduleMap |
| `src/components/investments/InvestmentDetail.tsx` | D3: datos del modelo. D4: sección cobros esperados. D5: cálculos por tipo |
| `src/pages/Index.tsx` | Cableado: extraer scheduleMap y pasarlo a InvestmentList |

---

### D6 — Traducciones

**Problema detectado**: InvestmentDetail usa `t('investments.detail.*')` pero las claves reales son `investDetail.*`. El componente muestra claves crudas. Solución: añadir claves `investments.detail.*` que el componente ya espera + las nuevas para D1-D5.

Nuevas claves en ES (línea ~476) y EN (línea ~952):

```
// Existing detail keys (fixing the mismatch)
investments.detail.platform → Plataforma / Platform
investments.detail.invested → Monto Invertido / Invested Amount
investments.detail.annualReturn → Rentabilidad Anual / Annual Return
investments.detail.duration → Duración Estimada / Estimated Duration
investments.detail.totalReturn → Rentabilidad Total / Total Return
investments.detail.investmentDate → Fecha de Inversión / Investment Date
investments.detail.maturity → Vencimiento / Maturity
investments.detail.notSpecified → No especificado / Not specified
investments.detail.returnsSummary → Resumen de Retornos / Returns Summary
investments.detail.received → Recibido / Received
investments.detail.expected → Esperado / Expected
investments.detail.realReturn → Rendimiento Real / Actual Return
investments.detail.payments → Pagos Recibidos / Received Payments
investments.detail.addPayment → Añadir Pago / Add Payment
investments.detail.noPayments → No hay pagos registrados / No payments recorded
investments.detail.amount → Importe / Amount
investments.detail.dividend → Dividendo / Dividend
investments.detail.principal → Principal / Principal
investments.detail.interest → Intereses / Interest
investments.detail.years → años / years

// New keys for D1-D5
investments.incomeModel.short.bullet → Bullet / Bullet
investments.incomeModel.short.periodicFixed → Periódico / Periodic
investments.incomeModel.short.amortizing → Amortizable / Amortizing
investments.incomeModel.short.variableOrUnknown → Variable / Variable
investments.badge.noForecast → Sin previsión / No forecast
investments.detail.incomeModel → Tipo de rendimiento / Income model
investments.detail.paymentFrequency → Frecuencia de cobros / Payment frequency
investments.detail.principalReturnType → Devolución del capital / Principal return
investments.detail.expectedSchedule → Cobros esperados / Expected payments
investments.schedule.date → Fecha / Date
investments.schedule.amount → Importe / Amount
investments.schedule.type → Tipo / Type
investments.schedule.status → Estado / Status
investments.schedule.type.interest → Intereses / Interest
investments.schedule.type.principal → Principal / Principal
investments.schedule.type.mixed → Mixto / Mixed
investments.schedule.status.pending → Pendiente / Pending
investments.schedule.status.matched → Cobrado / Matched
investments.schedule.status.missed → No recibido / Missed
investments.schedule.status.skipped → Omitido / Skipped
```

---

### D1 — Badge incomeModel en lista

En `InvestmentList.tsx`, en la celda de status (línea 367), añadir un `Badge variant="outline"` tras el status badge con el label corto del incomeModel:

```tsx
{getStatusBadge(investment.status)}
<Badge variant="outline" className="text-xs ml-1">
  {t(incomeModelShortKey(investment.incomeModel))}
</Badge>
```

Helper inline para mapear incomeModel → clave i18n corta.

---

### D2 — Badge "Sin previsión"

En la misma celda, evaluar forecast_ready usando `getInvestmentCompletionStatus` con `scheduleMap`. Si `isPortfolioReady && !isForecastReady`:

```tsx
<Badge variant="outline" className="text-xs text-muted-foreground">
  {t('investments.badge.noForecast')}
</Badge>
```

Prop nueva: `scheduleMap?: Record<string, InvestmentScheduleEntry[]>`.

---

### D3 — Datos del modelo en detalle

Añadir al grid de datos (antes de las fechas, línea ~117):
- **Tipo de rendimiento** — siempre visible con `t('investments.incomeModel.*')` 
- **Frecuencia** — solo si `paymentFrequency` tiene valor
- **Devolución del capital** — solo si `principalReturnType` tiene valor (criterio del usuario)

---

### D4 — Sección "Cobros esperados"

Nueva sección entre "Returns Summary" y "Payments List", visible **solo si `schedule.length > 0`**:
- Header: `t('investments.detail.expectedSchedule')`
- Tabla simple: fecha | importe | tipo | estado
- Ordenado por fecha ascendente
- Prop nueva: `schedule?: InvestmentScheduleEntry[]`

---

### D5 — Cálculos correctos en detalle

Líneas 88-90 usan `calculateInvestmentTotalReturn` para todos los tipos. Corrección:
- Importar `calculateExpectedReturnFromSchedule` y `InvestmentScheduleEntry`
- Si `periodic_fixed || amortizing` y `schedule.length > 0`: usar `calculateExpectedReturnFromSchedule`
- Si `variable_or_unknown`: `totalReturnAmount = 0`, `totalReturnPercent = 0`
- Si `bullet`: mantener cálculo actual

---

### Cableado mínimo

**`Index.tsx`** (línea ~50-65): extraer `scheduleMap` del destructuring de `useInvestments()`, pasarlo a `InvestmentList`:
```tsx
<InvestmentList ... scheduleMap={scheduleMap} />
```

**`InvestmentList.tsx`**: recibir `scheduleMap`, pasar `schedule={scheduleMap?.[viewingInvestment.id] || []}` a `InvestmentDetail`.

---

### Riesgos

- **D6 arregla un bug preexistente**: el detalle mostraba claves crudas por mismatch de prefijo. Se añaden las claves correctas.
- **D5 cambia números del detalle** para periodic/amortizing: ahora usa schedule real (consistente con Fase C).
- **D1/D2 añaden 1-2 badges** discretos por fila. Impacto visual mínimo.

### Qué queda pendiente (futuro)
- Edición manual del schedule
- Match automático pagos reales ↔ schedule entries
- Eliminar `ReturnComparisonChart` (código muerto)
- Eliminar claves duplicadas `investDetail.*` (antiguas)

