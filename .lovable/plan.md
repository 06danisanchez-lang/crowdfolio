

## Plan: Sistema de inversiones incompletas / pendientes de completar

### Análisis del código actual

**Modelo DB**: `investments` tiene `platform`, `project_name`, `amount`, `investment_date`, `expected_return` como NOT NULL. Para permitir borradores reales, necesitan pasar a nullable.

**Tipo `Investment`**: Campos obligatorios (`platform`, `projectName`, `amount`, `investmentDate`, `expectedReturn`). Se mantiene intacto.

**`useInvestments.ts`**: Fetch + mapeo directo a `Investment[]`. Summary se calcula sobre todo el array. Aquí se añadirá la separación completas/incompletas.

**`useTaxSummary.ts`**: Hace su propio fetch de investments y mapea a `Investment[]` directamente (líneas 74-82). Necesita filtrar incompletas con la función centralizada.

**`Index.tsx`**: Dashboard usa `investments` y `summary` directamente. Sección "investments" pasa `investments.length` como `investmentCount` al form para el límite Free.

**`AppLayout.tsx`**: Ya importa `useFutureInvestments` directamente (patrón para el badge sin prop drilling).

**`InvestmentForm.tsx`**: Tiene `investmentSchema` estricto y `futureInvestmentSchema` relajado. Se añadirá `draftInvestmentSchema`.

**`InvestmentList.tsx`**: Recibe `investments: Investment[]`. Se añadirá prop para incompletas.

**Límite Free**: `investmentCount < 3` en `InvestmentForm` (línea 117), `investments.length` en `Index.tsx` (línea 334).

---

### Migración SQL

```sql
ALTER TABLE public.investments
  ALTER COLUMN platform DROP NOT NULL,
  ALTER COLUMN project_name DROP NOT NULL,
  ALTER COLUMN amount DROP NOT NULL,
  ALTER COLUMN investment_date DROP NOT NULL,
  ALTER COLUMN expected_return DROP NOT NULL;
```

Viable: datos existentes tienen todos estos campos rellenos, no se pierden datos.

---

### Archivos nuevos (2)

**`src/lib/investment/completeness.ts`**
- `CompletionStatus { isComplete, isForecastReady, missingFields }`
- `getInvestmentCompletionStatus(inv)`: portfolio_ready = platform + projectName + amount > 0 + investmentDate. forecast_ready = portfolio_ready + expectedReturn != null.
- `isInvestmentComplete(inv)`: shorthand boolean
- `missingFields` devuelve translation keys (`investments.field.platform`, etc.)

**`src/hooks/useIncompleteCount.ts`**
- Fetch ligero de investments (solo campos necesarios), aplica `isInvestmentComplete` de `completeness.ts`, devuelve `count`
- Mismo criterio que el hook principal → sin divergencias
- Usado por `AppLayout` para el badge (mismo patrón que `useFutureInvestments`)

---

### Archivos modificados (9)

**`src/types/investment.ts`**
- Añadir `DraftInvestment` con campos opcionales (platform?, projectName?, amount?, investmentDate?, expectedReturn?, + id, status, payments, createdAt, updatedAt obligatorios)
- `Investment` NO se toca

**`src/hooks/useInvestments.ts`**
- Tipo interno `RawInvestment` para mapeo desde DB con nullables
- Separar en `investments: Investment[]` (portfolio_ready) + `incompleteInvestments: DraftInvestment[]`
- `summary` se calcula solo sobre `investments` (ya lo hace, pero ahora `investments` solo son las completas)
- Previsiones (`expectedProfit`, `estimatedTotal`): filtrar adicionalmente por `forecast_ready` (expectedReturn != null)
- `addInvestment`/`addDraftInvestment`: aceptar datos parciales para borradores
- `allInvestmentsCount`: total guardadas (completas + incompletas) para límite Free
- Exportar: `investments`, `incompleteInvestments`, `incompleteCount`, `allInvestmentsCount`

