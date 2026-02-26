
# Fix: i18n Bug in OpportunityFilters — Wrong Key Names

## Root Cause

The dictionary (`translations.ts`) stores all filter-related keys under the `opportunities.filter.*` namespace. But `OpportunityFilters.tsx` calls `t()` with **shorter, non-existent keys** — so the fallback returns the raw key string. Since neither language has those wrong keys, the text never changes when toggling, giving the "stuck" appearance.

No `useState(t(...))` or `useMemo` anti-patterns are present. The component is otherwise correct — it calls `t()` inline in JSX. The only problem is the key names.

## Full Mapping — Wrong Key → Correct Key

| Called in component | Exists in dictionary as |
|---|---|
| `opportunities.searchPlaceholder` | `opportunities.filter.search` |
| `opportunities.allPlatforms` | `opportunities.filter.allPlatforms` |
| `opportunities.sort` | `opportunities.filter.sort` |
| `opportunities.sortBy` | `opportunities.filter.sortBy` |
| `opportunities.filters` | `opportunities.filter.filters` |
| `opportunities.advancedFilters` | `opportunities.filter.advanced` |
| `opportunities.minReturn` | `opportunities.filter.minReturn` |
| `opportunities.maxTerm` | `opportunities.filter.maxTerm` |
| `opportunities.projectType` | `opportunities.filter.projectType` |
| `opportunities.allTypes` | `opportunities.filter.allTypes` |
| `opportunities.riskLevel` | `opportunities.filter.riskLevel` |
| `opportunities.allLevels` | `opportunities.filter.allLevels` |
| `opportunities.allStatuses` | `opportunities.filter.allStatus` |
| `opportunities.onlyFavorites` | `opportunities.filter.favoritesOnly` |
| `opportunities.singularResult` | `opportunities.filter.count1` |
| `opportunities.pluralResult` | `opportunities.filter.count` |
| `opportunities.clearFilters` | `opportunities.filter.clearFilters` |

Additionally, the user has requested these specific translations (some differ from the current dictionary values):

| Key | ES (requested) | EN (requested) | Current dictionary value |
|---|---|---|---|
| `opportunities.filter.search` | `"Buscar oportunidades..."` | `"Search opportunities..."` | ES: `"Buscar por nombre, ubicación..."` / EN same |
| `opportunities.filter.allPlatforms` | `"Todas las plataformas"` | `"All platforms"` | Already correct |
| `opportunities.filter.sort` | `"Ordenar"` | `"Sort"` | Already correct |
| `opportunities.filter.filters` | `"Filtros"` | `"Filters"` | Already correct |

## Sort dropdown labels (also missing)

The sort popover uses additional keys that also don't exist:

| Called | Must add to dictionary |
|---|---|
| `opportunities.sortReturn` | ES: `Rentabilidad esperada` / EN: `Expected return` |
| `opportunities.sortTerm` | ES: `Plazo` / EN: `Term` |
| `opportunities.sortProgress` | ES: `Financiación` / EN: `Funding progress` |
| `opportunities.sortMinInvestment` | ES: `Inversión mínima` / EN: `Min investment` |
| `opportunities.sortDate` | ES: `Fecha de publicación` / EN: `Date added` |
| `opportunities.sortDesc` | ES: `Mayor a menor` / EN: `High to low` |
| `opportunities.sortAsc` | ES: `Menor a mayor` / EN: `Low to high` |

These keys are called as `t('opportunities.sortReturn')` etc. — they don't fit the `opportunities.filter.*` pattern that exists in the dictionary. The cleanest fix is to **add them to the dictionary** with the exact names already used in the component (no rename needed for these, since the component renders them inside the popover and they work in isolation — but they're broken on language switch for the same reason).

## Strategy: Fix call sites in the component (not the dictionary)

Since the dictionary already has well-structured keys under `opportunities.filter.*`, and the user wants no new files and no big refactor, the cleanest fix is:

**Option A (chosen):** Fix the 17 wrong `t()` call sites in `OpportunityFilters.tsx` to use the correct existing dictionary keys. Update the `opportunities.filter.search` value in the dictionary to the user's requested text. Add the 7 missing sort label keys to the dictionary.

This means:
- **`OpportunityFilters.tsx`**: 17 key name fixes
- **`translations.ts`**: Update `opportunities.filter.search` in both `es`/`en` + add 7 sort label keys to both blocks

## Exact Diff

### `src/components/opportunities/OpportunityFilters.tsx`

