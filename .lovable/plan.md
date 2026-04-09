

## Corrección del front visible — Inversiones incompletas

He verificado el estado exacto de los 5 archivos. Todos los cambios están perfectamente localizados. Implementaré lo siguiente:

---

### 1. `src/components/investments/InvestmentForm.tsx`

**Bug de validación (línea 145):**
```
// DE:
const schema = isFuture ? futureInvestmentSchema : (isDraft ? draftInvestmentSchema : investmentSchema);
// A:
const schema = isFuture ? futureInvestmentSchema : investmentSchema;
```
Así "Completar inversión" siempre valida completo. `handleSaveDraft` (línea 300) ya usa `draftInvestmentSchema.safeParse()` — no se toca.

**Footer sticky (líneas 643-657):**
Cambiar `<div className="flex justify-end gap-2 pt-4">` por `<div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 -mx-1 px-1 flex justify-end gap-2">` para que los botones sean siempre visibles.

**Hint visible (líneas 687-689):**
Después de `</DialogHeader>` y antes de `{renderForm()}`, insertar:
```tsx
{showDraftButtons && (
  <p className="text-sm text-muted-foreground px-1 -mt-1 mb-2">
    {t('investments.form.draftHint')}
  </p>
)}
```

---

### 2. `src/components/investments/InvestmentList.tsx`

**Interfaz (línea 61):** Cambiar `onSubmitDraft?: (data: any) => void` por `allowDraftSave?: boolean`.

**Desestructuración (línea 74):** Cambiar `onSubmitDraft` por `allowDraftSave`.

**Tarjetas de pendientes (líneas 181-239):** Añadir fecha de inversión y badge "Pendiente":
- Después de la línea de importe (~194), insertar bloque de fecha.
- Antes de los badges de campos faltantes (~196), insertar badge "Pendiente" naranja.
- Línea 221-223: cambiar `onSubmitDraft={onSubmitDraft ? (data) => { onUpdate(draft.id, data); } : undefined}` por `onSubmitDraft={allowDraftSave ? (data) => onUpdate(draft.id, data) : undefined}`.

---

### 3. `src/pages/Index.tsx`

**Línea 351-353:** Cambiar `onSubmitDraft={(data) => { }}` por `allowDraftSave`.

**Línea 393-396:** Añadir prop `incompleteCount`:
```tsx
<AppLayout 
  currentView={currentView} 
  onViewChange={setCurrentView}
  incompleteCount={incompleteInvestments.length}
>
```

---

### 4. `src/components/layout/AppLayout.tsx`

**Línea 26:** Eliminar `import { useIncompleteCount } from '@/hooks/useIncompleteCount';`

**Línea 28-32:** Añadir `incompleteCount?: number` a `AppLayoutProps`.

**Línea 34-37:** Desestructurar `incompleteCount = 0` de props.

**Línea 47:** Eliminar `const { incompleteCount } = useIncompleteCount();`

El badge en línea 115-119 sigue funcionando igual, ahora con dato reactivo desde `useInvestments`.

---

### 5. `src/lib/i18n/translations.ts`

**Línea 451 (ES):** Añadir después:
```
'investments.form.draftHint': 'Puedes guardar un borrador si todavía te faltan datos.',
'investments.incomplete.status': 'Pendiente',
```

**Línea 902 (EN):** Añadir después:
```
'investments.form.draftHint': 'You can save a draft if you don\'t have all the data yet.',
'investments.incomplete.status': 'Pending',
```

---

### Resultado visible

1. "Guardar borrador" visible sin scroll (footer sticky)
2. Hint visible arriba del formulario
3. "Completar inversión" valida con schema completo
4. Sección pendientes con fecha + badge "Pendiente" + campos faltantes
5. Badge reactivo usando mismo count desde `useInvestments`
6. Sin parche incorrecto con `data.id` — `allowDraftSave` es flag semántico limpio

