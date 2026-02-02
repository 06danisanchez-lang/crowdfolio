

## Plan: Añadir Login con Google

### Resumen
Configurar el login con Google OAuth añadiendo el botón "Continuar con Google" de forma prominente en las páginas de Login y Registro, con creación automática de perfil para usuarios nuevos.

### Cambios a Realizar

#### 1. Configurar Google OAuth en Lovable Cloud
Usar la herramienta de configuración de autenticación social para generar el módulo de Lovable Cloud que gestiona Google OAuth.

#### 2. Crear tabla `profiles` en la base de datos
Crear una tabla para almacenar información adicional de usuarios con creación automática mediante trigger.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 3. Modificar `Auth.tsx` - Añadir botón de Google
Añadir el botón "Continuar con Google" encima del formulario de email/contraseña.

```text
┌─────────────────────────────────────────┐
│           [Logo Crowdfolio]             │
│                                         │
│   Inicia sesión en tu cuenta            │
│                                         │
│   [🔵 Continuar con Google]             │ ← Nuevo
│                                         │
│   ──────── o ────────                   │ ← Separador
│                                         │
│   Email: [________________]             │
│   Contraseña: [____________]            │
│                                         │
│   [Iniciar Sesión]                      │
│                                         │
│   ¿No tienes cuenta? Regístrate         │
└─────────────────────────────────────────┘
```

#### 4. Añadir función `signInWithGoogle` al AuthContext
Exponer la función de login con Google a través del contexto de autenticación.

### Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| Base de datos | Crear tabla `profiles` + trigger |
| `src/integrations/lovable/` | Generar automáticamente (herramienta) |
| `src/contexts/AuthContext.tsx` | Añadir `signInWithGoogle` |
| `src/pages/Auth.tsx` | Añadir botón Google + separador |

### Diseño del Botón de Google

El botón seguirá el estilo oficial de Google:
- Fondo blanco con borde
- Icono de Google (SVG)
- Texto: "Continuar con Google"
- Ancho completo como el resto del formulario

### Flujo de Usuario

```text
Usuario hace clic en "Continuar con Google"
              ↓
    Redirección a Google OAuth
              ↓
    Usuario autoriza la aplicación
              ↓
    Callback a la aplicación
              ↓
    Trigger crea perfil automáticamente
              ↓
    AuthContext detecta sesión activa
              ↓
    Redirección al Dashboard (/)
```

### Detalles Técnicos

- Se usará `lovable.auth.signInWithOAuth("google")` del módulo de Lovable Cloud
- La redirección post-login se maneja mediante `redirect_uri: window.location.origin`
- El perfil se crea automáticamente con los datos de Google (nombre, avatar, email)
- RLS policies permitirán que cada usuario solo vea/edite su propio perfil

