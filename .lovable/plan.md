

# Plan: Configurar Stripe API Keys (Modo Live)

## Estado Actual
- El proyecto ya tiene el secret `STRIPE_SECRET_KEY` configurado
- Los Price IDs (`price_1Sojl3QUWwNtRMNN31qri8TI` y `price_1SojlIQUWwNtRMNNdCIqvHwD`) ya están correctamente configurados en el código
- Las Edge Functions (`create-checkout`, `check-subscription`, `customer-portal`) ya usan `STRIPE_SECRET_KEY`

## Acciones a Realizar

### 1. Actualizar STRIPE_SECRET_KEY
Actualizaré el secret existente con tu nueva clave live:
```
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
```

### 2. Publishable Key (Opcional)
La Publishable Key (`pk_live_...`) es segura para usar en el frontend, pero actualmente tu proyecto no la utiliza directamente ya que todo el procesamiento de Stripe se hace a través de Edge Functions con checkout sessions. No es necesario añadirla.

## Verificación Post-Configuración

Después de actualizar la clave, las siguientes funciones usarán el modo live:
- **create-checkout**: Crear sesiones de pago para suscripciones
- **check-subscription**: Verificar estado de suscripciones activas
- **customer-portal**: Permitir a usuarios gestionar su suscripción

## Advertencia de Seguridad

**IMPORTANTE**: Has compartido tu Secret Key live en el chat. Por seguridad, te recomiendo:
1. Aprobar este plan para que actualice la configuración
2. Una vez confirmado que funciona, ir a tu [Dashboard de Stripe](https://dashboard.stripe.com/apikeys) y rotar/regenerar la Secret Key
3. Volver a actualizarla aquí con la nueva clave

## Resumen de Cambios

| Acción | Detalle |
|--------|---------|
| Actualizar Secret | `STRIPE_SECRET_KEY` con clave live |
| Modo | Live (sk_live_*) - Pagos reales |

