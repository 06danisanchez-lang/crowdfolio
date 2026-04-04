

## Actualización del HERO — claves `hero.*` en translations.ts

**Archivo único a editar:** `src/lib/i18n/translations.ts`

### 12 claves a modificar (5 ES + 7 EN)

**ES (5 claves que cambian de valor):**

| Clave | Antes | Después |
|---|---|---|
| `hero.badge` | Gestión inteligente de inversiones | Control total de tus inversiones |
| `hero.subheadline` | Centraliza y controla todas tus inversiones desde un único panel. | Centraliza tus inversiones, visualiza tu cartera y obtén un informe fiscal unificado desde un único panel. |
| `hero.bullet1` | Informe fiscal automático de todas tus inversiones | Centraliza tus inversiones en un único panel |
| `hero.bullet2` | Centralización de todas tus plataformas de crowdfunding | Visualiza tu cartera con una visión global y clara |
| `hero.bullet3` | Prepara tu declaración de la renta con datos reales de tus inversiones | Obtén un informe fiscal unificado de todas tus inversiones |

(`hero.headline1` y `hero.headline2` en ES no cambian.)

**EN (7 claves que cambian de valor):**

| Clave | Antes | Después |
|---|---|---|
| `hero.badge` | Smart investment management | Full control of your investments |
| `hero.headline1` | Your entire | Your entire crowdfunding portfolio |
| `hero.headline2` | portfolio in one place. | in one place. |
| `hero.subheadline` | Centralize and control all your investments from a single dashboard. | Centralize your investments, visualize your portfolio, and get a unified tax report from a single dashboard. |
| `hero.bullet1` | Automatic tax report for all your investments | Centralize your investments in a single dashboard |
| `hero.bullet2` | Centralize all your crowdfunding platforms | Visualize your portfolio with a clear overall view |
| `hero.bullet3` | Prepare your tax return with real data from your investments | Get a unified tax report for all your investments |

### No se toca
- `HeroSection.tsx`
- `HowItWorks.tsx`
- Ningún otro archivo, bloque ni clave

### Post-edición
- Verificación de compilación con `npx tsc --noEmit`

