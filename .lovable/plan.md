

## Eliminación del módulo Assets + Transactions

### ELIMINAR (13 archivos)

1. `src/components/assets/AssetForm.tsx`
2. `src/components/assets/AssetList.tsx`
3. `src/components/tax/TransactionList.tsx`
4. `src/components/tax/TransactionForm.tsx`
5. `src/components/tax/DistributionChart.tsx`
6. `src/components/tax/TaxAlertsPanel.tsx`
7. `src/hooks/useAssets.ts`
8. `src/hooks/useTransactions.ts`
9. `src/hooks/useTaxCalculation.ts`
10. `src/hooks/useTaxAlerts.ts`
11. `src/types/asset.ts`
12. `src/types/taxCalculation.ts`
13. `src/lib/tax/calculations2025.ts`

### EDITAR (6 archivos)

**1. `src/components/tax/TaxDashboard.tsx`** — Remove TODO comment (line 165)

**2. `src/components/tax/TaxBucketsCard.tsx`** — Replace `import { TaxCalculationResult } from '@/types/taxCalculation'` with inline prop type `taxResult: null` (no `any`)

**3. `src/components/tax/CompensationBreakdown.tsx`** — Same: replace import with `taxResult: null`

**4. `src/hooks/useAdminDashboard.ts`** — Remove `assets`/`tax_years` queries, error checks, variables, asset allocation logic, tax retention logic, platform market share assets loop. Remove `assetAllocation`/`taxRetention` from interface and return. Remove `source`/`assetType` from `AdminUserInvestment`.

**5. `src/components/admin/AdminAnalyticsSection.tsx`** — Remove Asset Allocation pie chart card, Tax Retention gauge card, `RetentionGauge` component, `PIE_COLORS`, unused imports (`PieChart`, `Pie`, `Cell`, `PieChartIcon`, `ActivityIcon`). Keep only Platform Market Share bar chart.

**6. `src/components/admin/AdminUserDetailSheet.tsx`** — Remove `AssetTypeBadge` and "Tipo" column. Update delete confirmation text to remove "activos, transacciones".

### POST-EDIT VERIFICATION

Global search for all residual references listed by user. Confirm clean compilation.

### Constraints
- No backend/table changes
- No `supabase/types.ts` changes
- No `any` types — use `null` directly
- No new files, no renames, no unrelated refactors

