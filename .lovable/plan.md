

## Plan: Fase B — B1, B2, B3

### B1 — Refactor interno de `InvestmentForm.tsx`

Extraer 3 funciones render dentro del mismo componente (el actual `renderForm` de línea 411-815):

- **`renderBanners()`** — banners de draft restaurado, inversión incompleta, forecast warning, validation error (líneas 414-465)
- **`renderCommonFields()`** — platform, customPlatformName, projectName (líneas 467-520)
- **`renderIncomeModelFields()`** — incomeModel selector + paymentFrequency + principalReturnType + amount/expectedReturn grid + dates grid (líneas 522-736). Estos campos van aquí porque amount, expectedReturn y dates son contextualmente dependientes del tipo de inversión.
- **`renderActions()`** — status selector, sourceUrl, notes, sticky footer con botones (líneas 738-813)

`renderForm()` queda como: `renderBanners()` + `renderCommonFields()` + `renderIncomeModelFields()` + `renderActions()`

Sin cambio funcional.

### B2 — Limpiar campos incompatibles al cambiar `incomeModel`

Añadir un `useEffect` tras la línea 186 (donde se define `watchIncomeModel`):

```
useEffect(() => {
  if (watchIncomeModel === 'bullet' || watchIncomeModel === 'variable_or_unknown') {
    form.setValue('paymentFrequency', undefined);
    form.setValue('principalReturnType', undefined);
  }
}, [watchIncomeModel, form]);
```

Solo limpia `paymentFrequency` y `principalReturnType`. No toca otros campos.

### B3 — Auto-draft en `updateInvestment` + toast en caller

**`src/hooks/useInvestments.ts`** — en `updateInvestment` (línea 302-338):

Tras regenerar schedule y antes de `fetchInvestments()` (línea 337):
1. Merge los updates con `current` (que ya se calcula en línea 322-331)
2. Evaluar con `isInvestmentComplete` (ya importado) usando los campos merged
3. Si `!isComplete` y el status merged no es `'draft'`: hacer `await supabase.from('investments').update({ status: 'draft' }).eq('id', id)`
4. Cambiar return type a `Promise<{ demotedToDraft: boolean }>` en vez de `void`

**`src/components/investments/InvestmentList.tsx`** — en los 2 puntos donde llama `onUpdate` (líneas 239, 240, 374):
- Cambiar `onUpdate` prop type a `(id: string, updates: Partial<Investment>) => Promise<{ demotedToDraft?: boolean } | void>`
- Tras llamar `onUpdate`, si resultado tiene `demotedToDraft: true`, mostrar toast con `sonner`

**`src/pages/Index.tsx`** — sin cambios necesarios, pasa `updateInvestment` directamente.

### Archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `src/components/investments/InvestmentForm.tsx` | B1: extraer 4 funciones render. B2: useEffect para limpiar campos |
| `src/hooks/useInvestments.ts` | B3: auto-draft + retorno `{ demotedToDraft }` |
| `src/components/investments/InvestmentList.tsx` | B3: manejar retorno async para toast |

### Riesgos
- B3: una edición que borre platform/amount hará que la inversión baje a borradores. Toast explícito al usuario.
- B2: el useEffect se dispara al montar si `watchIncomeModel` ya es bullet — no causa daño porque los campos ya serían undefined, pero verificaremos que no resetee datos en edición de inversiones existentes tipo bullet. Se añadirá guard con `useRef` para ignorar el montaje inicial.
- B1: refactor puro, 0 riesgo funcional.

