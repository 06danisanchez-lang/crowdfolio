
## Plan: Añadir Funcionalidad "Olvidé mi Contraseña"

### Resumen
Implementar un flujo completo de recuperación de contraseña que permita a los usuarios restablecer su contraseña mediante un enlace enviado a su email.

### Cambios a Realizar

#### 1. Modificar la página de autenticación (`src/pages/Auth.tsx`)
- Añadir un nuevo estado `view` que alterne entre: `login`, `signup`, `forgot-password`
- Añadir enlace **"¿Olvidaste tu contraseña?"** debajo del campo de contraseña (solo visible en modo login)
- Crear vista de recuperación con:
  - Campo de email
  - Botón "Enviar enlace de recuperación"
  - Mensaje de confirmación cuando se envía el email
  - Enlace para volver al login

#### 2. Crear página de restablecimiento (`src/pages/ResetPassword.tsx`)
- Nueva página para cuando el usuario hace clic en el enlace del email
- Formulario con:
  - Campo "Nueva contraseña"
  - Campo "Confirmar contraseña"
  - Validación de que coincidan
  - Botón "Restablecer contraseña"
- Redirigir al dashboard tras éxito

#### 3. Actualizar rutas (`src/App.tsx`)
- Añadir ruta `/reset-password` para la página de nueva contraseña
- Esta ruta debe ser accesible sin autenticación (el token viene en la URL)

#### 4. Actualizar contexto de autenticación (`src/contexts/AuthContext.tsx`)
- Añadir función `resetPassword(email)` que llama a `supabase.auth.resetPasswordForEmail()`
- Añadir función `updatePassword(newPassword)` que llama a `supabase.auth.updateUser()`

### Flujo del Usuario

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuario en Login                                            │
│     └── Clic en "¿Olvidaste tu contraseña?"                    │
│                                                                  │
│  2. Vista de Recuperación                                        │
│     └── Introduce email → Clic "Enviar enlace"                  │
│                                                                  │
│  3. Usuario recibe email                                         │
│     └── Clic en enlace de recuperación                          │
│                                                                  │
│  4. Página /reset-password                                       │
│     └── Introduce nueva contraseña → Clic "Restablecer"         │
│                                                                  │
│  5. Redirigido al Dashboard (logueado automáticamente)          │
└─────────────────────────────────────────────────────────────────┘
```

### Archivos Afectados

| Archivo | Acción |
|---------|--------|
| `src/pages/Auth.tsx` | Modificar - añadir vista de recuperación |
| `src/pages/ResetPassword.tsx` | Crear - página para nueva contraseña |
| `src/App.tsx` | Modificar - añadir ruta `/reset-password` |
| `src/contexts/AuthContext.tsx` | Modificar - añadir funciones de reset |

### Detalles Técnicos

**Llamadas a la API de autenticación:**
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })` - Envía email con enlace
- `supabase.auth.updateUser({ password })` - Actualiza la contraseña del usuario logueado

**URL de redirección del email:**
El enlace en el email redirigirá a `https://crowdfolio.lovable.app/reset-password` con un token especial que el sistema de autenticación procesa automáticamente para crear una sesión temporal.

**Validaciones:**
- Email válido antes de enviar
- Contraseña mínimo 6 caracteres
- Las contraseñas deben coincidir
