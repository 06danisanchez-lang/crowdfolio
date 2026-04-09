

## Plan: Ajustar copy de planes Free y Pro

### Estrategia

No renumerar claves — `subscription.pro.f5` se usa como `CardDescription` en PricingTable (línea 165). En su lugar: blanquear `f3`, eliminar `f3` de los arrays de render, y actualizar `f4` de Free.

### Cambios

#### 1. `src/lib/i18n/translations.ts`

| Clave | Antes | Después |
|---|---|---|
| `subscription.free.f3` (ES) | 1 importación masiva al mes | *(vacío)* |
| `subscription.free.f4` (ES) | Avisos de apertura de tus inversiones futuras | Hasta 3 avisos de apertura |
| `subscription.pro.f3` (ES) | Importaciones masivas ilimitadas | *(vacío)* |
| `subscription.free.f3` (EN) | 1 bulk import per month | *(vacío)* |
| `subscription.free.f4` (EN) | Opening alerts for your future investments | Up to 3 opening alerts |
| `subscription.pro.f3` (EN) | Unlimited bulk imports | *(vacío)* |

Resto de claves intactas.

#### 2. `src/components/subscription/PricingTable.tsx`

- `freeFeatures`: eliminar línea `t('subscription.free.f3')` — queda array de 4 items (f1, f2, f4, f5)
- `proFeatures`: eliminar línea `t('subscription.pro.f3')` — queda array de 5 items (f1, f2, f4, f5, f6)

#### 3. `src/components/subscription/UpgradeModal.tsx`

- `proFeatures`: eliminar línea `t('subscription.pro.f3')` — queda array de 5 items (f1, f2, f4, f5, f6)

### Resultado visible

**Free (ES):**
1. Hasta 3 inversiones activas
2. Hasta 3 inversiones futuras
3. Hasta 3 avisos de apertura
4. Resumen fiscal indicativo

**Pro (ES):**
1. Inversiones activas ilimitadas
2. Inversiones futuras ilimitadas
3. Avisos de apertura sin límites
4. Informe fiscal unificado
5. Exportación del informe fiscal

**Free (EN):**
1. Up to 3 active investments
2. Up to 3 future investments
3. Up to 3 opening alerts
4. Indicative tax summary

**Pro (EN):**
1. Unlimited active investments
2. Unlimited future investments
3. Unlimited opening alerts
4. Unified tax report
5. Tax report export

No se renumera ninguna clave. `subscription.pro.f5` sigue apuntando a "Informe fiscal unificado" / "Unified tax report" y la `CardDescription` de PricingTable no se rompe.

