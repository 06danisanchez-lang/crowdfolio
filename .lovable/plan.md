

## Plan: Fix fallback silencioso en InvestmentList.tsx

### Cambio único

**Archivo**: `src/components/investments/InvestmentList.tsx`, línea 265

| Antes | Después |
|---|---|
| `incomeModel: draft.incomeModel \|\| 'bullet',` | `incomeModel: (draft.incomeModel as IncomeModel) \|\| undefined,` |

El objeto ya se castea como `as Investment` en la línea 271, por lo que `undefined` en `incomeModel` no rompe compilación. `IncomeModel` ya está importado en el archivo (línea 13). No se toca ningún otro archivo ni comportamiento.

