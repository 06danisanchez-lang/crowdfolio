

## Plan: Actualizar pilares en toda la parte pública

### Archivo 1: `src/lib/i18n/translations.ts`

**20 valores a modificar** (10 claves × 2 idiomas):

**ES:**

| Línea | Clave | Valor nuevo |
|---|---|---|
| 13 | `hero.subheadline` | Centraliza tus inversiones y visualiza tu cartera en un único panel, planifica tus inversiones futuras y obtén un informe fiscal unificado. |
| 14 | `hero.bullet1` | Centraliza tus inversiones y visualiza tu cartera en un único panel |
| 15 | `hero.bullet2` | Planifica tus inversiones futuras y recibe avisos antes de que abran |
| 43 | `features.f5.title` | Avisos de apertura |
| 44 | `features.f5.desc` | Recibe recordatorios antes de que tus inversiones futuras se abran. |
| 51 | `how.step1.title` | Centraliza y visualiza tu cartera |
| 52 | `how.step1.desc` | Reúne todas tus inversiones en un único panel con datos agregados de rendimiento, distribución y vencimientos. |
| 53 | `how.step2.title` | Planifica inversiones futuras |
| 54 | `how.step2.desc` | Guarda las inversiones que te interesan y recibe avisos antes de que abran para llegar a tiempo. |
| 83 | `testimonials.t2.content` | Los avisos de apertura son geniales. Ahora llego a tiempo a inversiones que antes se me escapaban. |
| 297 | `subscription.free.f5` | Avisos de apertura de inversiones futuras |

**EN:**

| Línea | Clave | Valor nuevo |
|---|---|---|
| 401 | `hero.subheadline` | Centralize your investments and visualize your portfolio in a single dashboard, plan your future investments, and get a unified tax report. |
| 402 | `hero.bullet1` | Centralize your investments and visualize your portfolio in a single dashboard |
| 403 | `hero.bullet2` | Plan your future investments and get alerts before they open |
| 431 | `features.f5.title` | Opening Alerts |
| 432 | `features.f5.desc` | Get reminders before your future investments open. |
| 439 | `how.step1.title` | Centralize and visualize your portfolio |
| 440 | `how.step1.desc` | Bring all your investments into a single dashboard with aggregated data on performance, allocation and maturities. |
| 441 | `how.step2.title` | Plan future investments |
| 442 | `how.step2.desc` | Save the investments you're interested in and get alerts before they open so you can act in time. |
| 471 | `testimonials.t2.content` | Opening alerts are great. Now I get to investments on time that I used to miss. |
| 685 | `subscription.free.f5` | Future investment opening alerts |

`hero.bullet3` y `how.step3.*` no cambian.

---

### Archivo 2: `src/components/landing/TestimonialCarousel.tsx`

Eliminar los arrays hardcodeados `testimonialsEs` y `testimonialsEn` (líneas 22-32). Reemplazarlos por un único array que consume las claves i18n `testimonials.t1.*`, `testimonials.t2.*`, `testimonials.t3.*` via `t()`.

Cambio mínimo: las líneas 22-34 se reescriben como:

```ts
const testimonials: TestimonialItem[] = [
  { name: t('testimonials.t1.name'), role: t('testimonials.t1.role'), avatar: 'CM', content: t('testimonials.t1.content'), rating: 5 },
  { name: t('testimonials.t2.name'), role: t('testimonials.t2.role'), avatar: 'LS', content: t('testimonials.t2.content'), rating: 5 },
  { name: t('testimonials.t3.name'), role: t('testimonials.t3.role'), avatar: 'MA', content: t('testimonials.t3.content'), rating: 5 },
];
```

Se elimina la variable `lang` (ya no se necesita) y la línea `const testimonials = lang === 'en' ? ...`.

Nada más cambia en el componente. La estructura visual, el carrusel mobile y el grid desktop quedan intactos.

---

### Total: 2 archivos editados, 0 archivos nuevos, 0 migraciones.

