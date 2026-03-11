
## Analysis — Corrections to the Plan

### Point 1: English fiscal copy — CONFIRMED CORRECTION NEEDED
Current `subscription.f4` (EN) = `'Export IRPF summary'` — too literal/technical.
Current `subscription.f5` (EN) = `'Priority support'` — must be removed.
Requested: use `"Tax report prepared for filing"` (prudent, not "ready to file").

### Point 2: Alerts — HONEST ASSESSMENT
The `opportunity_alerts` table and `AlertSettings` component implement **only** custom/personalized alerts (with criteria: platforms, min return, max term, project types, risk levels, etc.). There is **no "basic alert on a specific opportunity"** feature anywhere in the codebase — no column, no UI, no hook for it.

**Conclusion:** The Free = basic alerts / Pro = custom alerts distinction **does not exist functionally**. I will not simulate it with copy alone. The plan is adjusted to:
- Free users: alerts section is blocked (no custom alert creation)
- Show contextual upgrade banner explaining that custom alerts are a Pro feature
- The "basic alerts on specific opportunities" line is removed from the Free plan description, since it doesn't exist

### Point 3: Import counter — CONFIRMED DATA EXISTS
From the schema: table `subscriptions` has columns `import_count_this_month` (integer, default 0) and `import_reset_date` (date, default CURRENT_DATE). The RLS policy "Users can view own subscription" allows SELECT by authenticated users. The context already queries via `check-subscription` edge function. The client can also query the table directly.

**Confirmed:** reading `import_count_this_month` from the `subscriptions` table is feasible and will work.

### Point 4 & 5: Fiscal copy — CORRECTIONS APPLIED
Free: "Vista fiscal orientativa" (ES) / "Indicative tax overview" (EN)
Pro: "Informe fiscal preparado para declarar" (ES) / "Tax report prepared for filing" (EN)
Export as secondary: "Exporta tu informe fiscal en Excel o PDF" (ES) / "Export your tax report in Excel or PDF" (EN)
CTA: "Accede a un informe fiscal preparado para declarar" (ES) / "Access a tax report prepared for filing" (EN)

---

## Corrected Plan — 7 Files

### 1. `src/lib/i18n/translations.ts`

**ES block — replace existing keys:**
- `'subscription.f3'`: `'Alertas personalizadas según tus criterios'`
- `'subscription.f4'`: `'Informe fiscal preparado para declarar'`
- `'subscription.f5'`: `'Exporta tu informe fiscal en Excel o PDF'` (removes "Soporte prioritario")

**Add new keys — ES:**
```
'subscription.cta.investments': 'Desbloquea inversiones ilimitadas'
'subscription.cta.imports': 'Importa sin límites y ahorra tiempo'
'subscription.cta.alerts': 'Crea alertas personalizadas'
'subscription.cta.tax': 'Accede a un informe fiscal preparado para declarar'
'subscription.cta.taxExport': 'Accede a un informe fiscal preparado para declarar'
'subscription.cta.default': 'Desbloquea Crowdfolio Pro'
'subscription.tax.freeNote': 'Estás viendo una vista fiscal orientativa'
'subscription.tax.proNote': 'Con Pro accedes a un informe preparado para declarar, exportable en Excel y PDF'
'subscription.tax.upgradeCta': 'Accede a un informe fiscal preparado para declarar'
'subscription.import.used': 'Has usado tu importación mensual'
'subscription.import.remaining': 'Tienes 1 importación disponible este mes'
'subscription.import.upgradeDesc': 'Con Pro tienes importaciones ilimitadas desde imagen o PDF con IA'
'subscription.dashboard.freeDesc': 'Con Pro puedes registrar inversiones sin límite, crear alertas personalizadas y acceder a un informe fiscal preparado para declarar.'
'subscription.dashboard.ctaBtn': 'Ver qué incluye Pro'
'subscription.alerts.freeNote': 'Las alertas personalizadas son una función de Pro'
'subscription.alerts.upgradeDesc': 'Crea alertas con tus propios criterios: plataforma, rentabilidad, plazo y más'
'subscription.alerts.upgradeCta': 'Crea alertas personalizadas'
'subscription.free.f1': 'Hasta 3 inversiones activas'
'subscription.free.f2': 'Registro manual de inversiones'
'subscription.free.f3': 'Visualización de cartera y evolución'
'subscription.free.f4': 'Importa desde PDF o imagen con IA (1 al mes)'
'subscription.free.f5': 'Exploración de oportunidades'
'subscription.free.f6': 'Vista fiscal orientativa'
'subscription.pro.f1': 'Inversiones ilimitadas'
'subscription.pro.f2': 'Importa desde PDF o imagen sin introducir los datos a mano'
'subscription.pro.f3': 'Alertas personalizadas según tus criterios'
'subscription.pro.f4': 'Informe fiscal preparado para declarar'
'subscription.pro.f5': 'Exporta tu informe fiscal en Excel o PDF'
```

