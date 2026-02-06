

## Nueva Pagina de Admin Dashboard en `/admin-dashboard`

### Estado actual
- El panel de admin actual esta embebido como una vista (`'admin'`) dentro de la pagina `Index.tsx`, no es una ruta separada.
- Las tablas `profiles` y `subscriptions` **no tienen politicas RLS para admins**, por lo que un admin no puede ver datos de otros usuarios desde estas tablas.
- La tabla `investments` y `assets` ya tienen politicas de admin configuradas.

### Cambios necesarios

#### 1. Base de datos: Nuevas politicas RLS para admin
Agregar politicas de lectura para admins en:
- **`profiles`**: `has_role(auth.uid(), 'admin')` para SELECT - permite al admin ver todos los perfiles
- **`subscriptions`**: `has_role(auth.uid(), 'admin')` para SELECT - permite al admin ver todas las suscripciones

Sin estas politicas, el admin no podria ver el plan ni el email de otros usuarios.

#### 2. Nuevo hook: `src/hooks/useAdminDashboard.ts`
Un hook dedicado que:
- Verifica rol admin via `user_roles`
- Consulta `profiles` (email, full_name)
- Consulta `subscriptions` (plan, status, current_period_end)
- Consulta `investments` para calcular volumen total por usuario
- Consulta `assets` para incluir tambien el modelo nuevo
- Combina todo en una estructura con:
  - KPIs: Total Usuarios, Usuarios Pro activos, Volumen Total Gestionado
  - Lista de usuarios con: nombre, email, plan, vencimiento, volumen gestionado

#### 3. Nueva pagina: `src/pages/AdminDashboard.tsx`
Pagina independiente con:
- **Header**: Titulo "Panel de Administracion" con icono Shield
- **3 Tarjetas KPI** superiores:
  - Total Usuarios (total de perfiles registrados)
  - Usuarios Pro Activos (subscriptions con status = 'active')
  - Volumen Total Gestionado (suma de investments.amount + assets.acquisition_cost)
- **Tabla principal** con columnas:
  - Usuario (full_name del perfil)
  - Email
  - Plan (badge: Free / Pro)
  - Vencimiento (current_period_end formateado, o "---" si free)
  - Boton "Ver Detalles" (expandira la fila para mostrar inversiones del usuario)
- **Estado de carga**: Skeleton loaders para las 3 tarjetas y la tabla mientras se reciben datos
- **Acceso denegado**: Si no es admin, muestra pantalla de acceso denegado
- Boton de volver al dashboard principal

#### 4. Ruta en `src/App.tsx`
Agregar ruta `/admin-dashboard` protegida con `ProtectedRoute`, que renderiza `AdminDashboard`.

#### 5. Navegacion
Agregar enlace al sidebar en `AppLayout.tsx` (solo visible para admins) que apunte a `/admin-dashboard` via `react-router-dom` Link/navigate.

### Detalle tecnico

**Migracion SQL:**
```text
-- Admin can read all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can read all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

**Estructura de datos del hook:**
```text
interface AdminUser {
  userId: string
  fullName: string | null
  email: string | null
  plan: 'free' | 'monthly' | 'yearly'
  subscriptionStatus: string
  subscriptionEnd: string | null
  totalInvested: number  // investments + assets
}

interface AdminDashboardSummary {
  totalUsers: number
  proUsers: number
  totalVolume: number
}
```

**Archivos a crear:**
- `src/pages/AdminDashboard.tsx` - Pagina principal
- `src/hooks/useAdminDashboard.ts` - Hook de datos

**Archivos a modificar:**
- `src/App.tsx` - Agregar ruta `/admin-dashboard`
- `src/components/layout/AppLayout.tsx` - Agregar link de navegacion para admins
- `src/types/investment.ts` - No necesita cambios, View ya incluye 'admin'

