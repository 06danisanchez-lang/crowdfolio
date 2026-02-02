

## Plan: Configurar Google OAuth en Lovable Cloud

### Problema Identificado

Los logs de autenticación del backend muestran este error:
```
"error": "missing OAuth secret"
"msg": "400: Unsupported provider: missing OAuth secret"
```

Esto indica que **Google OAuth no tiene configuradas las credenciales necesarias** (Client ID y Client Secret) en Lovable Cloud.

### Causa Raíz

El código del `GoogleButton.tsx` funciona correctamente - el problema está en la configuración del backend:

| Componente | Estado |
|------------|--------|
| Código frontend | ✅ Correcto |
| Flujo de redirección | ✅ Correcto (pasa por supabase.co y vuelve con ?code=) |
| Credenciales OAuth | ❌ **No configuradas en Lovable Cloud** |

### Solución: Configurar Google OAuth en Lovable Cloud

Necesitas acceder al panel de Lovable Cloud y configurar Google OAuth. Hay dos opciones:

#### Opción A: Usar credenciales administradas por Lovable (Recomendado)
Lovable puede gestionar automáticamente las credenciales de Google OAuth. Solo necesitas habilitarlo en la configuración de autenticación.

#### Opción B: Usar tus propias credenciales de Google (BYOK)
Si prefieres usar tus propias credenciales:

1. **Crear credenciales en Google Cloud Console:**
   - Ve a https://console.cloud.google.com/apis/credentials
   - Crea un nuevo "OAuth 2.0 Client ID" de tipo "Web application"
   - En "Authorized redirect URIs", añade la URL de callback de Supabase:
     `https://vqazrgwjcglnqrmdcjdm.supabase.co/auth/v1/callback`

2. **Configurar en Lovable Cloud:**
   - Ve a la sección de autenticación
   - Activa Google como proveedor
   - Introduce el Client ID y Client Secret de Google

3. **Configurar Site URL y Redirect URLs:**
   - Site URL: `https://crowdfolio.es`
   - Redirect URLs: `https://crowdfolio.es/**`

### Pasos a Seguir

1. **Acceder a Lovable Cloud** usando el botón de abajo
2. **Navegar a la configuración de autenticación** (Users → Authentication Settings → Sign In Methods)
3. **Habilitar Google** como método de autenticación
4. **Configurar las URLs de redirección** para el dominio personalizado

### Flujo Correcto Después de la Configuración

```text
Usuario pulsa "Continuar con Google"
         │
         ▼
┌─────────────────────────────────────────┐
│ Supabase redirige a Google con          │
│ las credenciales OAuth configuradas     │
│ (actualmente falla aquí por             │
│ "missing OAuth secret")                 │
└────────────────────┬────────────────────┘
                     │
                     ▼
         Usuario autoriza en Google
                     │
                     ▼
   Google devuelve ?code= a Supabase
                     │
                     ▼
   Supabase intercambia el código por tokens
                     │
                     ▼
   Usuario redirigido a crowdfolio.es con sesión activa
```

### Resultado Esperado

Una vez configurado Google OAuth en Lovable Cloud:
- ✅ El login con Google funcionará tanto en crowdfolio.es como en el preview
- ✅ Se creará automáticamente un perfil en la tabla `profiles` (trigger existente)
- ✅ El usuario será redirigido al Dashboard

