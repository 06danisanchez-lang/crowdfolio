

## Plan: Cierre de Fase 1 — 4 correcciones pendientes

### 1. `useIncompleteCount.ts`
**Problema**: El SELECT solo trae `id, platform, project_name, amount, investment_date`. No trae `income_model` ni `status`, así que `isInvestmentComplete` no puede evaluarlos.

**Cambio**: Añadir `income_model, status` al SELECT. Pasar `incomeModel` y `status` a `isInvestmentComplete`.

### 2. Dashboard / previsiones (`useInvestments.ts` líneas 442-444)
**Problema**: `summary.expectedReturns` (línea 444) calcula sobre TODAS las `investments`, no solo las `forecastReady`. Los KPIs de rendimiento esperado pueden incluir inversiones que no son forecast_ready.

**Cambio**: En el `summary` useMemo, calcular `expectedReturns` y `averageReturn` (línea 447) usando solo el array `forecastReady` ya calculado (líneas 416-430), no `investments`.

Los gráficos (`InvestmentTimelineChart`) reciben `investments` — esto es correcto porque muestran capital invertido a lo largo del tiempo, que es dato de cartera (portfolio_ready). No requieren cambio.

### 3. Regeneración de schedule (`useInvestments.ts` línea 320)
**Problema**: El `if` en línea 320 solo detecta cambios en `incomeModel`, `paymentFrequency`, `expectedReturn`, `expectedEndDate`. Si cambia `amount`, `investmentDate`, o `principalReturnType`, el schedule no se regenera.

**Cambio**: Ampliar la condición para incluir todos los campos que afectan al schedule:
```
if (updates.incomeModel || updates.paymentFrequency || 
    updates.expectedReturn !== undefined || updates.expectedEndDate !== undefined ||
    updates.amount !== undefined || updates.investmentDate !== undefined ||
    updates.principalReturnType !== undefined)
```

### 4. Import / export

**4a. `src/lib/validation/investmentSchema.ts`**
- Añadir a `investmentImportSchema`: `incomeModel` (opcional, enum), `paymentFrequency` (opcional, enum), `principalReturnType` (opcional, enum)
- Añadir los mismos a `csvRowSchema`

**4b. `src/components/investments/ImportExport.tsx`**
- **Export CSV**: Añadir 3 columnas nuevas en headers y rows (`Modelo de Rendimiento`, `Frecuencia de Pago`, `Tipo Devolución Principal`)
- **Export JSON**: Ya funciona (usa `investments` que ya tiene los campos)
- **Import CSV**: Mapear las 3 columnas nuevas desde el CSV, pasarlas al objeto de inversión
- **CSV template**: Añadir las 3 columnas nuevas con ejemplo

### Archivos a tocar (4)

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useIncompleteCount.ts` | Añadir `income_model, status` al SELECT y a la llamada |
| `src/hooks/useInvestments.ts` | Línea 320: ampliar condición regeneración. Líneas 444,447: usar `forecastReady` |
| `src/lib/validation/investmentSchema.ts` | Añadir 3 campos opcionales a ambos schemas |
| `src/components/investments/ImportExport.tsx` | 3 columnas nuevas en CSV export/import/template |

### Lo que NO se toca
- `completeness.ts` — ya correcto
- `InvestmentForm.tsx` — ya correcto
- `scheduleGenerator.ts` — ya correcto
- Dashboard charts — reciben `investments` (portfolio_ready), correcto para datos de cartera
- `useTaxSummary` — ya correcto

