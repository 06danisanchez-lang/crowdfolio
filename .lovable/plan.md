

## Plan: Corregir Error de Google OAuth

### Problema Detectado
Al hacer clic en "Continuar con Google" aparece el error "Error al iniciar sesión con Google" sin más detalles. Esto puede deberse a varios factores:

1. **Configuración de OAuth en Lovable Cloud**: Es posible que Google OAuth no esté configurado correctamente
2. **Manejo de errores incompleto**: El código actual no muestra el mensaje de error específico
3. **Flujo de redirección**: El flujo de `lovable.auth.signInWithOAuth` podría estar fallando

### Solución Propuesta

#### 1. Mejorar el manejo de errores para ver el error real
Modificar el `GoogleButton.tsx` para mostrar el mensaje de error específico en lugar de uno genérico:

```typescript
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
  toast.error(`Error al iniciar sesión con Google: ${errorMessage}`);
  console.error('Google sign in error:', err);
}
```

#### 2. Verificar que el resultado del flujo Lovable se maneje correctamente
El problema podría estar en que `signInWithGoogle()` retorna un objeto con `error`, pero si `error` es `undefined` o `null`, no se lanza ninguna excepción. Necesitamos verificar el resultado correctamente:

```typescript
// Para dominios Lovable, usar el flujo normal con lovable auth
const result = await signInWithGoogle();
if (result.error) {
  throw result.error;
}
```

### Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/auth/GoogleButton.tsx` | Mejorar manejo de errores y mostrar mensaje detallado |

### Posibles Causas del Error

1. **Google OAuth no configurado**: Verificar en Lovable Cloud que Google Auth esté habilitado
2. **Redirect URLs incorrectas**: Asegurar que las URLs de redirección incluyan el dominio actual
3. **Error de red o timeout**: Problema temporal de conexión

### Código Corregido para `GoogleButton.tsx`

```typescript
const handleGoogleSignIn = async () => {
  setIsLoading(true);
  try {
    const isCustomDomain = 
      !window.location.hostname.includes('lovable.app') &&
      !window.location.hostname.includes('lovableproject.com');

    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const oauthUrl = new URL(data.url);
        const allowedHosts = ['accounts.google.com'];
        if (!allowedHosts.some(host => oauthUrl.hostname.includes(host))) {
          throw new Error('URL de OAuth inválida');
        }
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de OAuth');
      }
    } else {
      const result = await signInWithGoogle();
      if (result.error) {
        throw result.error;
      }
    }
  } catch (err) {
    // Mostrar mensaje de error más detallado
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    toast.error(`Error: ${errorMessage}`);
    console.error('Google sign in error details:', err);
  } finally {
    setIsLoading(false);
  }
};
```

### Pasos de Verificación

1. Aplicar los cambios de código
2. Probar nuevamente el login con Google
3. Si el error persiste, revisar el mensaje específico en la consola del navegador
4. Verificar la configuración de Google OAuth en Lovable Cloud

### Acción Recomendada

Antes de aplicar cambios, verifica que Google OAuth esté configurado en Lovable Cloud:

