

## Plan: Eliminar integración IA del módulo de inversiones

### Archivos a modificar (4)

1. **`src/components/investments/InvestmentForm.tsx`** — Eliminar selector IA/manual, ImageUploader, useInvestmentExtraction, badges IA, estados IA, funciones IA
2. **`src/lib/i18n/translations.ts`** — Actualizar copy de features.f2, subscription.free.f3, subscription.pro.f3, subscription.cta.imports
3. **`src/components/subscription/UpgradeModal.tsx`** — Eliminar import de `Sparkles` (solo se usaba para yearly savings badge, que usa inline — verificar si se puede mantener)
4. **`src/pages/Index.tsx`** — Cambio mínimo: `unlimited_imports` se mantiene como key (es el CTA de importación masiva CSV/JSON, no de IA), solo se actualiza el copy en translations

### Archivos a eliminar (2 + 2 edge functions)

1. `src/components/investments/ImageUploader.tsx`
2. `src/hooks/useInvestmentExtraction.ts`
3. `supabase/functions/extract-investment-from-image/`
4. `supabase/functions/extract-investment-from-pdf/`

### Detalle de cambios

#### `InvestmentForm.tsx`

**Eliminar imports:**
- `ImageUploader` (línea 40)
- `useInvestmentExtraction`, `ExtractedInvestmentData`, `FileType` (línea 41)
- `Badge` (línea 42) — solo se usaba para badges IA
- `FileUp`, `PenLine`, `Sparkles`, `AlertTriangle` de lucide (línea 6)

**Eliminar tipos/estados:**
- `EntryMode` type (línea 75)
- `entryMode` state (línea 100)
- `extractedFields` state (línea 101)
- `highAmountWarning` state (línea 102)
- `useInvestmentExtraction()` hook (línea 113)

**Eliminar funciones:**
- `handleFileSelect` (237-246)
- `applyExtractedData` (248-292)
- `isFieldExtracted` (346)
- `renderModeSelector` (348-376)
- `renderImageUpload` (378-398)

**Eliminar del renderForm:**
- Banner "Datos extraídos por IA" (421-428)
- 7 instancias de `{isFieldExtracted('X') && <Badge>IA</Badge>}` en labels (437, 466, 483, 502, 539, 565, 607, 651, 696)
- Warning de importe alto IA (519-526)

**Eliminar lógica de cierre de dialog (useEffect línea 214):**
- `setEntryMode(...)` → eliminar
- `setExtractedFields(new Set())` → eliminar
- `setHighAmountWarning(null)` → eliminar
- `clearExtractedData()` → eliminar

**Simplificar draft useEffects:**
- Eliminar condición `entryMode !== 'manual'` de los useEffects de draft (líneas 156, 186) — ahora siempre es manual

**Simplificar render final (750-752):**
- Eliminar condicionales `entryMode === 'select'` y `entryMode === 'image'`
- Renderizar siempre `renderForm()` directamente

**Simplificar amount onChange:**
- Eliminar referencia a `highAmountWarning` en el onChange del campo amount (512-514)

#### `translations.ts` — Cambios de copy

| Clave | Antes (ES) | Después (ES) |
|---|---|---|
| `features.f2.title` | Importación Inteligente | Importación Rápida |
| `features.f2.desc` | ...Nuestra tecnología extrae los datos por ti. | Importa tus inversiones desde CSV o JSON de forma rápida y sencilla. |
| `subscription.free.f3` | 1 importación con IA al mes | 1 importación masiva al mes |
| `subscription.pro.f3` | Importaciones con IA ilimitadas | Importaciones masivas ilimitadas |
| `subscription.cta.imports` | Importa sin límites y ahorra tiempo | Desbloquea importaciones masivas ilimitadas |

| Clave | Antes (EN) | Después (EN) |
|---|---|---|
| `features.f2.title` | Smart Import | Quick Import |
| `features.f2.desc` | ...Our technology extracts data for you. | Import your investments from CSV or JSON quickly and easily. |
| `subscription.free.f3` | 1 AI import per month | 1 bulk import per month |
| `subscription.pro.f3` | Unlimited AI imports | Unlimited bulk imports |
| `subscription.cta.imports` | Import without limits and save time | Unlock unlimited bulk imports |

#### `UpgradeModal.tsx`

- `Sparkles` sigue usándose en línea 124 para el yearly savings badge — se mantiene, no es IA
- `unlimited_imports` se mantiene como key en `featureCtaMap` — es la CTA de importación CSV/JSON, no de IA. El copy cambia via translations.
- **Sin cambios en este archivo**

#### `Index.tsx`

- `unlimited_imports` se mantiene en línea 337 — el concepto de importación masiva CSV/JSON con límite mensual sigue vigente, solo cambia el copy
- **Sin cambios en este archivo**

### Archivos obsoletos a eliminar

| Archivo | Verificación |
|---|---|
| `src/components/investments/ImageUploader.tsx` | Solo importado desde InvestmentForm.tsx (línea 40) — eliminado en el refactor |
| `src/hooks/useInvestmentExtraction.ts` | Solo importado desde InvestmentForm.tsx (línea 41) — eliminado en el refactor |
| `supabase/functions/extract-investment-from-image/index.ts` | Invocado solo desde useInvestmentExtraction.ts — eliminado |
| `supabase/functions/extract-investment-from-pdf/index.ts` | Invocado solo desde useInvestmentExtraction.ts — eliminado |

### Lo que NO se toca

- `ImportExport.tsx` — intacto, CSV/JSON sigue funcionando
- `SubscriptionContext.tsx` — `importCountThisMonth` sigue contando importaciones CSV
- `UpgradeModal.tsx` — sin cambios
- `Index.tsx` — sin cambios
- `FutureInvestmentList.tsx` — no tiene IA
- `useInvestmentDraft.ts` — intacto
- `PricingTable.tsx` — los `f3` keys se actualizan via translations, no hay cambio de código
- `HeroSection.tsx` / `FeaturesGrid.tsx` — `Sparkles` en Hero es decorativo, no IA

### Resultado final

- "Nueva Inversión" abre directamente el formulario manual (sin selector previo)
- No hay upload de imagen/PDF en inversiones
- No hay badges "IA" en campos del formulario
- Landing, pricing y Pro features no mencionan IA
- CSV/JSON import sigue funcionando con su límite mensual
- 4 archivos eliminados (2 frontend + 2 edge functions)

