
# Blindaje de Estabilidad Total - Implementacion

## Resumen

Implementacion completa para eliminar cualquier escenario de pantalla blanca, congelamiento o falta de respuesta. Se crean 4 archivos nuevos y se modifican 13 existentes.

---

## 1. Instrumentacion global (`src/main.tsx`)

Registrar handlers globales con `addEventListener('error', ...)` (no `window.onerror =`) y `addEventListener('unhandledrejection', ...)` antes de montar React. Logs estructurados listos para Sentry.

## 2. GlobalErrorBoundary (`src/components/GlobalErrorBoundary.tsx` - NUEVO)

ErrorBoundary de clase que envuelve toda la app (fuera de providers). Fallback con:
- Mensaje de error
- Boton "Recargar pagina"
- Boton "Reset app state" que ejecuta `resetAppState()`:
  - `localStorage.clear()`
  - `sessionStorage.clear()`
  - `queryClient.clear()` (TanStack v5 API)
  - `window.location.assign('/')` (no loops, no `.href`)

El `queryClient` se pasa como prop o se importa directamente (sin dependencia circular, ya que `queryClient` es un `const` exportado desde `App.tsx` o un modulo propio).

Para evitar dependencias circulares: mover `const queryClient = new QueryClient()` a un nuevo archivo `src/lib/queryClient.ts` e importarlo tanto en `App.tsx` como en `GlobalErrorBoundary.tsx`.

## 3. QueryClient extraido (`src/lib/queryClient.ts` - NUEVO)

```text
export const queryClient = new QueryClient();
```

Se importa en `App.tsx` y en `GlobalErrorBoundary`. Elimina dependencia circular.

## 4. App.tsx - Envolver con GlobalErrorBoundary

```text
<GlobalErrorBoundary>
  <QueryClientProvider client={queryClient}>
    ...todo el arbol actual...
  </QueryClientProvider>
</GlobalErrorBoundary>
```

## 5. AuthContext - Timeout 10s con limpieza

En `initializeAuth`:
- Crear timeout con `setTimeout` de 10s que pone un flag `timedOut = true`
- `Promise.race([getSession(), timeoutPromise])`
- En el `.then` del race: si `timedOut`, ignorar resultado tardio
- En el timeout handler: solo actuar si la promise no resolvio aun
- Patron con flag compartido `let resolved = false`:

```text
let resolved = false;
const timeoutId = setTimeout(() => {
  if (!resolved) {
    resolved = true;
    clearTimeout(timeoutId);
    // set bootstrapped, user=null, isLoading=false
  }
}, 10_000);

try {
  const result = await supabase.auth.getSession();
  clearTimeout(timeoutId);
  if (resolved) return; // timeout ya disparo, ignorar
  resolved = true;
  // set session from result
} catch {
  clearTimeout(timeoutId);
  if (resolved) return;
  resolved = true;
  // fallback
} finally {
  // guaranteed bootstrap
}
```

## 6. SubscriptionContext - Timeout 8s con limpieza

Mismo patron que Auth: flag `resolved`, `clearTimeout` en ambas ramas, respuesta tardia ignorada.

## 7. Hooks estandarizados - Patron comun

Para cada hook critico, implementar:

- **requestId incremental** via `useRef(0)` (no `Date.now()`):
  ```text
  const requestIdRef = useRef(0);
  ```
- **Timeout de 15s** que usa la misma compuerta de requestId:
  ```text
  const currentId = ++requestIdRef.current;
  const timeoutId = setTimeout(() => {
    if (requestIdRef.current !== currentId) return; // stale
    setIsLoading(false);
    setError('Timeout...');
  }, 15_000);
  ```
- **try/catch/finally** donde `finally` siempre hace `clearTimeout(timeoutId)` y solo escribe estado si `requestIdRef.current === currentId`
- **error state** expuesto: `{ error, refetch }` en el return
- **Cleanup en useEffect**: al desmontar, incrementar requestId para invalidar cualquier respuesta pendiente