**`src/components/investments/InvestmentForm.tsx`**
- Añadir `draftInvestmentSchema` (solo `projectName` required, todo lo demás opcional)
- Dos botones en modo `real`: "Guardar borrador" (outline, valida con draft) + "Guardar inversión" (primary, valida con completo)
- Al editar una incompleta: ambos botones visibles. El primary dice "Completar inversión"
- Banner al editar incompleta: "Faltan datos: [lista traducida]. Esta inversión no se incluye todavía en Inicio ni en el informe fiscal."
- Si portfolio_ready pero no forecast_ready: aviso "No se incluye en previsiones — falta rentabilidad esperada."
- `investmentCount` → usar `allInvestmentsCount` (completas + incompletas) para límite Free

**`src/components/investments/InvestmentList.tsx`**
- Nueva prop `incompleteInvestments: DraftInvestment[]`
- Sección "Pendientes de completar" antes de la tabla principal (solo si hay)
- Cada pendiente: nombre o "Sin nombre", plataforma, importe, campos faltantes como badges traducidos, botón "Completar inversión" que abre InvestmentForm con initialData
- Si no hay pendientes, la sección no se renderiza

**`src/pages/Index.tsx`**
- Dashboard: usa `investments` (ya filtrado a completas) para KPIs, charts, alerts, maturity
- Sección Investments: pasa `incompleteInvestments` a InvestmentList, `allInvestmentsCount` al form y al subtitle del límite Free
- `investments.length` en subtitle → `allInvestmentsCount`

**`src/components/layout/AppLayout.tsx`**
- Importar `useIncompleteCount`
- Badge naranja en nav "Inversiones" si count > 0

**`src/hooks/useTaxSummary.ts`**
- Importar `isInvestmentComplete` de `completeness.ts`
- Después del mapeo `mappedInvestments` (línea 74-82), filtrar con `isInvestmentComplete` antes de buscar payments
- Contar `excludedIncompleteCount` y exponerlo

**`src/components/tax/TaxDashboard.tsx`**
- Recibir `excludedIncompleteCount` de `useTaxSummary`
- Si > 0, mostrar aviso: "X inversiones no se incluyen en este informe porque están pendientes de completar."

**`src/lib/i18n/translations.ts`**
- Claves nuevas ES/EN:
  - `investments.incomplete.title`, `.cta`, `.banner`, `.forecastWarning`
  - `investments.field.platform`, `.projectName`, `.amount`, `.investmentDate`, `.expectedReturn`
  - `investments.form.saveDraft`
  - `tax.incomplete.warning`

---

### Consistencia badge ↔ pendientes ↔ módulos

- Badge (`useIncompleteCount`) → usa `isInvestmentComplete` de `completeness.ts`
- Hook principal (`useInvestments`) → usa `isInvestmentComplete` de `completeness.ts`  
- Tax (`useTaxSummary`) → usa `isInvestmentComplete` de `completeness.ts`
- Una sola función, una sola fuente de verdad

### Límite Free

- `allInvestmentsCount` = completas + incompletas (total guardadas en DB)
- Se usa en `InvestmentForm` para `canAddInvestment`
- Se usa en `Index.tsx` para el subtitle "(X/3)"
- Un borrador cuenta contra el límite

### Integración automática

- No hay flag ni paso manual. La función `isInvestmentComplete` evalúa en cada render
- Si editas una incompleta y la completas → desaparece de pendientes, entra en `investments` → se refleja en dashboard y fiscal
- Si editas una completa y le quitas un campo → sale de `investments`, entra en `incompleteInvestments`

---

### Lo que NO se toca

- Tipo `Investment` — intacto
- Inversiones futuras, pagos, alertas, pricing, edge functions, perfil, settings
- No se renombra ningún archivo, prop, key ni función existente
- No se crean nuevas páginas ni rutas

