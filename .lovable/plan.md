

## Plan: Actualizar lógica Free/Pro — 7 archivos

### Archivos a editar

1. `src/lib/stripe/config.ts`
2. `src/hooks/useSubscription.ts`
3. `src/components/investments/InvestmentForm.tsx`
4. `src/components/future-investments/FutureInvestmentList.tsx`
5. `src/lib/i18n/translations.ts`
6. `src/components/subscription/PricingTable.tsx`
7. `src/components/subscription/UpgradeModal.tsx`

`src/pages/Index.tsx` — solo si es necesario para compilar.

---

### 1. `src/lib/stripe/config.ts`

Reemplazar `PLAN_FEATURES` eliminando `alerts` y `support`, añadiendo `futureInvestments`:

```ts
export const PLAN_FEATURES = {
  free: {
    investments: 3,
    futureInvestments: 3,
    importsPerMonth: 1,
    taxExport: false,
  },
  pro: {
    investments: Infinity,
    futureInvestments: Infinity,
    importsPerMonth: Infinity,
    taxExport: true,
  },
} as const;
```

### 2. `src/hooks/useSubscription.ts`

- Eliminar `canConfigureAlerts` de interfaz y return.
- Añadir `checkFutureInvestmentLimit(currentCount): boolean` — misma lógica que `checkInvestmentLimit` con `PLAN_FEATURES.free.futureInvestments`.
- Actualizar interfaz `UseSubscriptionReturn`.

### 3. `src/components/investments/InvestmentForm.tsx`

Eliminar bypass `isFuture`:
```ts
// ANTES: isFuture || isPro || investmentCount < 3 || !!initialData
// DESPUÉS:
const canAddInvestment = isPro || investmentCount < 3 || !!initialData;
```

### 4. `src/components/future-investments/FutureInvestmentList.tsx`

- Importar `useSubscription` del contexto y `UpgradeModal`.
- Obtener `isPro`. Obtener `investments` de `useInvestments` (ya importado).
- Estado local: `upgradeModalOpen` + `upgradeFeature`.
- Pasar al `InvestmentForm` modo future: `investmentCount={futureInvestments.length}`, `isPro={isPro}`, `onProRequired` abriendo modal con `unlimited_future_investments`.
- Conversión futura a real: si `!isPro && investments.length >= 3`, abrir modal con `unlimited_investments` en vez de proceder.
- Renderizar `<UpgradeModal>` al final.
- No dejar textos obsoletos de alertas personalizadas ni referencias antiguas a features eliminadas.

### 5. `src/pages/Index.tsx`

Sin cambios — `FutureInvestmentList` gestiona el gating internamente.

### 6. `src/lib/i18n/translations.ts`

**ES — Free** (`subscription.free.f1`–`f6`):
- f1: `Hasta 3 inversiones activas`
- f2: `Hasta 3 inversiones futuras`
- f3: `1 importación con IA al mes`
- f4: `Avisos de apertura de tus inversiones futuras`
- f5: `Resumen fiscal indicativo`
- f6: `''`

**ES — Pro** (`subscription.pro.f1`–`f6`):
- f1: `Inversiones activas ilimitadas`
- f2: `Inversiones futuras ilimitadas`
- f3: `Importaciones con IA ilimitadas`
- f4: `Avisos de apertura sin límites`
- f5: `Informe fiscal unificado`
- f6: `Exportación del informe fiscal`

**ES — Legacy** (`subscription.f1`–`f5`):
- f1: `Inversiones ilimitadas`
- f2: `Importaciones con IA ilimitadas`
- f3: `Avisos de apertura sin límites`
- f4: `Informe fiscal unificado`
- f5: `Exportación del informe fiscal`

**ES — Otros:**
- `subscription.cta.investments`: `Desbloquea inversiones ilimitadas`
- `subscription.cta.futureInvestments`: `Desbloquea inversiones futuras ilimitadas` (nueva)
- `subscription.dashboard.freeDesc`: `Gestiona hasta 3 inversiones activas, 3 inversiones futuras y 1 importación con IA al mes.`
- `subscription.billing.freeLimits`: `3 inversiones, 3 futuras, 1 importación/mes`

**EN — Free** (`subscription.free.f1`–`f6`):
- f1: `Up to 3 active investments` / f2: `Up to 3 future investments` / f3: `1 AI import per month` / f4: `Opening alerts for your future investments` / f5: `Indicative tax summary` / f6: `''`

**EN — Pro** (`subscription.pro.f1`–`f6`):
- f1: `Unlimited active investments` / f2: `Unlimited future investments` / f3: `Unlimited AI imports` / f4: `Unlimited opening alerts` / f5: `Unified tax report` / f6: `Tax report export`

**EN — Legacy** (`subscription.f1`–`f5`):
- f1: `Unlimited investments` / f2: `Unlimited AI imports` / f3: `Unlimited opening alerts` / f4: `Unified tax report` / f5: `Tax report export`

**EN — Otros:**
- `subscription.cta.investments`: `Unlock unlimited investments`
- `subscription.cta.futureInvestments`: `Unlock unlimited future investments` (nueva)
- `subscription.dashboard.freeDesc`: `Manage up to 3 active investments, 3 future investments, and 1 AI import per month.`
- `subscription.billing.freeLimits`: `3 investments, 3 future investments, 1 import/month`

No dejar claves rotas ni textos viejos de alertas personalizadas.

### 7. `src/components/subscription/PricingTable.tsx`

- `freeFeatures`: 5 items (f1–f5).
- `proFeatures`: 6 items (f1–f6).
- `CardDescription` Free: `t('subscription.free.f1')` en vez de `t('subscription.free.f3')`.
- `CardDescription` Pro: `t('subscription.pro.f5')` en vez de `t('subscription.pro.f4')`.

### 8. `src/components/subscription/UpgradeModal.tsx`

- `proFeatures`: 6 items (f1–f6).
- `featureCtaMap`: añadir `unlimited_future_investments: t('subscription.cta.futureInvestments')`.

---

### Resultado

- **7 archivos editados**, 0 nuevos, 0 migraciones.
- Free: 3 activas, 3 futuras, 1 IA/mes compartida.
- Pro: sin límites.
- Copy alineado en pricing, upgrade modal y traducciones ES/EN.
- Sin textos obsoletos de alertas personalizadas ni referencias antiguas a features eliminadas.

