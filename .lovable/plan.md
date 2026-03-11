
## Current State

The `opportunity_alerts` table has NO `opportunity_id` column — confirmed from the schema. All existing alerts are criteria-based (platforms, min_return, etc.). The `AlertCard` component builds and renders criteria badges (platform labels, return ranges, term, risk levels) — it will show irrelevant/empty content for a simple alert unless adapted.

Current Free plan keys in `translations.ts`:
- `free.f1`–`free.f6` — f5 = "Exploración de oportunidades", f6 = "Vista fiscal orientativa"
- The user wants BOTH "Exploración de oportunidades en modo lectura" AND a new "Alertas sobre oportunidades concretas" key. So we need to add f7 and renumber/shift, keeping f5 = opportunities browsing, adding f6 = simple alerts, and shifting fiscal to f7 (or inserting a new slot).

## 3 User Adjustments

1. **Keep both "Exploración de oportunidades" AND add simple alerts** → Free plan needs 7 features. Add `subscription.free.f6` = "Alertas sobre oportunidades concretas" / "Alerts on specific opportunities", shift current f6 fiscal → f7.

2. **Simple alert has no criteria** → `opportunity_id` column is nullable. A simple alert insert sets `opportunity_id`, leaves all criteria columns null/empty arrays, and the name is derived from `opportunity.projectName`. No form/validator required.

