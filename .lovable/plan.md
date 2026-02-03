
# Plan: Checkout Público y Upgrade Libre para Usuarios Gratuitos

## Resumen

Implementar dos mejoras en el flujo de suscripción:
1. **Checkout público**: Usuarios no autenticados pueden acceder al checkout desde `/pricing` (serán redirigidos a login/registro y luego al checkout)
2. **Upgrade libre**: Usuarios con plan gratuito pueden actualizar a Pro en cualquier momento, sin esperar a alcanzar límites

## Análisis del Sistema Actual

### Problema 1: PricingTable requiere autenticación
- `useSubscription().openCheckout()` lanza error si no hay `session.access_token`
- Usuarios no logueados ven la página pero el botón falla

### Problema 2: Edge Function requiere token
- `create-checkout` valida obligatoriamente el header `Authorization`
- No soporta flujo de "guest checkout"

## Solución Propuesta

### Enfoque: Checkout con Redirección a Login

En lugar de implementar un checkout anónimo complejo (que requeriría vincular el pago a una cuenta creada posteriormente), optaremos por un flujo más simple y robusto:

1. Usuario no autenticado hace clic en "Empezar con Pro"
2. Se guarda la intención de checkout en sessionStorage
3. Se redirige a `/auth` con parámetro `?checkout=yearly` (o monthly)
4. Tras login/registro exitoso, el sistema detecta la intención y lanza el checkout automáticamente

```text
┌──────────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────────┐
│   /pricing   │────>│   /auth    │────>│  Dashboard  │────>│   Stripe     │
│ Click "Pro"  │     │  Login/    │     │  Auto-open  │     │  Checkout    │
│              │     │  Register  │     │  checkout   │     │              │
└──────────────┘     └────────────┘     └─────────────┘     └──────────────┘
```

## Implementación Técnica

### 1. Modificar PricingTable.tsx

Cambiar el botón de checkout para manejar usuarios no autenticados:

```typescript
const { user } = useAuth();
const navigate = useNavigate();

const handleCheckout = async (plan: 'monthly' | 'yearly') => {
  // Si no está autenticado, guardar intención y redirigir a login
  if (!user) {
    sessionStorage.setItem('pending_checkout_plan', plan);
    navigate('/auth?checkout=' + plan);
    return;
  }
  
  // Si está autenticado, proceder con checkout normal
  setIsLoading(plan);
  try {
    await openCheckout(plan);
  } catch (error) {
    // ...
  }
};
```

### 2. Modificar Auth.tsx

Detectar el parámetro `checkout` y mostrar mensaje contextual:

```typescript
// En useEffect o en la UI
const params = new URLSearchParams(location.search);
const checkoutPlan = params.get('checkout');

// Mostrar mensaje: "Inicia sesión para continuar con tu suscripción Pro"
```

### 3. Modificar SubscriptionContext.tsx

Detectar intención pendiente después del login y ejecutar checkout:

```typescript
useEffect(() => {
  if (user && session?.access_token) {
    const pendingPlan = sessionStorage.getItem('pending_checkout_plan');
    if (pendingPlan && ['monthly', 'yearly'].includes(pendingPlan)) {
      sessionStorage.removeItem('pending_checkout_plan');
      // Pequeño delay para asegurar que el dashboard cargó
      setTimeout(() => {
        openCheckout(pendingPlan as 'monthly' | 'yearly').catch(console.error);
      }, 1000);
    }
  }
}, [user, session?.access_token]);
```

### 4. Verificar BillingSettings.tsx (ya implementado)

El componente ya permite upgrade sin restricciones - los usuarios pueden hacer clic en "Actualizar a Pro" independientemente del número de inversiones.

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/subscription/PricingTable.tsx` | Añadir lógica para usuarios no autenticados |
| `src/pages/Auth.tsx` | Mostrar mensaje contextual para checkout pendiente |
| `src/contexts/SubscriptionContext.tsx` | Detectar y ejecutar checkout pendiente tras login |

## Flujos de Usuario

### Flujo 1: Usuario no autenticado desde /pricing
1. Visita `/pricing`
2. Hace clic en "Empezar con Pro" (anual)
3. Se guarda `pending_checkout_plan=yearly` en sessionStorage
4. Redirigido a `/auth?checkout=yearly`
5. Ve mensaje: "Inicia sesión para continuar con tu suscripción"
6. Completa login/registro
7. Redirigido al dashboard
8. SubscriptionContext detecta la intención pendiente
9. Abre automáticamente Stripe Checkout

### Flujo 2: Usuario gratuito ya logueado
1. Accede a `/pricing` o a Configuración > Facturación
2. Hace clic en "Empezar con Pro"
3. Se abre Stripe Checkout directamente
4. Completa el pago
5. Vuelve con `?subscription=success`

## Ventajas del Enfoque

- **Simple**: No requiere cambios en la edge function ni lógica de "guest checkout"
- **Seguro**: El pago siempre está vinculado a una cuenta autenticada
- **UX fluida**: El checkout se abre automáticamente tras el login
- **Sin duplicados**: Evita crear clientes Stripe huérfanos
