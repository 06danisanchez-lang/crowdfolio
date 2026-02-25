
# Implementar ES/EN nativo en toda la app + Bloquear Google Translate

## Contexto

El proyecto tiene ~40 componentes con texto hardcodeado en español. La estrategia es crear un sistema i18n ligero sin librerías externas: un diccionario plano + React Context + función `t(key)`. Exactamente 3 archivos nuevos y 23 archivos editados según la lista especificada.

---

## Bloque 1 — Bloquear Google Translate (`index.html`)

```html
<html lang="es" translate="no">
<head>
  <meta name="google" content="notranslate">
  <meta name="translation" content="no">
```

El `overlay-root` ya tiene `translate="no"` según la memoria de arquitectura — consistente con esto.

---

## Bloque 2 — Archivo nuevo: `src/lib/i18n/translations.ts`

Diccionario plano ES/EN con todos los namespaces necesarios:

```
common.*       → Guardar, Cancelar, Cargando, Error, Cerrar, Editar, Eliminar, Ver, Aceptar, Añadir, Guardar cambios, Filtrar...
nav.*          → Inicio, Inversiones, Oportunidades, Plataformas, Fiscalidad, Administración
header.*       → signIn ("Iniciar Sesión" / "Sign In"), getStarted ("Empezar Gratis" / "Get Started Free")
hero.*         → badge, headline, subheadline, bullet1-3, ctaPrimary, ctaSecondary, trustLine
stats.*        → label1-4 + desc1-4
features.*     → sectionBadge, sectionTitle, sectionDesc, f1.title, f1.desc ... f6.title, f6.desc
how.*          → sectionBadge, sectionTitle, step1.title, step1.desc ... step3
cta.*          → headline, subheadline, benefit1-3, button
footer.*       → contact, pricing
testimonials.* → sectionBadge, sectionTitle, t1.name, t1.role, t1.content ... t3
dashboard.*    → title, subtitle, kpi.invested, kpi.current, kpi.returns, kpi.performance, upcomingTitle, charts.timeline, charts.distribution, charts.comparison
investments.*  → title, subtitle, addBtn, form.title, form.platform, form.project, form.amount, form.date, form.endDate, form.expectedReturn, form.status, form.notes, form.save, table.platform, table.project, table.amount, table.date, table.status, table.actions, empty, deleteConfirm, deleteDesc
opportunities.*→ title, subtitle, addBtn, filters.all, filters.active, form labels...
platforms.*    → title, subtitle, addBtn, form labels, empty
tax.*          → title, subtitle, section headers
profile.*      → title, subtitle, photoTitle, nameLabel, emailLabel, saveBtn
settings.*     → title, account, changePassword, changeEmail, appearance, darkMode, billing
auth.*         → (para Auth.tsx si tiene textos)
subscription.* → upgradeTitle, monthly, yearly, features.1-5, checkoutBtn, alreadyPro
errors.*       → save, load, generic, passwordShort, passwordMismatch
usermenu.*     → profile, settings, darkMode, lightMode, signOut
```

Todas las claves tienen valor en ES y EN. Si la key no existe → se devuelve la key (fallback).

---

## Bloque 3 — Archivo nuevo: `src/contexts/LanguageContext.tsx`

```typescript
export type Lang = 'es' | 'en';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

// - Lee localStorage('app_language'), default 'es'
// - setLang escribe en localStorage y actualiza estado
// - t(key): translations[lang]?.[key] ?? key  (nunca crashea)
// - export LanguageProvider({ children })
// - export useLanguage()
```

---

## Bloque 4 — Archivo nuevo: `src/components/ui/LanguageToggle.tsx`

```tsx
// Botón compacto "ES | EN"
// - Activo: font-semibold text-foreground
// - Inactivo: text-muted-foreground hover:text-foreground
// - Separador "|" entre los dos
// - onClick: setLang('es') / setLang('en')
// - Sin dependencias externas, usa <button> con Tailwind
```

---

## Bloque 5 — `src/App.tsx`

Importar `LanguageProvider` y envolver el árbol existente. Orden correcto:

```
<GlobalErrorBoundary>
  <ThemeProvider>
    <LanguageProvider>          ← NUEVO
      <QueryClientProvider>
        ...resto sin cambios...
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
</GlobalErrorBoundary>
```

---