3. **`AlertCard` for simple vs criteria alerts** → When `alert.opportunityId` is set, render a simplified card: show the project name, the Bell icon, a toggle, and a delete button — but NO criteria badges, NO platform row, NO edit button (simple alerts can't be edited into criteria alerts).

## Files to Change: 9

---

### 1. DB Migration
```sql
ALTER TABLE public.opportunity_alerts
  ADD COLUMN opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE;
```
No RLS change needed — existing policies cover new column.

---

### 2. `src/types/opportunityAlert.ts`
- Add `opportunityId?: string` to `OpportunityAlert`
- Add `opportunityId?: string` to `OpportunityAlertFormData`

---

### 3. `src/hooks/useOpportunityAlerts.ts`
- In the mapper: add `opportunityId: row.opportunity_id ?? undefined`
- Add `createSimpleAlert(opportunityId: string, projectName: string): Promise<boolean>` — inserts with `opportunity_id` set, `name = projectName`, `enabled = true`, all criteria as empty/null
- Add `deleteSimpleAlertForOpportunity(opportunityId: string): Promise<boolean>` — deletes where `opportunity_id = opportunityId`
- Add derived getter exposed from hook: `getSimpleAlertForOpportunity(opportunityId: string)` = `alerts.find(a => a.opportunityId === opportunityId)`

---

### 4. `src/components/opportunities/AlertCard.tsx`
Add `isSimple?: boolean` prop (or derive it from `!!alert.opportunityId`).

When `isSimple`:
- Render: Bell icon + project name + enabled/disabled badge + Switch toggle + Trash2 delete button
- Hide: platform row, all criteria badges, edit button (Edit2)
- Description text under name: "Alerta sobre esta oportunidad" / uses the alert name directly

When NOT `isSimple` (criteria alert — existing behavior):
- Unchanged

Change `onEdit` and `onDelete` to optional:
```ts
onEdit?: (alert: OpportunityAlert) => void;
onDelete?: (id: string) => void;
onToggle?: (id: string, enabled: boolean) => void;
```
(Already partially optional from the last implementation — confirm and make consistent.)

---

### 5. `src/components/opportunities/OpportunityCard.tsx`
Add props:
```ts
isAlerted?: boolean;
onToggleAlert?: (id: string) => void;
```
Add a Bell button next to the Heart button (bottom-right of card image area):
- `Bell` filled (text-primary) when `isAlerted`, muted when not
- `onClick`: `e.stopPropagation()` + `onToggleAlert?.(opportunity.id)`
- Available regardless of `isPro` (Free users can use this)

---

### 6. `src/components/opportunities/OpportunityDetail.tsx`
Add props:
```ts
isAlerted?: boolean;
onToggleAlert?: (id: string) => void;
```
Add a toggle button in the actions row (near the Heart button), showing Bell icon + label "Activar alerta" / "Desactivar alerta" depending on `isAlerted`.

---

### 7. `src/components/opportunities/AlertSettings.tsx`
Refactor into two sections inside the same card:

**Section A — "Alertas sobre oportunidades"**
- Shows `alerts.filter(a => a.opportunityId)` — simple alerts
- Available to Free + Pro: no gate
- No "crear" button here (creation is from the card/detail directly)
- Empty state: "Activa una alerta desde cualquier oportunidad concreta"
- Each rendered with `<AlertCard isSimple onToggle={toggleAlert} onDelete={(id) => setDeleteConfirmId(id)} />`

**Section B — "Alertas personalizadas"** (after a `<Separator />`)
- Shows `alerts.filter(a => !a.opportunityId)` — criteria alerts
- Header with "Nueva alerta" button → blocked for Free → opens upgrade modal
- Free upgrade banner: existing `freeNote`/`upgradeDesc`/`upgradeCta` keys
- Empty state for Pro: existing "Sin alertas configuradas" text

The `AlertForm` and delete confirm dialog stay as before (Pro only, criteria alerts only).

---

### 8. `src/components/opportunities/OpportunityList.tsx`
Add pass-through props:
```ts
isAlertedMap?: Record<string, boolean>;
onToggleAlert?: (id: string) => void;
```
Pass to each `<OpportunityCard>`:
```tsx
isAlerted={isAlertedMap?.[opportunity.id] ?? false}
onToggleAlert={onToggleAlert}
```

---

### 9. `src/pages/Index.tsx`
In the `opportunities` case:
- Import and call `useOpportunityAlerts()`: destructure `alerts`, `createSimpleAlert`, `deleteSimpleAlertForOpportunity`, `getSimpleAlertForOpportunity`
- Build `isAlertedMap`: `Object.fromEntries(alerts.filter(a => a.opportunityId).map(a => [a.opportunityId!, true]))`
- `onToggleAlert` handler:
  ```ts
  const handleToggleOpportunityAlert = (opportunityId: string) => {
    const existing = getSimpleAlertForOpportunity(opportunityId);
    const opp = allOpportunities.find(o => o.id === opportunityId);
    if (existing) deleteSimpleAlertForOpportunity(opportunityId);
    else if (opp) createSimpleAlert(opportunityId, opp.projectName);
  };
  ```
- Pass `isAlertedMap` and `onToggleAlert` to `<OpportunityList>` and `<OpportunityDetail>`

---

### 10. `src/lib/i18n/translations.ts`
**ES block:**
- Keep `subscription.free.f5`: `'Exploración de oportunidades en modo lectura'` (restore the "en modo lectura" phrasing — currently just "Exploración de oportunidades")
- Add `subscription.free.f6`: `'Alertas sobre oportunidades concretas'`
- Rename current `f6` (fiscal) → `subscription.free.f7`: `'Vista fiscal orientativa'`

**EN block:**
- Keep `subscription.free.f5`: `'Read-only opportunity browsing'`
- Add `subscription.free.f6`: `'Alerts on specific opportunities'`
- Rename current `f6` → `subscription.free.f7`: `'Indicative tax overview'`

**Add alert section copy — ES:**
```
'subscription.alerts.simpleTitle': 'Alertas sobre oportunidades'
'subscription.alerts.criteriaTitle': 'Alertas personalizadas'
'subscription.alerts.simpleEmpty': 'Activa una alerta desde cualquier oportunidad concreta'
'subscription.alerts.criteriaEmpty': 'Sin alertas personalizadas configuradas'
'subscription.alerts.toggleOn': 'Alerta activada'
'subscription.alerts.toggleOff': 'Alerta desactivada'
```
**EN equivalents added.**

Update `PricingTable.tsx` to use `f7` for the fiscal row (since f6 shifts to alerts), and add f6 to the free features array.

---

## Summary

| File | Change |
|---|---|
| DB migration | Add `opportunity_id` nullable FK to `opportunity_alerts` |
| `src/types/opportunityAlert.ts` | Add `opportunityId?` to both interfaces |
| `src/hooks/useOpportunityAlerts.ts` | Map `opportunity_id`, add `createSimpleAlert`, `deleteSimpleAlertForOpportunity`, `getSimpleAlertForOpportunity` |
| `src/components/opportunities/AlertCard.tsx` | Conditional simple/criteria rendering; hide criteria fields for simple |
| `src/components/opportunities/OpportunityCard.tsx` | Add Bell toggle button for simple alerts |
| `src/components/opportunities/OpportunityDetail.tsx` | Add Bell toggle in actions |
| `src/components/opportunities/AlertSettings.tsx` | Split into simple (all users) + criteria (Pro) sections |
| `src/components/opportunities/OpportunityList.tsx` | Pass `isAlertedMap`/`onToggleAlert` through to cards |
| `src/pages/Index.tsx` | Wire `useOpportunityAlerts`, build isAlertedMap, handle toggle logic |
| `src/lib/i18n/translations.ts` | Add f6/f7 keys (ES+EN), restore "en modo lectura", add alert section copy |
| `src/components/subscription/PricingTable.tsx` | Add f6+f7 to free features array |

Zero new dependencies. One DB migration (non-breaking, nullable column).
