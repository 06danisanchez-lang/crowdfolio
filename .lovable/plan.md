

# Fix: Cambiar .single() por .maybeSingle() en edge functions

## Problema

Cuando un usuario no tiene fila en `profiles`, `.single()` lanza una excepcion que mata la funcion. Esto causa "Failed to load response data" en el navegador.

## Cambios

### Archivo 1: `supabase/functions/create-checkout/index.ts` (linea 69)

Cambiar `.single()` por `.maybeSingle()` en la lectura de `profiles.stripe_customer_id`.

### Archivo 2: `supabase/functions/check-subscription/index.ts` (linea 67)

Cambiar `.single()` por `.maybeSingle()` en la lectura de `profiles.stripe_customer_id`.

Ambos archivos ya manejan el caso `null` correctamente (`profile?.stripe_customer_id || null`), asi que no se necesita ningun otro cambio.

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/create-checkout/index.ts` | `.single()` -> `.maybeSingle()` |
| `supabase/functions/check-subscription/index.ts` | `.single()` -> `.maybeSingle()` |

Total: 2 archivos, 1 linea cada uno.

