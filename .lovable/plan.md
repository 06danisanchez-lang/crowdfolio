

## Plan de eliminación de "Plataformas" — Versión final corregida

---

### A. Vistas tras eliminar "Plataformas"

| Vista | Tipo | Dónde aparece |
|---|---|---|
| `dashboard` | **Navegación principal** | Sidebar (navItems) |
| `investments` | **Navegación principal** | Sidebar (navItems) |
| `tax` | **Navegación principal** | Sidebar (navItems) |
| `profile` | **Vista auxiliar** | Solo accesible desde UserMenu (dropdown del avatar) |
| `settings` | **Vista auxiliar** | Solo accesible desde UserMenu (dropdown del avatar) |
| `admin` | **Vista auxiliar** | Solo visible para admins, enlaza a `/admin-dashboard` (ruta separada) |

`profile`, `settings` y `admin` **no aparecen en la navegación principal** (el array `navItems`). Se acceden por el menú de usuario o por ruta directa. Deben permanecer en el tipo `View` porque `UserMenu` los usa con `onViewChange('profile')` y `onViewChange('settings')`.

Nota: el 4º apartado objetivo ("Alertas") no existe aún como sección de navegación — actualmente es un icono/panel en el sidebar (`AlertsPanel`). Este plan NO crea esa sección; solo elimina "Plataformas".

---

### B. Archivos a ELIMINAR (5)

| # | Archivo |
|---|---|
| 1 | `src/components/platforms/PlatformList.tsx` |
| 2 | `src/components/platforms/PlatformCard.tsx` |
| 3 | `src/components/platforms/PlatformForm.tsx` |
| 4 | `src/hooks/usePlatforms.ts` |
| 5 | `src/types/userPlatform.ts` |

---

### C. Archivos a EDITAR (4)

**1. `src/types/investment.ts` — línea 10**
- Eliminar `'platforms'` del union type `View`
- Resultado: `export type View = 'dashboard' | 'investments' | 'tax' | 'settings' | 'profile' | 'admin';`

**2. `src/components/layout/AppLayout.tsx`**
- Línea 9: eliminar `Building2` del import de lucide-react
- Línea 65: eliminar `{ id: 'platforms' as View, label: t('nav.platforms'), icon: Building2 }` del array `navItems`

**3. `src/pages/Index.tsx`**
- Línea 18: eliminar `import { PlatformList } from '@/components/platforms/PlatformList';`
- Líneas 171-180: eliminar el bloque `case 'platforms':` completo del switch

**4. `src/lib/i18n/translations.ts`**
- ES línea 91: eliminar `'nav.platforms': 'Plataformas'`
- ES líneas 237-261: eliminar bloque completo `// Platforms` (26 claves)
- EN línea 477: eliminar `'nav.platforms': 'Platforms'`
- EN líneas 623-647: eliminar bloque completo `// Platforms` (26 claves)
- Total: ~54 claves i18n eliminadas

---

### D. Archivos que NO se tocan

- `src/components/landing/StatsSection.tsx` — usa `Building2` por separado (icono de stats, no relacionado con el módulo)
- `src/components/layout/UserMenu.tsx` — no referencia plataformas
- `src/App.tsx` — no tiene rutas de plataformas
- `src/integrations/supabase/types.ts` — tabla `user_platforms` permanece, no se toca
- Backend/tablas — sin cambios

---

### E. Checklist de validación final

Búsqueda global en `src/` (excluyendo `integrations/supabase`) de:

| Cadena | Esperado |
|---|---|
| `PlatformList` | 0 |
| `PlatformCard` | 0 |
| `PlatformForm` | 0 |
| `usePlatforms` | 0 |
| `@/types/userPlatform` | 0 |
| `'platforms'` como View | 0 |
| `nav.platforms` | 0 |
| `platforms.title` | 0 |
| `platforms.form` | 0 |

- `Building2`: debe seguir existiendo solo en `StatsSection.tsx` (landing)
- `platform` como palabra: aparecerá en inversiones (campo `platform` del tipo `Investment`, `PlatformDistributionChart`, etc.) — esto es correcto y no se toca
- Compilación verificada tras cambios

---

### F. Riesgos

- **Ninguno crítico.** Los 5 archivos a eliminar solo son importados desde `Index.tsx` y entre sí.
- No afirmo "compilación garantizada" — incluyo verificación de compilación como paso final obligatorio.

