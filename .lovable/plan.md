

# Fix: Eliminar "trialing" del filtro en check-subscription

## Problema raiz

La tabla `subscriptions` usa un enum `subscription_status` con valores: `free`, `active`, `past_due`, `canceled`.

El valor `"trialing"` NO existe en el enum. Cuando la edge function ejecuta:

```typescript
.in("status", ["active", "trialing"])
```

Postgres lanza un error de tipo `22P02: invalid input value for enum subscription_status: "trialing"`. Esto hace que `dbSubError` sea truthy, la funcion ignora la DB y cae al fallback de Stripe, que tampoco devuelve resultado.

## Solucion

Dos cambios en `supabase/functions/check-subscription/index.ts`:

### Cambio 1: Linea 57 - Filtrar solo por "active"

```diff
-      .in("status", ["active", "trialing"])
+      .in("status", ["active"])
```

Dado que el enum no tiene "trialing", no tiene sentido filtrarlo.

### Cambio 2 (opcional pero recomendado): Agregar "trialing" al enum

Si en el futuro Stripe envia suscripciones con status "trialing" y el webhook las guarda, necesitaremos el valor en el enum. Esto se haria con una migracion SQL:

```sql
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
```

Y entonces se podria restaurar el `.in("status", ["active", "trialing"])`.

### Recomendacion

Aplicar ambos cambios:
1. Agregar "trialing" al enum (migracion SQL)
2. Mantener `.in("status", ["active", "trialing"])` para cubrir futuros trials

### Resultado esperado

Tras el fix, la funcion leera correctamente la tabla `subscriptions`, encontrara las filas con `status = 'active'` y `current_period_end` en el futuro, y devolvera `subscribed: true` sin necesidad de llegar al fallback de Stripe.

## Sobre caching/service-worker

No hay evidencia de caching ni service workers. El problema es puramente el enum invalido en la query DB. Las edge functions se ejecutan contra el mismo proyecto Supabase (confirmado por los logs que muestran los mismos user IDs y emails que la DB).

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/check-subscription/index.ts` | Linea 57: filtro de status compatible con enum |
| Migracion SQL | Agregar "trialing" al enum `subscription_status` |