## Bloque 6 — Landing page (7 componentes)

### `src/pages/Landing.tsx`
- Import `useLanguage`, `LanguageToggle`
- Header: `{t('header.signIn')}`, `{t('header.getStarted')}`
- `<LanguageToggle />` antes de los botones de auth

### `src/components/landing/HeroSection.tsx`
- Badge: `{t('hero.badge')}`
- H1 parte 1: `{t('hero.headline1')}` + "crowdfunding" (word kept) + `{t('hero.headline2')}`
- Subheadline: `{t('hero.subheadline')}`
- 3 bullets: `{t('hero.bullet1')}`, `{t('hero.bullet2')}`, `{t('hero.bullet3')}`
- CTA primario: `{t('hero.ctaPrimary')}`
- CTA secundario: `{t('hero.ctaSecondary')}`
- Trust line: `{t('hero.trustLine')}`

### `src/components/landing/StatsSection.tsx`
Mover array `stats` **dentro del componente** (para reaccionar al cambio de lang):
```typescript
const { t } = useLanguage();
const stats = [
  { icon: Users, value: '500+', label: t('stats.label1'), description: t('stats.desc1') },
  // ...
```

### `src/components/landing/FeaturesGrid.tsx`
Mover array `features` **dentro del componente**:
```typescript
const { t } = useLanguage();
const features = [
  { icon: FileText, title: t('features.f1.title'), description: t('features.f1.desc'), highlight: true },
  // ...6 items
```
Section badge, title, subtitle: `{t('features.sectionBadge')}` etc.

### `src/components/landing/HowItWorks.tsx`
Mover array `steps` **dentro del componente**. Section label, title: `{t('how.sectionBadge')}` etc.

### `src/components/landing/CTASection.tsx`
Mover array `benefits` **dentro del componente**. H2, p, button: `{t('cta.*')}`.

### `src/components/landing/Footer.tsx`
Solo los 2 textos de links: `{t('footer.contact')}`, `{t('footer.pricing')}`.

### `src/components/landing/TestimonialCarousel.tsx`
Dos arrays: `testimonialsEs` (actuales) y `testimonialsEn` (EN hardcodeados). Dentro del componente:
```typescript
const { lang, t } = useLanguage();
const testimonials = lang === 'en' ? testimonialsEn : testimonialsEs;
```
Section badge y título: `{t('testimonials.sectionBadge')}`, `{t('testimonials.sectionTitle')}`.

---

## Bloque 7 — App interior

### `src/components/layout/AppLayout.tsx`
- Import `useLanguage`
- `navItems` array **dentro del componente** (ya que los labels deben ser reactivos):
  ```typescript
  const { t } = useLanguage();
  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'investments', label: t('nav.investments'), icon: Wallet },
    // ...
  ```
- `{isPro ? t('nav.alreadyPro') : t('nav.upgradePro')}`
- `{t('nav.admin')}`
- Footer links labels: `{t('footer.legal')}`, `{t('footer.privacy')}`, `{t('footer.terms')}`, `{t('footer.cookies')}`

### `src/components/layout/UserMenu.tsx`
- Import `useLanguage`, `LanguageToggle`
- `{t('usermenu.profile')}`, `{t('usermenu.settings')}`
- `{darkMode ? t('usermenu.lightMode') : t('usermenu.darkMode')}`
- `{t('usermenu.signOut')}`
- Añadir `<LanguageToggle />` como item en el dropdown (antes del separator, junto al dark mode)

### `src/pages/Index.tsx`
Solo los títulos de sección de la vista dashboard (H1/H2 hardcodeados que aparecen en el render). Los datos dinámicos (nombres de inversiones, cantidades) no se tocan.

### `src/components/investments/InvestmentList.tsx`
- Cabeceras de tabla: `{t('investments.table.platform')}` etc.
- Botones: `{t('common.edit')}`, `{t('common.delete')}`, `{t('common.view')}`
- Empty state
- AlertDialog de confirmación borrado: `{t('investments.deleteConfirm')}`, `{t('investments.deleteDesc')}`
- Select de filtros de estado

### `src/components/investments/InvestmentForm.tsx`
- Labels del formulario: `{t('investments.form.platform')}` etc.
- Placeholders donde hay texto visible
- Botones de submit: `{t('common.save')}`
- Mensajes de modo de entrada (image/manual)

