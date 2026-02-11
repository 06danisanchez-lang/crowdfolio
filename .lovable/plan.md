

## Apartado de cuenta interactivo: User Menu + Perfil + Configuracion

### Resumen

Reemplazar los botones visibles del bloque inferior del sidebar por una fila clicable con avatar, nombre y chevron que abre un DropdownMenu. Crear dos nuevas paginas (/perfil y /configuracion) con funcionalidades de gestion de cuenta.

### 1. Base de datos

**Storage bucket** (migracion SQL):
- Crear bucket `avatars` (publico) para fotos de perfil
- Politica RLS: usuarios pueden subir/actualizar/eliminar solo sus propios avatares (path = `{user_id}/`)

No se necesitan cambios en la tabla `profiles` ya que tiene `full_name` y `avatar_url`.

### 2. Tipo View

**Archivo:** `src/types/investment.ts`

Anadir `'profile'` al tipo `View`:
```
export type View = 'dashboard' | 'investments' | 'opportunities' | 'platforms' | 'tax' | 'settings' | 'profile' | 'admin';
```

### 3. Hook useProfile

**Archivo nuevo:** `src/hooks/useProfile.ts`

Hook que:
- Carga `full_name` y `avatar_url` desde la tabla `profiles`
- Expone `updateProfile(full_name)` para guardar nombre
- Expone `uploadAvatar(file)` que sube a storage `avatars/{userId}/avatar.ext` y actualiza `avatar_url` en profiles
- Expone `removeAvatar()` que elimina del storage y pone `avatar_url = null`
- Usa react-query para cache y revalidacion

### 4. Sidebar - Bloque inferior interactivo

**Archivo:** `src/components/layout/AppLayout.tsx`

Reemplazar el bloque inferior actual (Avatar + email + boton modo oscuro + boton cerrar sesion) por:

- Una fila clicable que muestra:
  - Avatar (con `AvatarImage` si hay `avatar_url`, si no `AvatarFallback` con inicial)
  - Nombre del usuario (full_name del perfil, fallback al email)
  - Icono `ChevronUp` a la derecha
- Al hacer clic se abre un `DropdownMenu` (hacia arriba, side="top") con:
  - **Perfil** (icono User) - navega a vista profile
  - **Configuracion** (icono Settings) - navega a vista settings
  - `DropdownMenuSeparator`
  - **Cerrar sesion** (icono LogOut, estilo destructivo con `text-destructive`)

El toggle de modo oscuro se mueve a la pagina de Configuracion (preferencias).

Imports adicionales: `ChevronUp`, `User`, `Settings` de lucide-react; `DropdownMenu*` de `@/components/ui/dropdown-menu`; `AvatarImage` de `@/components/ui/avatar`.

### 5. Pagina Perfil

**Archivo nuevo:** `src/pages/Profile.tsx` (o como vista en Index.tsx)

Se renderiza cuando `currentView === 'profile'` dentro de `Index.tsx`.

Contenido:
- Titulo "Mi Perfil"
- Seccion foto de perfil:
  - Avatar grande (80x80)
  - Botones: "Subir foto" (input file oculto), "Eliminar" (si hay foto)
  - Validacion: solo imagenes, max 2MB
- Campo "Nombre visible" (input editable, guardado con boton)
- Campo "Email" (input de solo lectura, deshabilitado)
- Boton "Guardar cambios"

### 6. Pagina Configuracion (actualizar vista existente)

**Archivo:** vista `settings` en `src/pages/Index.tsx`

Reestructurar la vista settings para incluir:

**Seccion Seguridad:**
- Cambiar contrasena: formulario con contrasena actual (opcional), nueva contrasena, confirmar. Usa `updatePassword` del AuthContext.
- Cambiar email: formulario con nuevo email. Usa `supabase.auth.updateUser({ email })`.

**Seccion Preferencias:**
- Toggle tema oscuro/claro (mover aqui desde el sidebar)

**Seccion Suscripcion:**
- Mantener el `BillingSettings` existente

### 7. Rutas (sin cambio)

No se crean rutas nuevas en `App.tsx`. Las vistas `profile` y `settings` se renderizan dentro de `Index.tsx` como las demas vistas, controladas por `currentView`.

### 8. Mobile header

Sin cambios en el header movil (mantiene los iconos actuales). Opcionalmente se puede anadir el mismo DropdownMenu en mobile, pero por ahora se mantiene simple.

### Detalle tecnico - Archivos modificados/creados

| Archivo | Accion |
|---------|--------|
| Migracion SQL (storage bucket) | Crear bucket `avatars` + RLS |
| `src/types/investment.ts` | Anadir `'profile'` a View |
| `src/hooks/useProfile.ts` | **Nuevo** - hook para perfil |
| `src/components/layout/AppLayout.tsx` | Reemplazar bloque inferior por DropdownMenu |
| `src/pages/Index.tsx` | Anadir vista `profile`, reestructurar vista `settings` |

### Reglas de negocio

- Si el usuario no ha definido nombre, mostrar el email como fallback en el sidebar
- Foto de perfil guardada en storage, URL en `profiles.avatar_url`
- El bloque inferior del sidebar se mantiene fijo al fondo (estructura flex existente)
- El DropdownMenu abre hacia arriba (`side="top"`) para no quedar cortado

