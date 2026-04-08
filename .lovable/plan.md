

## Plan: Reorganizar Dashboard — Actual vs Histórico

### Archivos a editar (6)

1. **`src/types/investment.ts`** — Añadir `activeSummary` y `historicalSummary` a `InvestmentSummary`
2. **`src/hooks/useInvestments.ts`** — Calcular los 2 nuevos bloques en el `useMemo` del summary
3. **`src/pages/Index.tsx`** — Reestructurar dashboard: 2 bloques KPI, toggle móvil, alertas inline, eliminar ReturnComparisonChart
4. **`src/lib/i18n/translations.ts`** — Nuevas claves para secciones, KPIs, tabs, charts, alertas
5. **`src/lib/help/tooltipContent.ts`** — Tooltips actualizados para separación actual/histórico
6. **`src/components/dashboard/AlertsPanel.tsx`** — Variante `inline` para renderizar alertas sin Sheet

---

### Naming final

| Bloque | ES | EN |
|---|---|---|
| Sección actual | Tu cartera hoy | Your portfolio today |
| KPI 1 | Capital activo | Currently invested |
| KPI 2 | Total estimado a recibir | Estimated total to receive |
| KPI 3 | Beneficio esperado | Expected profit |
| KPI 4 | Inversiones activas | Active investments |
| Sección histórico | Tu histórico | Your history |
| KPI 5 | Total invertido | Total invested |
| KPI 6 | Total cobrado | Total collected |
| KPI 7 | Beneficio realizado | Realized profit |
| KPI 8 | Inversiones cerradas | Closed investments |
| Tab actual | Actual | Current |
| Tab histórico | Histórico | Historical |

---

### Lógica de métricas

#### Bloque "Tu cartera hoy"

- **Capital activo**: `sum(amount)` de TODAS las activas (no depende de endDate)
- **Total estimado a recibir**: `sum(amount + calculateInvestmentTotalReturn())` SOLO de activas con `expectedEndDate` válida
- **Beneficio esperado**: `sum(calculateInvestmentTotalReturn())` SOLO de activas con `expectedEndDate` válida
- **Inversiones activas**: count de todas las activas

KPI 2 y KPI 3 comparten exactamente el mismo alcance. Si hay exclusiones por falta de `expectedEndDate`, ambos muestran subtítulo `Sobre X de Y inversiones`.

#### Bloque "Tu histórico"

- **Total invertido**: `sum(amount)` de TODAS las inversiones
- **Total cobrado**: `sum(todos los payments)` de todas
- **Beneficio realizado**: `sum(payments donde type=dividend|interest)` — excluye devoluciones de principal
- **Inversiones cerradas**: count `status=completed`

#### Tipos (`InvestmentSummary`)

```ts
activeSummary: {
  capital: number;
  estimatedTotal: number;    // solo activas con endDate
  expectedProfit: number;    // solo activas con endDate
  count: number;
  withEndDateCount: number;  // para subtítulo de alcance
};
historicalSummary: {
  totalInvested: number;
  totalCollected: number;
  realizedProfit: number;
  completedCount: number;
};
```

---

### Estructura UI

#### Desktop (arriba abajo)

1. Header (título + ShareSuccessButton + InvestmentForm)
2. Banner Pro (si Free)
3. **"Tu cartera hoy"** — heading + 4 KPIs (grid 2x2 → lg:4)
4. **"Tu histórico"** — heading + 4 KPIs (grid 2x2 → lg:4)
5. **"Seguimiento"** — grid lg:2cols: AlertsPanel inline + UpcomingMaturityList
6. **"Análisis"** — grid lg:2cols: PlatformDistributionChart + InvestmentTimelineChart

#### Móvil (arriba abajo)

1. Header
2. Banner Pro
3. Toggle segment [Actual | Histórico]
4. 4 KPIs de la tab seleccionada (grid 2x2)
5. Alertas (apiladas)
6. Próximos vencimientos
7. Distribución por plataforma
8. Evolución temporal

Toggle implementado con `useState` + `useIsMobile()`. En desktop se renderizan ambos bloques.

---

### Eliminaciones y ajustes

- **Eliminar** `ReturnComparisonChart` del dashboard (comparaba magnitudes incompatibles)
- **Charts**: añadir subtítulos explícitos — "Capital total invertido" / "Acumulado histórico" — para dejar claro el alcance global
- **Alertas inline**: nueva variante en AlertsPanel que renderiza directamente sin Sheet. Estado vacío con icono + texto si no hay alertas
- **Tooltips**: actualizados para reflejar la separación y el alcance de cada métrica

---

### Technical details

**`src/hooks/useInvestments.ts`** — cálculo en useMemo:
```ts
const activeInvestments = investments.filter(inv => inv.status === 'active');
const activeWithEndDate = activeInvestments.filter(inv => inv.expectedEndDate);

const activeCapital = activeInvestments.reduce((s, i) => s + i.amount, 0);
const expectedProfit = activeWithEndDate.reduce((s, i) => s + calculateInvestmentTotalReturn(i), 0);
const estimatedTotal = activeWithEndDate.reduce((s, i) => s + i.amount, 0) + expectedProfit;

const totalCollected = investments.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
const realizedProfit = investments.reduce((s, i) => s + i.payments.filter(p => p.type === 'dividend' || p.type === 'interest').reduce((ps, p) => ps + p.amount, 0), 0);
```

**`src/components/dashboard/AlertsPanel.tsx`** — add `variant?: 'sheet' | 'inline'` prop. When `inline`, render alerts list directly inside a Card without Sheet wrapper. Reuse existing alert item rendering.

**`src/pages/Index.tsx`** — mobile toggle:
```tsx
const isMobile = useIsMobile();
const [dashboardTab, setDashboardTab] = useState<'current' | 'historical'>('current');
// In mobile: render toggle + conditional KPI block
// In desktop: render both blocks
```

