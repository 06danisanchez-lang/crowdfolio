

## Plan: Solucionar el Parpadeo de la Web (Race Condition en Autenticación)

### Diagnóstico

El problema es una **race condition** en `AuthContext.tsx`. Actualmente:

1. Se configura `onAuthStateChange` (listener)
2. Se llama a `getSession()` (carga inicial)
3. **Ambos** llaman a `setIsLoading(false)` independientemente
4. El `checkAdminRole()` es asíncrono y puede terminar **después** de que `isLoading` ya sea `false`

Esto causa:
- El spinner desaparece antes de que la carga esté realmente completa
- El componente renderiza, detecta que no hay usuario (aún), redirige a `/landing`
- Luego llega la sesión, redirige de vuelta a `/`
- Resultado: **parpadeo y comportamiento inestable**

### Solución

Separar la **carga inicial** (que controla `isLoading`) de los **cambios posteriores** de autenticación:

```text
┌─────────────────────────────────────────────────────────────┐
│  CARGA INICIAL (controla isLoading)                         │
│  1. getSession()                                            │
│  2. await checkAdminRole() si hay usuario                   │
│  3. SOLO ENTONCES setIsLoading(false)                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  CAMBIOS POSTERIORES (NO afectan isLoading)                 │
│  - onAuthStateChange actualiza user/session                 │
│  - checkAdminRole() en segundo plano (fire & forget)        │
└─────────────────────────────────────────────────────────────┘
```

### Cambios en el Código

**Archivo:** `src/contexts/AuthContext.tsx`

Reescribir el `useEffect` para:

1. Usar un flag `isMounted` para evitar actualizaciones de estado tras desmontaje
2. **Carga inicial** (`initializeAuth`): Esperar a `getSession()` Y a `checkAdminRole()` antes de `setIsLoading(false)`
3. **Listener** (`onAuthStateChange`): Solo actualizar `user`, `session` e `isAdmin`, sin tocar `isLoading`

```typescript
useEffect(() => {
  let isMounted = true;

  // Listener para cambios POSTERIORES (NO controla isLoading)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);

      // Fire and forget - no await, no setIsLoading
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    }
  );

  // CARGA INICIAL (controla isLoading)
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      // Esperar checkAdminRole ANTES de setIsLoading(false)
      if (session?.user) {
        await checkAdminRole(session.user.id);
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, [checkAdminRole]);
```

### Por Qué Esto Soluciona el Problema

| Antes | Después |
|-------|---------|
| `isLoading=false` se llama desde 2 sitios (race condition) | `isLoading=false` solo se llama desde `initializeAuth` |
| `checkAdminRole` puede terminar después de que `isLoading=false` | Esperamos a `checkAdminRole` antes de `isLoading=false` |
| No hay protección contra actualizaciones tras desmontaje | Flag `isMounted` previene memory leaks |

### Resultado Esperado

- El spinner se muestra hasta que la sesión Y el rol de admin estén completamente cargados
- No hay parpadeos ni redirecciones intermedias
- La navegación es fluida desde el primer momento

### Sección Técnica

**Patrón utilizado:** Este es el patrón recomendado por Supabase para evitar race conditions en la inicialización de autenticación. La clave es:
- El listener `onAuthStateChange` se configura primero para no perder eventos
- Pero la carga inicial espera explícitamente a todas las operaciones asíncronas
- Solo hay UN lugar donde `isLoading` pasa a `false`: después de la carga inicial completa

