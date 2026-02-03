

# Plan: Actualizar el Secret STRIPE_SECRET_KEY

## Diagnóstico Confirmado

Los logs de las Edge Functions muestran claramente que se está usando una clave inválida:

```
Invalid API Key provided: mk_1SojX***************dG6x
```

El prefijo `mk_` no es una clave válida de Stripe. Las claves válidas son:
- **Test**: `sk_test_...`
- **Live**: `sk_live_...`

## Problema Raíz

El secret `STRIPE_SECRET_KEY` almacenado en Lovable Cloud contiene el valor incorrecto `mk_...`. Los redespliegues de las funciones no resuelven el problema porque estas siguen leyendo el mismo secret con el valor erróneo.

## Solución

Necesito que introduzcas la clave secreta correcta de Stripe a través del formulario seguro. Te mostraré un botón para actualizarla.

### Clave que debes introducir

Dependiendo del entorno que quieras usar:

| Entorno | Formato de la clave |
|---------|---------------------|
| Test (pruebas) | `sk_test_51Soj...` |
| Live (producción) | `sk_live_51Soj...` |

### Dónde encontrar tu clave

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copia la **Secret Key** (no la Publishable key)
3. Asegúrate de que empiece por `sk_test_` o `sk_live_`

## Pasos de Implementación

1. Te muestro el botón para actualizar la clave de Stripe
2. Introduces la clave correcta (`sk_test_...` o `sk_live_...`)
3. Redespliego las Edge Functions automáticamente
4. Verificamos que el checkout funciona

## Verificación

Después de actualizar la clave, los logs deberían mostrar:
- `Found Stripe customer` en lugar del error de API Key
- El checkout debería abrir correctamente la página de pago de Stripe

