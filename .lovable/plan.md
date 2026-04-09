

## Plan revisado: Editar inversiones futuras + defaults seguros

### Punto 1 resuelto — Sin `<span className="hidden" />`

El patrón existente para editar inversiones reales (en `InvestmentList.tsx` línea 264-273) ya resuelve esto limpiamente: se pasa un `trigger` visible (un `DropdownMenuItem` o `Button`) y el `DialogTrigger` de `InvestmentForm` lo envuelve directamente. Al hacer click, el dialog se abre con el estado interno `open` del componente.

Para futuras, replicamos exactamente ese patrón: cada `FutureInvestmentCard` incluye un botón "Editar" como `trigger` del `InvestmentForm`. No hace falta control externo de `open/onOpenChange` ni spans ocultos.

```text
<InvestmentForm
  mode="future"
  initialData={mapFutureToFormData(fi)}
  onSubmit={(data) => handleEditSubmit(fi.id, data)}
  trigger={
    <Button variant="outline" size="sm">
      <Pencil className="mr-1.5 h-4 w-4" />
      {t('common.edit')}
    </Button>
  }
/>
```

Cada card renderiza su propio `InvestmentForm` con `initialData` precargado. El dialog se abre/cierra con el estado interno existente. Sin `editingId`, sin span oculto, sin control externo.

### Punto 2 resuelto — Sin `as any`

Se amplía el tipo de `initialData` en `InvestmentFormProps` de forma mínima:

```ts
// Antes
initialData?: Investment;

// Después
initialData?: Investment | FutureInvestmentFormData;
```

Donde `FutureInvestmentFormData` es un tipo ligero definido localmente en el mismo archivo:

```ts
interface FutureInvestmentFormData {
  platform: Platform;
  customPlatformName?: string;
  projectName: string;
  amount?: number;
  expectedReturn?: number;
  investmentDate?: Date;
  expectedEndDate?: Date;
  sourceUrl?: string;
  notes?: string;
}
```

El bloque de `defaultValues` cuando hay `initialData` ya lee solo los campos que existen — los opcionales simplemente quedan `undefined`. No rompe el branch de edición de inversiones reales porque `Investment` sigue siendo válido.

El mapeo `mapFutureToFormData` devuelve exactamente esta shape:

```ts
function mapFutureToFormData(fi: FutureInvestment): FutureInvestmentFormData {
  return {
    platform: fi.platform,
    customPlatformName: fi.customPlatformName,
    projectName: fi.projectName,
    amount: fi.estimatedAmount ?? undefined,
    expectedReturn: fi.expectedReturn ?? undefined,
    investmentDate: fi.estimatedOpenDate ? new Date(fi.estimatedOpenDate) : undefined,
    expectedEndDate: fi.estimatedEndDate ? new Date(fi.estimatedEndDate) : undefined,
    sourceUrl: fi.sourceUrl,
    notes: fi.notes,
  };
}
```

Sin `as any`. Sin datos inventados.

### Cambios por archivo

#### 1. `src/components/investments/InvestmentForm.tsx`

- Añadir tipo `FutureInvestmentFormData` y ampliar `initialData` a `Investment | FutureInvestmentFormData`
- Añadir `sourceUrl` al mapeo de `initialData` en `defaultValues`
- Defaults neutrales: `platform: undefined`, `expectedReturn: undefined` (nuevas inversiones)
- `handleDiscardDraft`: mismos defaults neutrales

#### 2. `src/components/future-investments/FutureInvestmentList.tsx`

- Añadir `updateFutureInvestment` al destructuring del hook
- Añadir `mapFutureToFormData` (shape parcial fiel)
- Añadir `handleEditSubmit(id, data)` que llama a `updateFutureInvestment`
- En cada `FutureInvestmentCard`: renderizar `InvestmentForm` con `mode="future"`, `initialData={mapFutureToFormData(fi)}`, trigger = botón Editar visible
- Import `Pencil` de lucide-react

#### 3. No se toca `types/investment.ts`

El tipo `FutureInvestmentFormData` queda en `InvestmentForm.tsx` — alcance mínimo.

### Lo que NO se toca

- `mapFutureToPartialInvestment` (conversión a real) — sigue igual
- Crear inversión futura — sigue igual
- Eliminar — sigue igual
- Traducciones, pricing, otros componentes

