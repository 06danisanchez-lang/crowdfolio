
# Fix: Keys missing from the dictionary (dots-instead-of-spaces bug)

## Root Cause

The `t()` function has a safety fallback: when a key is not found, it returns the key string itself. So `t('dashboard.kpi.projects')` renders literally as `dashboard.kpi.projects` — dots instead of spaces.

Because these missing keys don't exist in **either** language, the text never changes when switching ES↔EN, which gives the "stuck" appearance.

## Missing Keys Found in `src/pages/Index.tsx`

| Key used in code | Problem | Canonical key that exists |
|---|---|---|
| `dashboard.urgentAlerts` | Missing | Must add |
| `dashboard.checkNotifications` | Missing | Must add |
| `dashboard.kpi.projects` | Missing | Must add |
| `dashboard.kpi.returnsHelp` | Missing | Must add |
| `dashboard.kpi.expected` | Missing (≠ `dashboard.kpi.expectedReturns`) | Must add |
| `dashboard.kpi.expectedSubtitle` | Missing | Must add |
| `dashboard.kpi.activeInvestments` | Missing | Must add |
| `dashboard.charts.distribution` | Typo — code uses `.charts.` but dictionary has `.chart.` | Fix usage in Index.tsx |
| `dashboard.charts.timeline` | Same typo | Fix usage in Index.tsx |
| `dashboard.charts.comparison` | Same typo | Fix usage in Index.tsx |
| `dashboard.upcomingTitle` | Missing | Must add |
| `opportunities.kpi.avgReturnSubtitle` | Code uses `avgReturnSubtitle`, dict has `avgReturn.sub` | Fix usage in Index.tsx |
| `opportunities.kpi.platformsSubtitle` | Code uses `platformsSubtitle`, dict has `platforms.sub` | Fix usage in Index.tsx |

## Strategy

Two categories of fixes:

**A — Typos in Index.tsx** (key exists in dict, wrong name used in code): fix the call site in `Index.tsx`
- `dashboard.charts.*` → `dashboard.chart.*` (3 fixes)
- `opportunities.kpi.avgReturnSubtitle` → `opportunities.kpi.avgReturn.sub`
- `opportunities.kpi.platformsSubtitle` → `opportunities.kpi.platforms.sub`

**B — Missing keys in translations.ts** (key used in code but not in dict): add them to both `es` and `en`
- `dashboard.urgentAlerts` ES: `Tienes {n} alertas urgentes` / EN: `You have {n} urgent alerts`
- `dashboard.checkNotifications` ES: `Revisa tus notificaciones` / EN: `Check your notifications`
- `dashboard.kpi.projects` ES: `proyectos` / EN: `projects`
- `dashboard.kpi.returnsHelp` ES: `Retornos cobrados hasta la fecha` / EN: `Returns collected to date`
- `dashboard.kpi.expected` ES: `Retornos Esperados` / EN: `Expected Returns`
- `dashboard.kpi.expectedSubtitle` ES: `Basado en rendimientos estimados` / EN: `Based on estimated returns`
- `dashboard.kpi.activeInvestments` ES: `inversiones activas` / EN: `active investments`
- `dashboard.upcomingTitle` ES: `Próximos Vencimientos` / EN: `Upcoming Maturities`

## Files Changed

| File | Change |
|---|---|
| `src/lib/i18n/translations.ts` | Add 8 missing keys to both `es` and `en` blocks |
| `src/pages/Index.tsx` | Fix 5 wrong key names at call sites |

**Zero new files. Zero new dependencies.**