**EN block — replace existing keys:**
- `'subscription.f3'`: `'Custom alerts based on your criteria'`
- `'subscription.f4'`: `'Tax report prepared for filing'`
- `'subscription.f5'`: `'Export your tax report in Excel or PDF'` (removes "Priority support")

**Add new keys — EN:**
```
'subscription.cta.investments': 'Unlock unlimited investments'
'subscription.cta.imports': 'Import without limits and save time'
'subscription.cta.alerts': 'Create custom alerts'
'subscription.cta.tax': 'Access a tax report prepared for filing'
'subscription.cta.taxExport': 'Access a tax report prepared for filing'
'subscription.cta.default': 'Unlock Crowdfolio Pro'
'subscription.tax.freeNote': 'You are seeing an indicative tax overview'
'subscription.tax.proNote': 'With Pro you get a full report prepared for filing, exportable in Excel and PDF'
'subscription.tax.upgradeCta': 'Access a tax report prepared for filing'
'subscription.import.used': "You've used your monthly import"
'subscription.import.remaining': 'You have 1 import available this month'
'subscription.import.upgradeDesc': 'With Pro you get unlimited imports from image or PDF with AI'
'subscription.dashboard.freeDesc': 'With Pro you can track unlimited investments, create custom alerts and access a tax report prepared for filing.'
'subscription.dashboard.ctaBtn': "See what's in Pro"
'subscription.alerts.freeNote': 'Custom alerts are a Pro feature'
'subscription.alerts.upgradeDesc': 'Create alerts with your own criteria: platform, return, term and more'
'subscription.alerts.upgradeCta': 'Create custom alerts'
'subscription.free.f1': 'Up to 3 active investments'
'subscription.free.f2': 'Manual investment tracking'
'subscription.free.f3': 'Portfolio and performance overview'
'subscription.free.f4': 'Import from PDF or image with AI (1/month)'
'subscription.free.f5': 'Opportunity browsing'
'subscription.free.f6': 'Indicative tax overview'
'subscription.pro.f1': 'Unlimited investments'
'subscription.pro.f2': 'Import from PDF or image — no manual data entry'
'subscription.pro.f3': 'Custom alerts based on your criteria'
'subscription.pro.f4': 'Tax report prepared for filing'
'subscription.pro.f5': 'Export your tax report in Excel or PDF'
```

---

### 2. `src/components/subscription/UpgradeModal.tsx`

Move `FEATURE_MESSAGES` and `PRO_FEATURES` inside the component body (after `useLanguage()`) so they react to language changes:

```ts
// Inside component, after const { t } = useLanguage():
const proFeatures = [
  t('subscription.pro.f1'),
  t('subscription.pro.f2'),
  t('subscription.pro.f3'),
  t('subscription.pro.f4'),
  t('subscription.pro.f5'),
];

const featureCtaMap: Record<string, string> = {
  export_irpf: t('subscription.cta.taxExport'),
  unlimited_investments: t('subscription.cta.investments'),
  unlimited_imports: t('subscription.cta.imports'),
  alerts: t('subscription.cta.alerts'),
  tax: t('subscription.cta.tax'),
  default: t('subscription.cta.default'),
};
```

