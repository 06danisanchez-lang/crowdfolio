
## Phase 1 — Full verified implementation plan

### Pre-flight confirmations (all verified from file reads)

**subscription.free.f5 → "Alertas de vencimientos de inversiones"**: `useAlerts.ts` is a pure local hook that generates maturity, overdue and expected-payment alerts from the investments array. It is already active in Free. This is a real Free feature. ✓

**subscription.free.f7**: Currently line 384 ES / line 842 EN. Will be deleted. `PricingTable.tsx` line 30 renders `t('subscription.free.f7')` — that line will be removed. Zero remaining references. ✓

**subscription.alerts.*** (9 keys, ES lines 416–424 / EN lines 874–882): Only consumed by `AlertSettings.tsx` (being deleted). Zero remaining references after deletion. ✓

**opportunities navigation/render**: Exists in `AppLayout.tsx` line 66 (navItem), lines 91+142 (NotificationBell props), `Index.tsx` line 47 (state), lines 68–114 (hooks + logic), lines 227–257 (case block). All will be removed. ✓

---

### File counts confirmed
- **Deleted: 14 files**
- **Modified: 9 files**

---

### DELETE (14 files)

```
src/components/opportunities/AlertCard.tsx
src/components/opportunities/AlertForm.tsx
src/components/opportunities/AlertSettings.tsx
src/components/opportunities/OpportunityCard.tsx
src/components/opportunities/OpportunityDetail.tsx
src/components/opportunities/OpportunityFilters.tsx
src/components/opportunities/OpportunityForm.tsx
src/components/opportunities/OpportunityList.tsx
src/components/opportunities/ScrapeButton.tsx
src/hooks/useOpportunities.ts
src/hooks/useOpportunityAlerts.ts
src/lib/api/opportunities.ts
src/types/opportunity.ts
src/types/opportunityAlert.ts
```

---

### MODIFY (9 files) — exact diffs

#### 1. `src/types/investment.ts` — line 10
```ts
// Remove 'opportunities' from union
export type View = 'dashboard' | 'investments' | 'platforms' | 'tax' | 'settings' | 'profile' | 'admin';
```

#### 2. `src/components/layout/AppLayout.tsx`
- Line 7: remove `Search,` from lucide imports
- Line 66: delete `{ id: 'opportunities' as View, label: t('nav.opportunities'), icon: Search },`
- Line 91: `<NotificationBell onOpportunitiesClick={() => onViewChange('opportunities')} />` → `<NotificationBell />`
- Line 142: same → `<NotificationBell />`

#### 3. `src/components/layout/NotificationBell.tsx`
- Line 1: remove `Search` from lucide imports (keep `Bell, Check, CheckCheck`)
- Lines 15–17: remove `interface NotificationBellProps` entirely (empty interface after prop removal) — or keep as `interface NotificationBellProps {}` — cleanest: remove prop interface and change signature to `export function NotificationBell()`
- Lines 27–30: remove the `if (notification.type === 'new_opportunity' && onOpportunitiesClick)` block
- Lines 35–37: remove the `case 'new_opportunity':` case — only `default:` remains, so simplify `getNotificationIcon` to return `<Bell className="h-4 w-4 text-muted-foreground" />` directly without switch

#### 4. `src/pages/Index.tsx`
- Line 3: remove `Heart, Search as SearchIcon,` from lucide imports (keep `Wallet, TrendingUp, PiggyBank, CalendarClock, Target, Plus, Crown`)
- Lines 8–9: delete `import { useOpportunities } ...` and `import { useOpportunityAlerts } ...`
- Lines 20–25: delete all 6 opportunity component imports (`OpportunityList`, `OpportunityFilters`, `OpportunityForm`, `OpportunityDetail`, `ScrapeButton`, `AlertSettings`)
- Line 42: delete `import { Opportunity } from '@/types/opportunity';`
- Line 47: delete `const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);`
- Lines 68–88: delete entire `useOpportunities()` destructuring block
- Lines 92–97: delete entire `useOpportunityAlerts()` destructuring block
- Lines 100–104: delete `isAlertedMap` computation
- Lines 106–114: delete `handleToggleOpportunityAlert` function
- Lines 227–257: delete entire `case 'opportunities':` block

