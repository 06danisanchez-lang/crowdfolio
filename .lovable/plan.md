

## Plan: Solución Definitiva del Parpadeo (Enfoque Más Agresivo)

### Diagnóstico Actualizado

Después de una investigación exhaustiva:
- El código actual tiene los cambios correctos implementados
- Las pruebas en el navegador controlado funcionan correctamente
- Sin embargo, el problema persiste en tu entorno

Esto sugiere que hay **condiciones de carrera más sutiles** que solo se manifiestan en ciertos escenarios (como recargas rápidas del HMR, caché parcial, o timing específico del navegador).

### Solución Propuesta

Implementar un enfoque más robusto con las siguientes mejoras:

#### 1. Bloquear renderizado hasta que `hasBootstrapped` sea true (más estricto)

En lugar de solo mostrar un spinner mientras `isLoading` es true, bloquearemos el renderizado de toda la aplicación hasta que el bootstrap esté completo.

**Archivo:** `src/App.tsx`

```typescript
// Añadir un componente envolvente que bloquea todo hasta bootstrap
function AuthGate({ children }: { children: React.ReactNode }) {
  const { hasBootstrapped, isLoading } = useAuth();
  
  // Bloquear renderizado hasta que bootstrap esté completo
  if (!hasBootstrapped || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  return <>{children}</>;
}

// Envolver AppRoutes con AuthGate
const AppRoutes = () => (
  <AuthGate>
    <Routes>
      {/* ... rutas */}
    </Routes>
  </AuthGate>
);
```

#### 2. Usar `console.log` en lugar de `console.debug` para diagnósticos

El `console.debug` puede no aparecer en todos los entornos. Cambiaremos temporalmente a `console.log` para mejor visibilidad.

#### 3. Añadir un delay mínimo antes de cualquier redirección

Añadir un pequeño delay (50ms) antes de hacer redirecciones para asegurar que el estado esté completamente estabilizado:

```typescript
// En ProtectedRoute y PublicRoute
const [canRedirect, setCanRedirect] = useState(false);

useEffect(() => {
  if (hasBootstrapped && !isLoading) {
    const timer = setTimeout(() => setCanRedirect(true), 50);
    return () => clearTimeout(timer);
  }
}, [hasBootstrapped, isLoading]);

if (!canRedirect) {
  return <Spinner />;
}
```

#### 4. Simplificar la lógica de ProtectedRoute/PublicRoute

Eliminar los refs y useEffects complejos, reemplazándolos con una lógica más simple y predecible:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, hasBootstrapped, isLoading } = useAuth();

  // Siempre esperar a que bootstrap termine
  if (!hasBootstrapped || isLoading) {
    return <Spinner />;
  }

  // Ahora el estado es estable - decidir
  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
}
```

#### 5. Mantener el detector de bucles como red de seguridad

El `RedirectLoopFallback` se mantiene como última línea de defensa, pero con un umbral más bajo (4 redirecciones en 2 segundos).

### Flujo de Datos Propuesto

```text
Inicio de App
     │
     ▼
┌─────────────────────────────┐
│  AuthProvider inicializa    │
│  hasBootstrapped = false    │
│  isLoading = true           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  AuthGate bloquea           │
│  renderizado → Spinner      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  getSession() resuelve      │
│  setUser(), setSession()    │
│  hasBootstrapped = true     │
│  isLoading = false          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  AuthGate permite           │
│  renderizado de Routes      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  ProtectedRoute/PublicRoute │
│  evalúa user (estable)      │
│  → Redirige una sola vez    │
└─────────────────────────────┘
```

### Archivos a Modificar

1. **`src/contexts/AuthContext.tsx`**
   - Cambiar `console.debug` a `console.log` (temporalmente)
   - Asegurar que `hasBootstrapped` se exponga correctamente

2. **`src/App.tsx`**
   - Añadir componente `AuthGate`
   - Simplificar `ProtectedRoute` y `PublicRoute`
   - Reducir umbral del detector de bucles

### Verificación

Una vez implementados los cambios:
1. Abre el preview en modo incógnito
2. Observa que aparece el spinner brevemente
3. Confirma que la página se estabiliza en `/landing` sin parpadeos
4. Prueba ir a `/auth` y verifica estabilidad
5. (Opcional) Inicia sesión y verifica acceso al dashboard

### Sección Técnica

**Patrón clave:** El "AuthGate" actúa como un semáforo que bloquea todo el árbol de componentes hasta que el estado de autenticación está definitivamente resuelto. Esto es más robusto que confiar en que cada Route individual maneje su propio estado de carga.

**Trade-off:** Puede añadir unos milisegundos extra al tiempo de carga inicial, pero elimina completamente la posibilidad de ver estados intermedios o parpadeos.