CTA button label: `featureCtaMap[feature] || t('subscription.cta.default')`
DialogTitle (non-Pro): `featureCtaMap[feature] || t('subscription.upgradeTitle')`

---

### 3. `src/components/subscription/PricingTable.tsx`

Move feature arrays inside component, add `useLanguage`, rewrite content:

```ts
// Inside component after const { ... } = useSubscription():
const { t } = useLanguage();

const freeFeatures = [
  t('subscription.free.f1'),
  t('subscription.free.f2'),
  t('subscription.free.f3'),
  t('subscription.free.f4'),
  t('subscription.free.f5'),
  t('subscription.free.f6'),
];

const proFeatures = [
  { text: t('subscription.pro.f1') },
  { text: t('subscription.pro.f2') },
  { text: t('subscription.pro.f3') },
  { text: t('subscription.pro.f4') }, // primary fiscal value
  { text: t('subscription.pro.f5') }, // export as secondary
];
```

Also translate hardcoded strings: "Mensual"→`t('billing.monthly')`, "Anual"→`t('billing.yearly')`, "Pasar a Pro"→`t('subscription.cta.default')`, etc.

---

### 4. `src/components/opportunities/AlertSettings.tsx`

Add props `isPro?: boolean` and `onProRequired?: () => void`.

Behavior:
- "Nueva Alerta" button: if `!isPro` → call `onProRequired?.()` instead of opening the form
- When `!isPro`, show an upgrade banner above the empty state / alert list:

```jsx
{!isPro && (
  <div className="mb-4 rounded-lg border bg-muted/40 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
    <div className="flex-1">
      <p className="text-sm font-medium">{t('subscription.alerts.freeNote')}</p>
      <p className="text-sm text-muted-foreground">{t('subscription.alerts.upgradeDesc')}</p>
    </div>
    <Button size="sm" onClick={onProRequired}>{t('subscription.alerts.upgradeCta')}</Button>
  </div>
)}
```

