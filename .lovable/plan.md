

## Corrección del flujo borrador vs completa

### Causa raíz

**Problema 1**: `handleSaveDraft` (línea 316) guarda con `status: values.status || 'active'`. Si el usuario no toca el campo status (por defecto `'active'`), el borrador se guarda como `active`. Luego `isInvestmentComplete` (línea 124 de useInvestments) solo mira 4 campos — si están rellenos, la inversión entra en `complete[]` aunque el usuario quería un borrador.

**Problema 2**: `handleSubmit` usa `form.handleSubmit` con zodResolver, que muestra errores inline pero no un mensaje global. No hay bloqueo explícito ni sugerencia de borrador.

### Archivos a tocar (5)

**1. `src/lib/investment/completeness.ts`**
- Añadir `status?: string | null` a `CompletenessInput`
- Si `status === 'draft'` → `isComplete = false`, añadir campo `investments.field.draftStatus` a missingFields
- Esto garantiza que ningún borrador entre en cartera/dashboard/fiscalidad

**2. `src/components/investments/InvestmentForm.tsx`**
- **handleSaveDraft** (línea 316): cambiar `status: values.status || 'active'` → `status: 'draft'`
- **handleSubmit** (línea 261): añadir validación manual con `investmentSchema.safeParse()` antes de llamar `onSubmit`. Si falla:
  - Setear estado `validationError` con campos faltantes
  - No guardar, no cerrar modal
  - No llamar a `form.trigger()` (para no duplicar con errores inline del resolver — el mensaje global es complementario)
- Añadir estado `const [validationError, setValidationError] = useState<string[] | null>(null)`
- Renderizar bloque de error arriba del form (después del draftHint) cuando `validationError` no es null
- Limpiar `validationError` al cambiar cualquier campo (via useEffect con watch)
- Cuando `isDraft` (editando borrador) y se pulsa "Completar inversión", forzar `status: 'active'` en los datos enviados
- Eliminar marcador `TEST-DRAFT-VISIBLE`
- Añadir `'draft'` a las enums de status en `investmentSchema` y `draftInvestmentSchema` para que no rechace datos existentes con ese status

**3. `src/hooks/useInvestments.ts`**
- Línea 124: pasar `status: raw.status` al llamar `isInvestmentComplete`
- Esto hace que cualquier inversión con `status: 'draft'` vaya automáticamente a `incompleteInvestments`

**4. `src/components/investments/InvestmentList.tsx`**
- En las tarjetas de pendientes: si `draft.status === 'draft'`, mostrar badge "Borrador" en vez de "Pendiente"
- En `InvestmentForm` dentro de la lista de pendientes: el `onSubmit` ya llama `onUpdate(draft.id, data)` — cuando el usuario pulse "Completar inversión", el form enviará `status: 'active'` (cambio del punto 2), lo que actualiza el status en DB y hace que pase a completadas tras refetch

**5. `src/lib/i18n/translations.ts`**
- Añadir claves:
  - `investments.validation.cannotComplete` → "Esta inversión no puede guardarse como completa porque faltan datos obligatorios."
  - `investments.validation.suggestDraft` → "Puedes guardarla como borrador si todavía no los tienes."
  - `investments.validation.missingFields` → "Faltan:"
  - `investments.incomplete.statusDraft` → "Borrador"
  - `investments.field.draftStatus` → "Completar datos"

### Puntos de vigilancia solicitados

1. **"Completar inversión" cambia draft→active**: Sí. En `handleSubmit`, cuando `isDraft`, se fuerza `data.status = 'active'` antes de llamar `onSubmit`. Esto actualiza la DB y tras refetch, `isInvestmentComplete` la ve sin `status: 'draft'` → entra en completadas.

2. **"Guardar inversión" con errores no guarda nada**: Sí. Se hace `safeParse` manual antes de `onSubmit`. Si falla, se muestra mensaje global y se hace `return` sin guardar ni cerrar.

3. **Mensaje global no conflicta con errores inline**: El mensaje global se muestra arriba del form como bloque informativo (no por campo). Los errores inline del resolver siguen funcionando para cada campo. Son complementarios: el global explica qué pasa y sugiere borrador, el inline marca cada campo rojo.

4. **`status: 'draft'` no rompe otros filtros**: La tabla de inversiones completadas solo muestra lo que pasa `isInvestmentComplete` — los drafts no pasan. El dashboard, fiscalidad y KPIs usan `investments` (la lista filtrada), no `allRawInvestments`. Los filtros de status en la tabla (`active/pending/completed/defaulted`) no incluyen `draft`, así que no aparecen allí tampoco.

