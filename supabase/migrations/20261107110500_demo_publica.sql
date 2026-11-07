-- Demo pública (crowdfolio.es/demo), decisión de Dani del 06-07/11/2026.
--
-- Cada visitante de la demo entra con un inicio de sesión ANÓNIMO de Supabase
-- (auth.users.is_anonymous = true): su propia cuenta, con sus propios datos de
-- ejemplo, aislada del resto por las mismas políticas RLS que cualquier usuario.
--
-- Esta migración:
--   1. Marca esas cuentas en profiles.is_demo, para que el panel de admin y las
--      cifras de captación no las cuenten como altas. El usuario no puede
--      cambiarla (profiles solo deja editar full_name, avatar_url,
--      pro_welcome_shown y updated_at).
--   2. Les da Pro 30 días, independiente de la beta: si un día se acaba el Pro
--      gratis de las altas, la demo sigue enseñando todas las funciones.
--   3. Borra cada día las cuentas anónimas de más de 7 días (con sus datos, por
--      el borrado en cascada). Con pg_cron, que en la base de pruebas no existe:
--      allí solo se crea la función.

-- 1. Marca de cuenta demo ────────────────────────────────────────────────
alter table public.profiles add column if not exists is_demo boolean not null default false;

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, full_name, is_demo)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.is_anonymous, false));
  return new;
end;
$function$;

-- 2. Pro de la demo ──────────────────────────────────────────────────────
create or replace function public.handle_new_user_subscription()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if coalesce(new.is_anonymous, false) then
    -- Demo: Pro 30 días (la cuenta se borra a los 7).
    insert into public.subscriptions (user_id, plan, status, pro_until, is_beta_pro)
    values (new.id, 'free', 'free', now() + interval '30 days', true)
    on conflict (user_id) do nothing;
  else
    -- Alta normal: Pro de beta hasta el fin de la beta (migración 20261104193134).
    insert into public.subscriptions (user_id, plan, status, pro_until, is_beta_pro)
    values (new.id, 'free', 'free', timestamptz '2027-12-31 23:59:59+01', true)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;

-- 3. Limpieza de cuentas demo ────────────────────────────────────────────
create or replace function public.purge_demo_accounts(_older_than interval default interval '7 days')
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _n integer;
begin
  delete from auth.users
   where is_anonymous is true
     and created_at < now() - _older_than;
  get diagnostics _n = row_count;
  return _n;
end;
$function$;

revoke all on function public.purge_demo_accounts(interval) from public, anon, authenticated;
grant execute on function public.purge_demo_accounts(interval) to service_role;

do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('purge-demo-accounts', '17 4 * * *', 'select public.purge_demo_accounts()');
  end if;
end
$do$;