### `src/components/investments/InvestmentDetail.tsx`
- Títulos de sección, labels, botones

### `src/components/investments/ImportExport.tsx`
- Botones y labels

### `src/components/opportunities/OpportunityFilters.tsx`
- Labels de filtros

### `src/components/opportunities/OpportunityForm.tsx`
- Labels y botones del formulario

### `src/components/opportunities/OpportunityList.tsx`
- Cabeceras, empty state, botones

### `src/components/platforms/PlatformList.tsx`
- Títulos, empty state, botones

### `src/components/platforms/PlatformForm.tsx`
- Labels y botones

### `src/components/settings/SettingsView.tsx`
- Títulos de secciones (Apariencia, Cuenta, Cambiar contraseña...)
- Labels de inputs
- Botones
- **Mensajes toast propios**: `toast.error(t('errors.passwordShort'))`, `toast.success(t('settings.passwordUpdated'))`

### `src/components/profile/ProfileView.tsx`
- Títulos, labels, botones

### `src/components/subscription/UpgradeModal.tsx`
- Título, features list, botones de plan
- Feature messages del objeto `FEATURE_MESSAGES` → usando `t()` keys

### `src/components/subscription/BillingSettings.tsx`
- Títulos y botones

---

## Regla sobre arrays fuera de render

Los arrays como `features`, `steps`, `benefits`, `stats`, `navItems` que contienen strings de UI deben moverse **dentro del cuerpo del componente** (después de `useLanguage()`). De lo contrario, no reaccionarían al cambio de idioma (serían strings fijadas en el primer render).

---

## Criterios de aceptación cubiertos

| # | Criterio | Implementación |
|---|----------|----------------|
| 1 | Chrome no ofrece traducir | `translate="no"` + 2 meta tags en `index.html` |
| 2 | Toggle cambia landing + interior | `useLanguage()` en todos los componentes listados |
| 3 | Persiste al recargar | `localStorage('app_language')` en `LanguageContext` |
| 4 | Sin errores en consola | Arrays dentro del componente, fallback `?? key` |
| 5 | Menús y botones traducidos | AppLayout, UserMenu, todos los formularios |
| 6 | Fallback sin crash | `translations[lang]?.[key] ?? key` |

---

## Archivos totales

| Archivo | Acción |
|---------|--------|
| `index.html` | Editar (3 líneas) |
| `src/lib/i18n/translations.ts` | **NUEVO** |
| `src/contexts/LanguageContext.tsx` | **NUEVO** |
| `src/components/ui/LanguageToggle.tsx` | **NUEVO** |
| `src/App.tsx` | Editar (LanguageProvider) |
| `src/pages/Landing.tsx` | Editar |
| `src/components/landing/HeroSection.tsx` | Editar |
| `src/components/landing/StatsSection.tsx` | Editar |
| `src/components/landing/FeaturesGrid.tsx` | Editar |
| `src/components/landing/HowItWorks.tsx` | Editar |
| `src/components/landing/CTASection.tsx` | Editar |
| `src/components/landing/Footer.tsx` | Editar |
| `src/components/landing/TestimonialCarousel.tsx` | Editar |
| `src/components/layout/AppLayout.tsx` | Editar |
| `src/components/layout/UserMenu.tsx` | Editar |
| `src/pages/Index.tsx` | Editar (solo títulos de sección) |
| `src/components/investments/InvestmentForm.tsx` | Editar |
| `src/components/investments/InvestmentList.tsx` | Editar |
| `src/components/investments/InvestmentDetail.tsx` | Editar |
| `src/components/investments/ImportExport.tsx` | Editar |
| `src/components/opportunities/OpportunityFilters.tsx` | Editar |
| `src/components/opportunities/OpportunityForm.tsx` | Editar |
| `src/components/opportunities/OpportunityList.tsx` | Editar |
| `src/components/platforms/PlatformList.tsx` | Editar |
| `src/components/platforms/PlatformForm.tsx` | Editar |
| `src/components/settings/SettingsView.tsx` | Editar |
| `src/components/profile/ProfileView.tsx` | Editar |
| `src/components/subscription/UpgradeModal.tsx` | Editar |
| `src/components/subscription/BillingSettings.tsx` | Editar |

**Total: 3 nuevos + 26 editados = 29 archivos. Cero librerías externas.**