Existing alerts remain fully visible and toggleable for Free (no delete either — Free can't create new ones but their existing alerts from before are preserved). The form/create flow is the only thing blocked.

Note: this is the real enforcement. There is no "basic alert" feature to preserve — the block is clean.

---

### 5. `src/contexts/SubscriptionContext.tsx`

Add `importCountThisMonth: number` to `SubscriptionState` and context type (default `0`).

After the `check-subscription` call resolves successfully (inside the `try` block, after `setSubscription`), make a parallel query:

```ts
if (user?.id) {
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('import_count_this_month, import_reset_date')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subRow) {
    // Check if reset needed (reset_date is from a previous month)
    const resetDate = new Date(subRow.import_reset_date);
    const now = new Date();
    const isSameMonth = resetDate.getFullYear() === now.getFullYear() && resetDate.getMonth() === now.getMonth();
    setImportCountThisMonth(isSameMonth ? subRow.import_count_this_month : 0);
  }
}
```

Use a separate `const [importCountThisMonth, setImportCountThisMonth] = useState(0)` state. Expose it in context value.

---

### 6. `src/pages/Index.tsx`

**Import count fix:** Replace hardcoded `importsThisMonth={0}` with `{ importCountThisMonth }` from `useSubscription()`.

**AlertSettings — pass props:**
```jsx
<AlertSettings isPro={isPro} onProRequired={() => openUpgradeModal('alerts')} />
```

**TaxDashboard — pass props:**
```jsx
<TaxDashboard isPro={isPro} onProRequired={() => openUpgradeModal('export_irpf')} />
```

**Dashboard Free CTA block** (inside `case 'dashboard'`, above KPI cards, only when `!isPro && !isLoading`):
```jsx
{!isPro && !isLoading && (
  <div className="mb-6 rounded-lg border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold">Crowdfolio Pro</p>
      <p className="text-sm text-muted-foreground">{t('subscription.dashboard.freeDesc')}</p>
    </div>
    <Button size="sm" onClick={() => openUpgradeModal('default')} className="shrink-0">
      <Crown className="mr-2 h-4 w-4" />
      {t('subscription.dashboard.ctaBtn')}
    </Button>
  </div>
)}
```

Also add `Crown` to the imports from `lucide-react`.

**Import contextual hint:** In `ImportExport` render, add visible counter for Free users. The component already shows `(Pro)` tag when limit is reached; we wire `importCountThisMonth` so the logic is real.

---

### 7. `src/components/tax/TaxDashboard.tsx`

Add props `isPro?: boolean` and `onProRequired?: () => void`.

Add banner **before** the Tabs section (only when `!isPro` and there is data):

```jsx
{!isPro && (
  <div className="rounded-lg border bg-muted/30 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
    <div className="flex-1">
      <p className="text-sm font-medium">{t('subscription.tax.freeNote')}</p>
      <p className="text-sm text-muted-foreground">{t('subscription.tax.proNote')}</p>
    </div>
    <Button size="sm" variant="outline" onClick={onProRequired} className="shrink-0">
      <Crown className="mr-2 h-4 w-4" />
      {t('subscription.tax.upgradeCta')}
    </Button>
  </div>
)}
```

Pass `isPro` and `onProRequired` to `<TaxExportButton>`.

Also add `useLanguage` import.

---

## Confirmed Answers to User's 6 Questions

1. **English fiscal copy corrected:** `"Tax report prepared for filing"` — not "ready to file"
2. **Alerts distinction:** Does NOT exist functionally. Plan adjusted to: Free users see the alerts section with an upgrade banner and cannot create alerts. "Basic alerts on specific opportunities" removed from Free feature list — it doesn't exist in the product.
3. **Import counter source:** Table `subscriptions`, columns `import_count_this_month` and `import_reset_date` — both confirmed to exist in the schema. Accessible client-side via RLS "Users can view own subscription". Implementation proceeds as planned with client-side query + monthly reset check.
4. **Fiscal copy final texts:**
   - ES Free: `"Vista fiscal orientativa"`
   - ES Pro: `"Informe fiscal preparado para declarar"`
   - EN Free: `"Indicative tax overview"`
   - EN Pro: `"Tax report prepared for filing"`
   - Export is secondary benefit in both languages
5. **Tax CTA final:** `"Accede a un informe fiscal preparado para declarar"` (ES) / `"Access a tax report prepared for filing"` (EN)
6. Nothing outside the stated scope has been touched

## Files Changed

| File | Changes |
|---|---|
| `src/lib/i18n/translations.ts` | Replace 3 existing `subscription.f*` keys; add ~30 new keys in both `es` + `en` |
| `src/components/subscription/UpgradeModal.tsx` | Move feature list + CTA map inside component; use new i18n keys; contextual button label |
| `src/components/subscription/PricingTable.tsx` | Add `useLanguage`; move arrays inside component; rewrite Free (6 items) and Pro (5 items) using new keys; translate hardcoded strings |
| `src/components/opportunities/AlertSettings.tsx` | Add `isPro`/`onProRequired` props; block create for Free; show upgrade banner |
| `src/contexts/SubscriptionContext.tsx` | Add `importCountThisMonth` state; query `subscriptions` table after auth; expose in context |
| `src/pages/Index.tsx` | Wire real `importCountThisMonth`; pass `isPro`/`onProRequired` to AlertSettings + TaxDashboard; add dashboard Free CTA block |
| `src/components/tax/TaxDashboard.tsx` | Add `isPro`/`onProRequired` props; show Free/Pro fiscal banner; wire to TaxExportButton |

Zero new files. Zero new dependencies.
