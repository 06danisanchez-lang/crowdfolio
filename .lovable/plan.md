
# Plan: Redesplegar Edge Functions con Nuevos Secrets

## Diagnóstico
Los logs confirman que las funciones siguen usando la clave inválida `mk_1SojX...` en lugar de la nueva `sk_test_...` que configuraste. Esto ocurre porque las Edge Functions cachean los secrets hasta que se redesplegan.

## Estado Actual del Código
- **Price ID**: `price_1SojlIQUWwNtRMNNdCIqvHwD` ✅ Ya configurado en `create-checkout`
- **allow_promotion_codes**: `true` ✅ Ya habilitado
- **Variables de entorno**: Usan `STRIPE_SECRET_KEY` correctamente ✅

## Acciones a Realizar

### 1. Redesplegar todas las Edge Functions de Stripe
Forzar un redespliegue de las tres funciones para que carguen los nuevos secrets:
- `check-subscription`
- `create-checkout`  
- `customer-portal`

## Resultado Esperado
Después del redespliegue:
1. Las funciones usarán `sk_test_...` en lugar de `mk_...`
2. El checkout mostrará campo para código promocional
3. Podrás usar el cupón CROWDFOUNDER durante el pago

## Nota Técnica
El código no requiere cambios - está correctamente configurado para usar las variables de entorno de Supabase. Solo falta forzar el redespliegue para cargar los nuevos valores de los secrets.
