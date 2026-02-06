

## Eliminar usuarios desde el Panel de Administracion

### Resumen

Se creara una funcion backend segura que permite a los administradores eliminar usuarios de prueba (o cualquier usuario) directamente desde el panel de administracion. Gracias a que todas las tablas del sistema tienen `ON DELETE CASCADE` vinculado a `auth.users`, al eliminar el usuario de autenticacion se eliminan automaticamente todos sus datos (inversiones, assets, transacciones, perfil, suscripcion, etc.).

### Cambios necesarios

#### 1. Nueva funcion backend: `delete-user`

Crea un endpoint seguro que:
- Verifica que el solicitante tiene el token de autenticacion valido
- Confirma que el solicitante tiene rol `admin` consultando la tabla `user_roles`
- Impide que el admin se elimine a si mismo (proteccion de seguridad)
- Usa la API de administracion para eliminar el usuario de `auth.users`, lo cual borra en cascada todos los datos asociados en las tablas publicas

**Archivo:** `supabase/functions/delete-user/index.ts`

#### 2. Boton "Eliminar" en el panel lateral de detalle del usuario

Se anadira un boton rojo "Eliminar Usuario" en la parte inferior del componente `AdminUserDetailSheet`. Al pulsarlo:
- Aparece un dialogo de confirmacion con el email del usuario para evitar borrados accidentales
- Si se confirma, llama a la funcion backend
- Si tiene exito, cierra el panel y refresca la lista de usuarios
- Si falla, muestra un mensaje de error

**Archivo modificado:** `src/components/admin/AdminUserDetailSheet.tsx`

#### 3. Refrescar datos tras eliminar

Se pasara un callback `onUserDeleted` desde `AdminDashboard` al componente `AdminUserDetailSheet` para invalidar la query de datos y refrescar la tabla automaticamente.

**Archivo modificado:** `src/pages/AdminDashboard.tsx`

### Flujo de usuario

```text
Admin abre panel de un usuario
       |
       v
Hace clic en "Eliminar Usuario" (boton rojo)
       |
       v
Aparece dialogo: "Vas a eliminar a user@email.com y todos sus datos. Esta accion es irreversible."
       |
  [Cancelar]  [Eliminar]
                  |
                  v
         POST /delete-user { userId }
                  |
            +-----+------+
            |            |
         Exito        Error
            |            |
     Cierra panel   Muestra toast
     Refresca tabla  de error
```

### Detalles tecnicos

**Edge Function (`delete-user`):**
- Recibe `{ userId: string }` en el body
- Usa `SUPABASE_SERVICE_ROLE_KEY` para acceder a `supabase.auth.admin.deleteUser(userId)`
- Valida el rol admin del solicitante con la funcion `has_role` de la base de datos
- Devuelve 200 si exito, 403 si no es admin, 400 si intenta eliminarse a si mismo

**Protecciones de seguridad:**
- Solo administradores verificados del lado servidor pueden ejecutar la eliminacion
- Se impide la auto-eliminacion del admin
- Se requiere confirmacion explicita en la UI antes de proceder
- Todas las tablas ya tienen `ON DELETE CASCADE`, por lo que no se necesitan migraciones de base de datos

**Componentes UI utilizados:**
- `AlertDialog` (ya disponible) para la confirmacion
- `Button` con variante `destructive` para el boton de eliminar
- `toast` de Sonner para feedback de exito/error

