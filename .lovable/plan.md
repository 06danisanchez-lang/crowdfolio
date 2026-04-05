

## Confirmaciones solicitadas

### 1. Partes de `InvestmentForm.tsx` desactivadas en `mode: 'future'`

Revisado el código línea por línea. En modo `future` se desactivarán:

| Funcionalidad | Líneas | Comportamiento en mode future |
|---|---|---|
| **Selector de modo de entrada** (select/image/manual) | 81, 310-338, 688-690 | Se salta directamente a `manual`. `entryMode` se inicializa como `'manual'`. No se renderiza `renderModeSelector()` ni `renderImageUpload()`. |
| **AI extraction** (ImageUploader + applyExtractedData) | 41, 95, 215-270, 340-359 | No se importa ni ejecuta. `extractedFields` queda vacío, los badges "IA" no aparecen. |
| **Draft persistence** | 44, 88, 131-160, 162-188, 284-289, 295-306, 366-381 | Se desactiva. El `useInvestmentDraft` se inicializa con `undefined` como userId. No se auto-guarda ni restaura borrador. No se muestra el banner "Borrador restaurado". |
| **Campo `status`** | 603-629 | Se oculta. Las inversiones futuras no tienen status. |
| **High amount warning** | 83, 244-246, 474, 480-487 | Se desactiva (no aplica a importes estimados). |
| **Pro/investment count gate** | 97-105, 667-678 | Se desactiva en modo future (no cuenta contra el límite de inversiones reales). |

Se **añade** en modo future:
- Campo `source_url` (Input tipo URL)
- Labels distintos vía i18n: "Importe previsto", "Fecha prevista de apertura", "Rentabilidad estimada"
- Schema alternativo con `amount` y `expectedReturn` como `z.number().nullable().optional()`

### 2. Soporte de `initialData` para conversión

El formulario **ya soporta** `initialData` (líneas 63-69, 109-126). Recibe un objeto `Investment` y precarga todos los campos vía `defaultValues`.

**Ajuste necesario:** El tipo de `initialData` es `Investment`, pero al convertir desde una inversión futura el objeto será de tipo `FutureInvestment`. Se necesita un mapeo previo antes de pasarlo:

```
FutureInvestment → Partial<Investment>
  platform → platform
  project_name → projectName
  estimated_amount → amount (puede ser null → undefined)
  expected_return → expectedReturn (puede ser null → undefined)
  estimated_open_date → investmentDate
  estimated_end_date → expectedEndDate
  notes → notes
```

Este mapeo se hará dentro de `FutureInvestmentList.tsx` al abrir el formulario de conversión. No hace falta tocar `InvestmentForm` para esto — basta con construir un objeto `Investment` parcial compatible con la interfaz existente.

Se ampliará ligeramente la prop `initialData` para aceptar `Partial<Investment>` (o se construirá un objeto `Investment` completo con defaults para los campos faltantes como `id`, `createdAt`, `status`).

### 3. Orden y manejo de errores en `convertToReal`

Flujo exacto dentro de `useFutureInvestments.convertToReal()`:

```text
1. INSERT into investments (inversión real)
   → si falla: throw error, no se toca nada. La futura permanece intacta.

2. DELETE from future_investments (borrar futura)
   → si falla: la inversión real YA existe.
     Se muestra toast de éxito parcial:
     "Inversión creada correctamente. No se pudo eliminar la inversión futura automáticamente."
     La futura queda visible para que el usuario la borre manualmente.
     No se lanza error bloqueante.

3. Si ambos OK: toast de éxito, refetch de ambas listas.
```

Este orden (INSERT primero, DELETE después) es deliberado: es preferible tener un duplicado temporal (futura + real) que perder datos (borrar futura sin haber creado la real).

### 4. Lista final cerrada de archivos

**Migración SQL (1):**
- Crear tabla `future_investments` con RLS + trigger `updated_at`

**Archivos a crear (3):**

| # | Archivo | Descripción |
|---|---|---|
| 1 | `src/types/futureInvestment.ts` | Tipo `FutureInvestment` |
| 2 | `src/hooks/useFutureInvestments.ts` | CRUD + `convertToReal` |
| 3 | `src/components/future-investments/FutureInvestmentList.tsx` | Vista completa: lista, crear (abre InvestmentForm en mode future), convertir, eliminar, badges de proximidad inline |

**Archivos a editar (5):**

| # | Archivo | Cambio |
|---|---|---|
| 1 | `src/types/investment.ts` | Añadir `'future-investments'` a `View` |
| 2 | `src/components/investments/InvestmentForm.tsx` | Añadir prop `mode`, schema condicional, ocultar/mostrar campos, labels dinámicos, campo `source_url` |
| 3 | `src/components/layout/AppLayout.tsx` | Nuevo nav item |
| 4 | `src/pages/Index.tsx` | Nuevo case en `renderCurrentView()` |
| 5 | `src/lib/i18n/translations.ts` | Claves i18n nuevas (ES + EN) |

**Total: 1 migración + 3 nuevos + 5 editados = 9 operaciones.**

