

## Proteccion de Ruta para /admin-dashboard

### Estado actual

La mayor parte de lo solicitado **ya esta implementado**:

- La ruta `/admin-dashboard` esta protegida con `ProtectedRoute` (requiere autenticacion).
- El componente `AdminDashboard` verifica `isAdmin` del contexto de autenticacion y muestra una pantalla de "Acceso Denegado" si el usuario no es admin.
- El enlace "Administracion" en el sidebar solo es visible para administradores.
- El rol de admin se verifica de forma segura mediante la tabla `user_roles` y la funcion `has_role()` (patron SECURITY DEFINER), no mediante un campo booleano en `profiles` (lo cual seria vulnerable a ataques de escalacion de privilegios).

### Unico cambio necesario

El comportamiento actual muestra una pantalla estatica de "Acceso Denegado". El usuario solicita **redireccion automatica** a la home (`/`). 

El cambio es minimo: en `AdminDashboard.tsx`, reemplazar el componente `AccessDenied` por un `<Navigate to="/" replace />` de React Router, para que el usuario no-admin sea redirigido automaticamente sin ver ninguna pantalla intermedia.

### Detalle tecnico

**Archivo a modificar:**
- `src/pages/AdminDashboard.tsx` - Reemplazar el renderizado de `<AccessDenied />` por `<Navigate to="/" replace />`, importando `Navigate` desde `react-router-dom`.

**Logica resultante:**
```text
if (!isAdmin) {
  return <Navigate to="/" replace />;
}
```

Esto significa que si un usuario no-admin accede directamente a `/admin-dashboard` (por URL), sera redirigido instantaneamente al dashboard principal sin ver ningun mensaje de error.

**Nota de seguridad:** El rol de admin NO se almacena en la tabla `profiles` ni se verifica con un campo `is_admin` booleano. Se utiliza una tabla separada `user_roles` con una funcion `has_role()` de tipo SECURITY DEFINER, que es el patron recomendado para evitar ataques de escalacion de privilegios. No se realizaran cambios en la base de datos.

**No se requieren cambios en:**
- `App.tsx` - La ruta ya existe y esta protegida
- `AppLayout.tsx` - El enlace de admin ya es condicional
- `AuthContext.tsx` - La verificacion de admin ya funciona correctamente
- Base de datos - Las politicas RLS y la tabla `user_roles` ya estan configuradas

