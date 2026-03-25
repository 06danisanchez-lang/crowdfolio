
## Remate final de limpieza frontend — 2 archivos, 4 cambios

### 1. `src/lib/i18n/translations.ts`

**ES:** eliminar líneas 235–294 (bloque `// Opportunities` + 59 claves `opportunities.*`). La línea 296 (`// Platforms`) queda inmediatamente después de la línea 234.

**EN:** eliminar líneas 680–739 (bloque `// Opportunities` + 59 claves `opportunities.*`). La línea 741 (`// Platforms`) queda inmediatamente después de la línea 679.

### 2. `src/lib/help/tooltipContent.ts`

**Eliminar bloque `opportunities`:** líneas 42–51:
```
  // Opportunities
  opportunities: {
    scraping: '...',
    riskLevel: '...',
    term: '...',
    minInvestment: '...',
    fundingProgress: '...',
    expectedReturn: '...',
    projectType: '...',
  },
```

**Actualizar `general.notifications`** (línea 63):
```
// Antes:
notifications: 'Alertas sobre nuevas oportunidades, vencimientos próximos y avisos fiscales.',

// Después:
notifications: 'Alertas sobre vencimientos de inversiones, cambios de estado y avisos fiscales.',
```

### No se toca
- Edge functions, tablas, migrations, `supabase/types.ts`
- Todo el resto de `translations.ts` y `tooltipContent.ts`
- Ningún otro archivo

### Archivos modificados: 2
- `src/lib/i18n/translations.ts`
- `src/lib/help/tooltipContent.ts`