```diff
- placeholder={t('opportunities.searchPlaceholder')}
+ placeholder={t('opportunities.filter.search')}

- <SelectItem value="all">{t('opportunities.allPlatforms')}</SelectItem>
+ <SelectItem value="all">{t('opportunities.filter.allPlatforms')}</SelectItem>

- <span>{t('opportunities.sort')}</span>
+ <span>{t('opportunities.filter.sort')}</span>

- <div className="text-sm font-medium">{t('opportunities.sortBy')}</div>
+ <div className="text-sm font-medium">{t('opportunities.filter.sortBy')}</div>

- <SelectItem value="expectedReturn">{t('opportunities.sortReturn')}</SelectItem>
+ <SelectItem value="expectedReturn">{t('opportunities.filter.sortReturn')}</SelectItem>

- <SelectItem value="term">{t('opportunities.sortTerm')}</SelectItem>
+ <SelectItem value="term">{t('opportunities.filter.sortTerm')}</SelectItem>

- <SelectItem value="fundingProgress">{t('opportunities.sortProgress')}</SelectItem>
+ <SelectItem value="fundingProgress">{t('opportunities.filter.sortProgress')}</SelectItem>

- <SelectItem value="minInvestment">{t('opportunities.sortMinInvestment')}</SelectItem>
+ <SelectItem value="minInvestment">{t('opportunities.filter.sortMinInvestment')}</SelectItem>

- <SelectItem value="createdAt">{t('opportunities.sortDate')}</SelectItem>
+ <SelectItem value="createdAt">{t('opportunities.filter.sortDate')}</SelectItem>

- <SelectItem value="desc">{t('opportunities.sortDesc')}</SelectItem>
+ <SelectItem value="desc">{t('opportunities.filter.sortDesc')}</SelectItem>

- <SelectItem value="asc">{t('opportunities.sortAsc')}</SelectItem>
+ <SelectItem value="asc">{t('opportunities.filter.sortAsc')}</SelectItem>

- <span>{t('opportunities.filters')}</span>
+ <span>{t('opportunities.filter.filters')}</span>

- <div className="text-sm font-medium">{t('opportunities.advancedFilters')}</div>
+ <div className="text-sm font-medium">{t('opportunities.filter.advanced')}</div>

- <Label className="text-xs text-muted-foreground">{t('opportunities.minReturn')}</Label>
+ <Label className="text-xs text-muted-foreground">{t('opportunities.filter.minReturn')}</Label>

- <Label className="text-xs text-muted-foreground">{t('opportunities.maxTerm')}</Label>
+ <Label className="text-xs text-muted-foreground">{t('opportunities.filter.maxTerm')}</Label>

- <Label className="text-xs text-muted-foreground">{t('opportunities.projectType')}</Label>
+ <Label className="text-xs text-muted-foreground">{t('opportunities.filter.projectType')}</Label>

- <SelectItem value="all">{t('opportunities.allTypes')}</SelectItem>
+ <SelectItem value="all">{t('opportunities.filter.allTypes')}</SelectItem>

- <Label className="text-xs text-muted-foreground">{t('opportunities.riskLevel')}</Label>
+ <Label className="text-xs text-muted-foreground">{t('opportunities.filter.riskLevel')}</Label>

- <SelectItem value="all">{t('opportunities.allLevels')}</SelectItem>
+ <SelectItem value="all">{t('opportunities.filter.allLevels')}</SelectItem>

- <SelectItem value="all">{t('opportunities.allStatuses')}</SelectItem>
+ <SelectItem value="all">{t('opportunities.filter.allStatus')}</SelectItem>

- <Label className="text-sm">{t('opportunities.onlyFavorites')}</Label>
+ <Label className="text-sm">{t('opportunities.filter.favoritesOnly')}</Label>

- {resultCount === 1 ? t('opportunities.singularResult') : t('opportunities.pluralResult')}
+ {resultCount === 1 ? t('opportunities.filter.count1') : t('opportunities.filter.count')}

- {t('opportunities.clearFilters')}
+ {t('opportunities.filter.clearFilters')}
```

### `src/lib/i18n/translations.ts`

In the `es` block — update existing key + add 7 new sort keys:
```diff
- 'opportunities.filter.search': 'Buscar por nombre, ubicación...',
+ 'opportunities.filter.search': 'Buscar oportunidades...',
+ 'opportunities.filter.sortReturn': 'Rentabilidad esperada',
+ 'opportunities.filter.sortTerm': 'Plazo',
+ 'opportunities.filter.sortProgress': 'Financiación',
+ 'opportunities.filter.sortMinInvestment': 'Inversión mínima',
+ 'opportunities.filter.sortDate': 'Fecha de publicación',
+ 'opportunities.filter.sortDesc': 'Mayor a menor',
+ 'opportunities.filter.sortAsc': 'Menor a mayor',
```

In the `en` block — update existing key + add 7 new sort keys:
```diff
- 'opportunities.filter.search': 'Search by name, location...',
+ 'opportunities.filter.search': 'Search opportunities...',
+ 'opportunities.filter.sortReturn': 'Expected return',
+ 'opportunities.filter.sortTerm': 'Term',
+ 'opportunities.filter.sortProgress': 'Funding progress',
+ 'opportunities.filter.sortMinInvestment': 'Min investment',
+ 'opportunities.filter.sortDate': 'Date added',
+ 'opportunities.filter.sortDesc': 'High to low',
+ 'opportunities.filter.sortAsc': 'Low to high',
```

## Files Changed

| File | Change |
|---|---|
| `src/components/opportunities/OpportunityFilters.tsx` | Fix 23 wrong `t()` key names to match actual dictionary keys |
| `src/lib/i18n/translations.ts` | Update search placeholder text + add 7 sort label keys in both `es` and `en` |

Zero new files. Zero new dependencies. No useState/useMemo changes needed — the component is already reactive.
