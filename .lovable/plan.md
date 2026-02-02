

## Plan: Corregir Autenticación OAuth para Dominio Personalizado

### Problema Identificado
La autenticación con Google OAuth falla en el dominio personalizado `https://crowdfolio.es` porque el `auth-bridge` de Lovable interfiere con las redirecciones OAuth, enviando a los usuarios a URLs de preview incorrectas en lugar de al dominio personalizado.

### Solución
Implementar detección de dominio personalizado y usar `skipBrowserRedirect: true` para controlar manualmente la redirección OAuth, evitando el `auth-bridge`.

### Cambios a Realizar

#### 1. Configuración en Lovable Cloud (Manual)
Antes de implementar los cambios de código, debes verificar la configuración en el panel de Lovable Cloud:

| Configuración | Valor |
|---------------|-------|
| Site URL | `https://crowdfolio.es` |
| Redirect URLs | `https://crowdfolio.es/**` |

Para acceder a estos ajustes, ve a la sección de autenticación de Lovable Cloud.

#### 2. Modificar `GoogleButton.tsx`
Implementar lógica para detectar dominio personalizado y manejar la redirección manualmente:

```typescript
const handleGoogleSignIn = async () => {
  setIsLoading(true);
  try {
    // Detectar si estamos en un dominio personalizado
    const isCustomDomain = 
      !window.location.hostname.includes('lovable.app') &&
      !window.location.hostname.includes('lovableproject.com');

    if (isCustomDomain) {
      // Para dominios personalizados, usar supabase directamente
      // con skipBrowserRedirect para evitar el auth-bridge
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      // Validar URL OAuth antes de redirigir (seguridad)
      if (data?.url) {
        const oauthUrl = new URL(data.url);
        const allowedHosts = ['accounts.google.com'];
        if (!allowedHosts.some(host => oauthUrl.hostname.includes(host))) {
          throw new Error('Invalid OAuth redirect URL');
        }
        window.location.href = data.url;
      }
    } else {
      // Para dominios Lovable, usar el flujo normal
      const { error } = await signInWithGoogle();
      if (error) throw error;
    }
  } catch (err) {
    toast.error('Error al iniciar sesión con Google');
    console.error('Google sign in error:', err);
  } finally {
    setIsLoading(false);
  }
};
```

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/auth/GoogleButton.tsx` | Añadir detección de dominio y redirección manual |

### Flujo de Autenticación Corregido

```text
┌─────────────────────────────────────────────────────────────┐
│                    Usuario en crowdfolio.es                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ¿Es dominio personalizado?                                 │
│  hostname.includes('lovable.app')? → NO                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ SÍ (es personalizado)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Usar supabase.auth.signInWithOAuth directamente            │
│  con skipBrowserRedirect: true                              │
│  Esto evita el auth-bridge de Lovable                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Validar URL OAuth (solo accounts.google.com)               │
│  Redirigir manualmente con window.location.href             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Usuario autoriza en Google                                 │
│  → Callback a https://crowdfolio.es/                        │
│  → Sesión establecida correctamente                         │
└─────────────────────────────────────────────────────────────┘
```

### Pasos de Configuración Manual

Antes de probar, verifica estos ajustes en **Lovable Cloud**:

1. Ve a la configuración de autenticación de tu proyecto
2. En **Site URL**, configura: `https://crowdfolio.es`
3. En **Redirect URLs**, añade: `https://crowdfolio.es/**`
4. Guarda los cambios

### Seguridad

La implementación incluye validación de la URL OAuth para prevenir ataques de redirección abierta:
- Solo permite redirecciones a `accounts.google.com`
- Cualquier otra URL lanzará un error

### Resultado Esperado

Después de implementar estos cambios:
- ✅ Login con Google funcionará en `https://crowdfolio.es`
- ✅ Login con Google seguirá funcionando en dominios Lovable (preview y published)
- ✅ El usuario será redirigido al Dashboard tras autenticarse
- ✅ El perfil se creará automáticamente con datos de Google

