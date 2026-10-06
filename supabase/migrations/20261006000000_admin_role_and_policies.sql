-- Panel de administración: rol de admin, políticas de lectura y limpieza.
--
-- Estado de producción comprobado el 06/10/2026 (proyecto eazwouasdrcbucxwjfxy):
--   * user_roles existe (role text, 0 filas) con solo la política "Users can view own role".
--   * NO existen has_role() ni get_user_email() ni ninguna política de admin.
--   * delete-user (Edge Function) llama a has_role() y hoy siempre devuelve 403.
--   * El panel admin no puede funcionar: nadie es admin y RLS no deja leer datos ajenos.
--
-- NO APLICAR sin revisión. Aplicar desde el SQL Editor (no db push) y después
-- marcar como aplicada con `supabase migration repair --status applied 20261006000000`.

-- 1) has_role: usado por las políticas de abajo y por delete-user.
--    SECURITY DEFINER para poder leer user_roles sin depender de su RLS.
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke all on function public.has_role(uuid, text) from public, anon;
grant execute on function public.has_role(uuid, text) to authenticated, service_role;

-- 2) Lectura (solo SELECT) de datos de todos los usuarios para administradores.
--    Ninguna política de escritura: el admin no puede modificar datos ajenos desde la app.
create policy "Admins can view all investments"
  on public.investments for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view all payments"
  on public.payments for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can view all subscriptions"
  on public.subscriptions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 3) get_user_email ya no se usa: el panel lee el email de profiles (con la
--    política de arriba). La versión antigua de la migración 20260113202509
--    devolvía el email de CUALQUIER usuario a cualquier usuario autenticado;
--    por eso no se recrea. Si existiera en algún entorno, se elimina.
drop function if exists public.get_user_email(uuid);

-- 4) La política "Users can insert own subscription" permite a un usuario sin
--    fila en subscriptions crearse una con status 'active' desde el navegador.
--    Las filas las crean el trigger de alta (beta) y las Edge Functions con
--    service role, que no necesitan esta política.
drop policy if exists "Users can insert own subscription" on public.subscriptions;

-- 5) Dar el rol de admin a la cuenta principal (ejecutar a mano, una vez):
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = '06danisanchez@gmail.com';
