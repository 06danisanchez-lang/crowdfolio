

# Plan: Habilitar Códigos Promocionales en Stripe Checkout

## Estado Actual
- El Price ID `price_1SojlIQUWwNtRMNNdCIqvHwD` (plan anual) ya está configurado correctamente
- Las claves `sk_test` y `pk_test` ya están en los Secrets de Supabase
- Falta habilitar `allow_promotion_codes` en la sesión de checkout

## Cambio Requerido

### Modificar create-checkout Edge Function
Añadir la opción `allow_promotion_codes: true` a la creación de la sesión de Stripe:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : user.email,
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  mode: "subscription",
  allow_promotion_codes: true,  // <-- AÑADIR ESTA LÍNEA
  success_url: `${origin}/?subscription=success`,
  cancel_url: `${origin}/?subscription=cancelled`,
  metadata: {
    user_id: user.id,
  },
});
```

## Pasos de Implementación

1. Editar `supabase/functions/create-checkout/index.ts`
2. Añadir `allow_promotion_codes: true` en la configuración de la sesión (línea 82)
3. Redesplegar la función `create-checkout`

## Resultado Esperado
- Al hacer checkout, aparecerá un campo para introducir código promocional
- El cupón "FOUNDER" (creado en Stripe Dashboard) podrá aplicarse durante el pago
- Los nuevos secrets `sk_test`/`pk_test` se usarán automáticamente

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/create-checkout/index.ts` | Añadir `allow_promotion_codes: true` |

