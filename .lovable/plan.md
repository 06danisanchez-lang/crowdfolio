

# Plan: Actualizar Edge Function a Producción con Price ID Correcto

## Problema Identificado

La Edge Function `create-checkout` tiene hardcodeados Price IDs de **modo test**:
- `price_1Sojl3QUWwNtRMNN31qri8TI` (mensual - TEST)
- `price_1SojlIQUWwNtRMNNdCIqvHwD` (anual - TEST)

Aunque las claves `sk_live` estén configuradas en Supabase, los Price IDs de test solo existen en el entorno de pruebas de Stripe, lo que causa el conflicto.

## Solución

### 1. Actualizar Edge Function `create-checkout`

Cambiar los Price IDs a los de producción:

```typescript
// ANTES (TEST)
const STRIPE_PRICES = {
  monthly: 'price_1Sojl3QUWwNtRMNN31qri8TI',
  yearly: 'price_1SojlIQUWwNtRMNNdCIqvHwD',
};

// DESPUÉS (PRODUCCIÓN)
const STRIPE_PRICES = {
  monthly: 'price_XXXX_MENSUAL_LIVE',  // Necesitarás proporcionar este
  yearly: 'price_1SwsPQQaxtKtYFASptg5zqXs',  // El que proporcionaste
};
```

Añadir logging de verificación del entorno:

```typescript
logStep("Environment check", { 
  keyPrefix: stripeKey?.substring(0, 7), // Mostrar "sk_live" o "sk_test"
});
```

### 2. Actualizar Configuración Frontend

Actualizar `src/lib/stripe/config.ts` con los Price IDs de producción para que la UI muestre los precios correctos.

### 3. Forzar Redespliegue

Redesplegar las Edge Functions para asegurar que usen las nuevas variables.

## Pregunta Importante

Antes de implementar, necesito confirmar:

**¿Cuál es el Price ID de producción para el plan MENSUAL (5,99€)?**

Solo me has proporcionado uno: `price_1SwsPQQaxtKtYFASptg5zqXs`

¿Este es el anual (59€) o el mensual (5,99€)? ¿Tienes el otro Price ID?

Si solo hay un producto/precio en producción, puedo:
- Usar el mismo para ambos (si es un precio único)
- O deshabilitar temporalmente una opción

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `supabase/functions/create-checkout/index.ts` | Actualizar STRIPE_PRICES con Price IDs live |
| `src/lib/stripe/config.ts` | Actualizar priceId en la configuración frontend |

## Próximos Pasos

1. Confirma los Price IDs de producción (mensual y anual)
2. Actualizaré ambos archivos con los valores correctos
3. Redesplegaré las Edge Functions
4. Verificarás el checkout en producción

