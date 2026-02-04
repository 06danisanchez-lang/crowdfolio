
## Diagnóstico (por qué “Pricing no funciona” ahora)
He revisado los logs de la función de pago y el error es consistente:

- La función `create-checkout` está ejecutándose con **`STRIPE_SECRET_KEY` en modo test** (los logs muestran `keyPrefix: "sk_test"`).
- Pero el checkout intenta usar **Price IDs de producción** (por ejemplo `price_1SwsPQQaxtKtYFASptg5zqXs`).
- Resultado: Stripe (en modo test) responde **`No such price`**, y la UI muestra el toast “No se pudo iniciar el proceso de pago…”.

Esto significa que el problema no es la página de pricing en sí, sino que el backend todavía está leyendo una clave **sk_test** en el entorno donde estás probando.

## Objetivo
1) Forzar que el sistema use **sk_live** en el entorno correcto.
2) Asegurar que el sistema reconoce la suscripción correctamente tras pagar (ahora mismo hay un segundo bug: `check-subscription` tiene Product IDs antiguos).
3) Redesplegar y verificar end-to-end.

---

## Cambios necesarios

### A) Asegurar claves live realmente activas (paso imprescindible)
1. **Reconfigurar `STRIPE_SECRET_KEY`** para que sea `sk_live_...` usando el flujo seguro (modal de secretos) desde Lovable Cloud.
2. Confirmar en logs que al invocar checkout aparece:
   - `Stripe key verified - { keyPrefix: "sk_live" }`

Nota: En Lovable Cloud existen entornos **Test (preview)** y **Live (publicado)**. Si pruebas en preview pero solo pusiste la clave live en Live, seguirás viendo `sk_test`. En la implementación verificaré y te guiaré para dejarlo correcto en el entorno que estés usando.

### B) Asegurar Price IDs de producción (ya en código, pero se valida)
Verificar que `create-checkout` usa exactamente:
- Mensual: `price_1SwtR9QaxtKtYFASkIW4VGNl`
- Anual: `price_1SwsPQQaxtKtYFASptg5zqXs`

(Esto ya está reflejado en tu diff.)

### C) Corregir `check-subscription` (bug crítico post-pago)
Ahora mismo `check-subscription` usa estos Product IDs antiguos:
- `prod_TmILDXzjeP7RY2`
- `prod_TmILACrcuLThuR`

Pero el frontend ya cambió a:
- `prod_TnQ71KYMnm4v1a`
- `prod_TnPWRPKu6evzqz`

Si no arreglamos esto, aunque el pago se complete, la app puede seguir mostrando plan “Gratis” o no activar el gating correctamente.

Implementación propuesta (más robusta):
- En `check-subscription`, determinar el plan **por `subscription.items.data[0].price.id` (Price ID)** en lugar de por productId.
  - Esto evita desajustes si cambian product IDs o si tienes varios precios por producto.
- Añadir log del `keyPrefix` también en `check-subscription` para confirmar `sk_live` en ese flujo.

### D) Hardening UX (recomendado para “no funciona” percibido)
1. En `openCheckout()` (frontend), usar una apertura más robusta:
   - Intentar `window.open(url, "_blank")`
   - Si el navegador bloquea popups (devuelve `null`), hacer fallback a `window.location.href = url`
2. Mejorar el mensaje de error mostrado en toast (sin exponer secretos):
   - Mostrar “Configuración de pagos en modo test/producción incorrecta” cuando el error sea “No such price”.

---

## Redespliegue total (cuando esté listo)
Tras actualizar secretos y código:
1. Redesplegar funciones:
   - `create-checkout`
   - `check-subscription`
   - `customer-portal` (para asegurar consistencia de clave)
2. Verificar con una llamada de prueba autenticada que `create-checkout` devuelve una `url` válida.
3. Probar flujo real en el dominio donde estás operando:
   - Clic “Empezar con Pro”
   - Stripe Checkout abre sin banner de test
   - Tras volver a la app, `check-subscription` detecta el plan correcto.

---

## Verificación (checklist de “listo para pagos reales”)
Consideraré el sistema listo cuando:
- Logs de `create-checkout` muestren `keyPrefix: "sk_live"`.
- `create-checkout` cree sesión correctamente para **mensual y anual**.
- En Stripe Checkout **no** aparezca indicador de test.
- Tras completar pago, `check-subscription` devuelva `subscribed: true` y `plan: "monthly"|"yearly"` correctamente (y la UI refleje Pro).

---

## Archivos involucrados
- `supabase/functions/create-checkout/index.ts` (validar price IDs + verificación de keyPrefix ya añadida)
- `supabase/functions/check-subscription/index.ts` (actualizar lógica de detección de plan a Price IDs + log keyPrefix)
- `src/contexts/SubscriptionContext.tsx` (fallback si popup bloqueado + mensaje de error más informativo)

---