
## Plan: Simplificar GoogleButton.tsx usando el flujo oficial de Lovable

### Situación Actual

El componente `GoogleButton.tsx` tiene una lógica compleja con:
- Detección manual de dominios personalizados
- Llamadas directas a `supabase.auth.signInWithOAuth()` con `skipBrowserRedirect`
- Validaciones de seguridad manuales (array `allowedHosts`)
- Dos flujos diferentes según el dominio

Esta complejidad ya no es necesaria porque **has configurado Google OAuth en Lovable Cloud**, que gestiona todo de forma segura y automática.

### Solución

Simplificar el componente para usar únicamente `signInWithGoogle()` del `AuthContext`, que internamente usa `lovable.auth.signInWithOAuth()` - el flujo oficial y seguro.

### Cambios a Realizar

**Archivo:** `src/components/auth/GoogleButton.tsx`

#### Código Simplificado:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
    {/* ... SVG paths sin cambios ... */}
  </svg>
);

export function GoogleButton() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        throw result.error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al iniciar sesión: ${errorMessage}`);
      console.error('Google sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          <GoogleIcon />
          Continuar con Google
        </>
      )}
    </Button>
  );
}
```

### Elementos Eliminados

| Elemento | Razón de eliminación |
|----------|---------------------|
| Import de `supabase` | Ya no se usa directamente |
| Detección de `isCustomDomain` | Lovable Cloud maneja todos los dominios |
| `supabase.auth.signInWithOAuth()` directo | Reemplazado por flujo oficial |
| `skipBrowserRedirect: true` | No necesario con Lovable auth |
| Array `allowedHosts` | Lovable Cloud valida URLs internamente |
| Validación manual de URL OAuth | Seguridad gestionada por el backend |
| Bifurcación de flujos | Un solo flujo unificado |

### Flujo Resultante

```text
Usuario pulsa "Continuar con Google"
         │
         ▼
┌─────────────────────────────────────────┐
│ signInWithGoogle() → AuthContext        │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ lovable.auth.signInWithOAuth("google")  │
│ → Gestión segura por Lovable Cloud      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Redirección a Google → Autorización     │
│ → Callback a crowdfolio.es              │
│ → Sesión establecida automáticamente    │
└─────────────────────────────────────────┘
```

### Beneficios

- ✅ **Código más limpio**: ~40 líneas menos
- ✅ **Mantenibilidad**: Un solo flujo fácil de entender
- ✅ **Seguridad**: Validaciones gestionadas por Lovable Cloud
- ✅ **Compatibilidad**: Funciona en todos los dominios (preview, lovable.app, crowdfolio.es)

### Resultado Esperado

Tras este cambio, el login con Google funcionará de forma transparente:
- En `crowdfolio.es` (dominio personalizado)
- En `crowdfolio.lovable.app` (dominio publicado)
- En el preview de desarrollo
