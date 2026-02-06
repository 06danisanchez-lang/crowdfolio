

## Corregir: Usuarios no aparecen en el Admin Dashboard

### Diagnostico

He investigado la base de datos y encontrado la causa raiz:

**La tabla `profiles` esta vacia** (0 filas), a pesar de que existen **4 usuarios registrados** en el sistema de autenticacion:

| Email | User ID |
|---|---|
| jesvivlc@gmail.com | e228e62b-... |
| prueba@gmail.com | e9390a4f-... |
| anllmar32@gmail.com | 0cbc1ef4-... |
| 80brunosanchez@gmail.com | b8de563c-... |

El hook `useAdminDashboard` construye la lista de usuarios a partir de la tabla `profiles`. Al estar vacia, el dashboard muestra 0 usuarios.

**Causa**: La funcion `handle_new_user()` existe en la base de datos, pero el **trigger** que deberia ejecutarla automaticamente al registrarse un usuario **no esta creado**. Por eso los perfiles nunca se insertaron.

Adicionalmente, solo 2 de los 4 usuarios tienen registro en la tabla `subscriptions`, lo que significa que el trigger `handle_new_user_subscription()` tampoco esta conectado.

### Solucion (2 pasos)

**Paso 1: Crear los triggers faltantes**

Crear una migracion SQL que:
1. Cree el trigger `on_auth_user_created` en `auth.users` que ejecute `handle_new_user()` para insertar perfiles automaticamente en futuros registros.
2. Cree el trigger `on_auth_user_created_subscription` en `auth.users` que ejecute `handle_new_user_subscription()` para insertar suscripciones automaticamente.

**Paso 2: Rellenar datos historicos**

Insertar los perfiles y suscripciones faltantes para los 4 usuarios existentes que se registraron antes de que los triggers estuvieran activos:
- Insertar los 4 perfiles en `profiles` con datos de `auth.users` (email y metadata).
- Insertar las 2 suscripciones faltantes en `subscriptions` para los usuarios que no la tienen.

### Detalle tecnico

**Migracion SQL necesaria:**

```sql
-- 1. Trigger para crear perfiles automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger para crear suscripciones automaticamente
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- 3. Backfill: insertar perfiles historicos
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 4. Backfill: insertar suscripciones historicas
INSERT INTO public.subscriptions (user_id, status, plan)
SELECT id, 'free', 'free'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT DO NOTHING;
```

**Archivos a modificar:** Ninguno. El codigo del hook `useAdminDashboard` y la pagina `AdminDashboard.tsx` ya funcionan correctamente. El problema es exclusivamente de datos faltantes en la base de datos.

**Resultado esperado:** Tras aplicar la migracion, el dashboard mostrara los 4 usuarios con sus datos de perfil, plan de suscripcion y las 6 inversiones existentes.