Hooks afectados (8):
| Hook | Archivo |
|------|---------|
| useOpportunities | `src/hooks/useOpportunities.ts` |
| usePlatforms | `src/hooks/usePlatforms.ts` |
| useTaxSummary | `src/hooks/useTaxSummary.ts` |
| useTaxExpenses | `src/hooks/useTaxExpenses.ts` |
| useNotifications | `src/hooks/useNotifications.ts` |
| useOpportunityAlerts | `src/hooks/useOpportunityAlerts.ts` |
| useTransactions | `src/hooks/useTransactions.ts` |
| useAssets | `src/hooks/useAssets.ts` |

`useInvestments` ya tiene timeout + isMountedRef; se le anade `error` state y se migra a requestId incremental.

## 8. ErrorState component (`src/components/ui/error-state.tsx` - NUEVO)

Componente reutilizable con icono de alerta, mensaje y boton "Reintentar".

## 9. Index.tsx - Errores visibles en vistas

En las vistas de dashboard/investments/opportunities: si el hook devuelve `error`, mostrar `<ErrorState message={error} onRetry={refetch} />` en lugar de datos vacios.

## 10. DebugPanel (`src/components/DebugPanel.tsx` - NUEVO)

Panel flotante activable con `?debug=1`:
- Estado auth: user truncado, hasBootstrapped, isLoading
- Estado subscription: plan, isLoading
- Conteo de `[data-radix-portal]` y `[data-radix-dismissable-layer]` via querySelectorAll (polling cada 2s)
- Claves de localStorage (solo nombres, sin valores sensibles)
- Boton "Reset app state"

Se monta condicionalmente en App.tsx. Sin contexto extra - lee directamente del DOM y de los contextos existentes.

## Archivos nuevos (4)

| Archivo | Descripcion |
|---------|-------------|
| `src/lib/queryClient.ts` | QueryClient singleton |
| `src/components/GlobalErrorBoundary.tsx` | ErrorBoundary raiz con reset |
| `src/components/ui/error-state.tsx` | Componente error reutilizable |
| `src/components/DebugPanel.tsx` | Panel diagnostico ?debug=1 |

## Archivos modificados (13)

| Archivo | Cambios |
|---------|---------|
| `src/main.tsx` | addEventListener error + unhandledrejection |
| `src/App.tsx` | Import queryClient desde lib, envolver con GlobalErrorBoundary, montar DebugPanel |
| `src/contexts/AuthContext.tsx` | Timeout 10s con flag resolved + cleanup |
| `src/contexts/SubscriptionContext.tsx` | Timeout 8s con flag resolved + cleanup |
| `src/hooks/useOpportunities.ts` | + error, requestId, timeout |
| `src/hooks/usePlatforms.ts` | + error, requestId, timeout |
| `src/hooks/useTaxSummary.ts` | + error, requestId, timeout |
| `src/hooks/useTaxExpenses.ts` | + error, requestId, timeout |
| `src/hooks/useNotifications.ts` | + error, requestId, timeout |
| `src/hooks/useOpportunityAlerts.ts` | + error, requestId, timeout |
| `src/hooks/useTransactions.ts` | + error, requestId, timeout |
| `src/hooks/useAssets.ts` | + error, requestId, timeout |
| `src/hooks/useInvestments.ts` | + error state, migrar a requestId |
| `src/pages/Index.tsx` | ErrorState en vistas con error |

## Lista de validacion manual

1. **Network Offline** en DevTools: tras 10-15s aparece UI (no blanco), con error y Reintentar
2. **Bloquear dominio Supabase**: Auth timeout a 10s, app renderiza landing
3. **Edge function lenta**: subscription timeout 8s, cae a plan free
4. **Throttle a Slow 3G + navegar rapido** entre vistas: sin spinners eternos, sin doble escritura
5. **Abrir/cerrar popovers/selects** 10 veces: sin overlays residuales
6. **throw new Error('test')** en componente: GlobalErrorBoundary captura con fallback visible
7. **?debug=1**: panel muestra estado correcto, conteo overlays, Reset funciona
8. **Perfil nuevo Chrome** (no incognito) + extensiones activas: simula estado persistido corrupto, verificar que Reset limpia y la app arranca limpia
9. **localStorage corrupto** (ej. `localStorage.setItem('sb-xxx-auth-token', 'basura')`): verificar que Auth timeout se dispara y app no queda en blanco