#### 5. `src/components/tax/TaxEmptyState.tsx`
- Line 1: remove `TrendingUp` import
- Line 2: remove `Link` import from react-router-dom
- Line 4: remove `Button` import
- Lines 33–40: delete the entire `{isFutureOrCurrentYear && (<Button asChild>...</Button>)}` block

#### 6. `src/components/landing/ProductShowcase.tsx`
- Line 15: delete `import opportunitiesImg from '@/assets/screenshots/opportunities.jpg';`
- Lines 29–33: delete the `opportunities` entry from the `screenshots` array (the object `{ src: opportunitiesImg, label: 'Oportunidades', description: '...' }`)

#### 7. `src/components/subscription/UpgradeModal.tsx`
- Line 42: delete `alerts: t('subscription.cta.alerts'),` from `featureCtaMap`

#### 8. `src/components/subscription/PricingTable.tsx`
- Line 30: delete `t('subscription.free.f7'),` from `freeFeatures` array (leaves f1–f6)

#### 9. `src/lib/i18n/translations.ts`

**ES block:**
- Line 16 (`hero.bullet3`): `'Acceso a nuevas oportunidades de inversión'` → `'Prepara tu declaración de la renta con datos reales de tus inversiones'`
- Line 44 (`features.f5.desc`): `'Recibe notificaciones sobre vencimientos, nuevas oportunidades y cambios en tus inversiones.'` → `'Recibe notificaciones sobre vencimientos y cambios en el estado de tus inversiones.'`
- Line 91 (`nav.opportunities`): delete line
- Line 382 (`subscription.free.f5`): `'Exploración de oportunidades en modo lectura'` → `'Alertas de vencimientos de inversiones'`
- Line 383 (`subscription.free.f6`): `'Alertas sobre oportunidades concretas'` → `'Vista fiscal orientativa de tu cartera'`
- Line 384 (`subscription.free.f7`): delete line
- Line 389 (`subscription.pro.f3`): `'Alertas personalizadas según tus criterios'` → `'Informe fiscal detallado por tipo de renta'`
- Line 396 (`subscription.cta.alerts`): delete line
- Line 412 (`subscription.dashboard.freeDesc`): `'Con Pro puedes registrar inversiones sin límite, crear alertas personalizadas y acceder a un informe fiscal preparado para declarar.'` → `'Con Pro puedes registrar inversiones sin límite e importar desde imagen o PDF con IA, además de acceder a un informe fiscal preparado para declarar.'`
- Lines 416–424 (all 9 `subscription.alerts.*` keys): delete all

**EN block (mirrored):**
- Line 474 (`hero.bullet3`): → `'Prepare your tax return with real data from your investments'`
- Line 502 (`features.f5.desc`): → `'Receive notifications about maturities and changes in your investments.'`
- Line 549 (`nav.opportunities`): delete line
- Line 840 (`subscription.free.f5`): → `'Investment maturity alerts'`
- Line 841 (`subscription.free.f6`): → `'Indicative tax overview of your portfolio'`
- Line 842 (`subscription.free.f7`): delete line
- Line 847 (`subscription.pro.f3`): → `'Detailed tax report by income type'`
- Line 854 (`subscription.cta.alerts`): delete line
- Line 870 (`subscription.dashboard.freeDesc`): → `'With Pro you can track unlimited investments and import from image or PDF with AI, plus access a tax report prepared for filing.'`
- Lines 874–882 (all 9 `subscription.alerts.*` keys): delete all

---

### Not touched
- `supabase/functions/scrape-opportunities/`
- `supabase/functions/scheduled-scraper/`
- Tables `opportunities`, `opportunity_alerts`
- Any migration
- `useAlerts.ts`, `AlertsPanel`, maturity alert logic
- All other pages, hooks, components
