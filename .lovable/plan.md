

## Plan: Fase A — Correcciones críticas

### A7 — `src/types/investment.ts`
- Añadir `'draft'` a `InvestmentStatus`
- Añadir `{ value: 'draft', label: 'Borrador', color: 'status-draft' }` a `STATUS_OPTIONS`
- Actualizar `colorMap` en InvestmentList (ajuste mínimo derivado)

### A1 — `src/lib/draftStorage.ts`
- Añadir `incomeModel?`, `paymentFrequency?`, `principalReturnType?` a `DraftFormValues`
- Añadir `'draft'` a `VALID_STATUSES`
- En `loadDraft`: validar los 3 campos nuevos si están presentes (opcionales, no rompen drafts antiguos)

### A2 — `src/components/investments/InvestmentForm.tsx`
- En `draft.save()` (~línea 208): añadir `incomeModel`, `paymentFrequency`, `principalReturnType` al objeto guardado
- En restore (~línea 234): leer y aplicar `incomeModel`, `paymentFrequency`, `principalReturnType` del draft guardado

### A3 — `src/components/investments/InvestmentList.tsx` (completion en pendientes)
- Líneas 174-181: añadir `incomeModel: draft.incomeModel`, `expectedEndDate: draft.expectedEndDate` a la llamada `getInvestmentCompletionStatus`

### A4 — `src/components/investments/InvestmentList.tsx` (Collapsible)
- Importar `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` de `@/components/ui/collapsible`
- Envolver la sección pendientes en `Collapsible` con `defaultOpen={incompleteInvestments.length > 0}`
- El trigger es el header con AlertTriangle + título + contador
- El contenido (lista o "vacío") va dentro de `CollapsibleContent`
- Añadir icono chevron para indicar expansión

### A5 — `src/hooks/useTaxSummary.ts`
- Añadir `income_model`, `payment_frequency`, `principal_return_type` a `InvestmentRow` (líneas 22-35)
- Eliminar los 3 `(inv as any)` en líneas 82, 91-93, usar campos tipados directamente

### A6 — `src/hooks/useInvestments.ts` (import genera schedule)
- En `importInvestments` (~línea 393), tras insertar cada inversión y sus payments, llamar a `saveScheduleForInvestment(data.id, {...})` con los datos de la inversión importada

### Archivos tocados (5)
| Archivo | Cambios |
|---------|---------|
| `src/types/investment.ts` | A7: `'draft'` en tipo y STATUS_OPTIONS |
| `src/lib/draftStorage.ts` | A1: 3 campos nuevos + draft en statuses |
| `src/components/investments/InvestmentForm.tsx` | A2: save/restore con 3 campos |
| `src/components/investments/InvestmentList.tsx` | A3+A4: completion fix + Collapsible |
| `src/hooks/useTaxSummary.ts` | A5: tipado correcto |
| `src/hooks/useInvestments.ts` | A6: schedule en import |

### Riesgos
- A6 es el más delicado: genera filas nuevas en `investment_schedule` para imports. No destructivo.
- A7 amplía el tipo — requiere que `colorMap` en InvestmentList incluya `draft` (ajuste mínimo).
- Ningún cambio altera KPIs ni cálculos existentes.

