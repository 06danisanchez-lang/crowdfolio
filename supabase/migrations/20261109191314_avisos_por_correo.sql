-- Avisos por correo (decisión de Dani del 09/11/2026).
--
-- Cada mañana, la Edge Function send-digest manda a cada usuario UN correo con lo
-- nuevo de su cartera: inversiones que vencen en los próximos 7 días y vencidas
-- sin cobrar. Solo lo que ocurre con el paso del tiempo (los impagos y retrasos los
-- marca el propio usuario). Solo si hay algo nuevo: cada aviso se manda una vez.
-- Solo fechas y estados: nada de importes ni de cálculo fiscal.
--
-- Esta migración:
--   1. Preferencia del usuario (activada por defecto) y una clave de baja para el
--      enlace «Dejar de recibir estos correos», que funciona sin iniciar sesión.
--   2. Registro de lo ya enviado (solo lo ve el servidor).
--   3. email_digest_pending(): qué toca avisar hoy y a quién. Solo service_role.
--   4. email_unsubscribe(token): la baja desde el enlace del correo.
--   5. Tarea diaria con pg_cron + pg_net que llama a send-digest con un secreto
--      guardado en Vault. En la base de pruebas no hay pg_net ni Vault: allí solo
--      se crean las funciones.

-- 1. Preferencia y clave de baja ─────────────────────────────────────────
alter table public.profiles add column if not exists email_notifications boolean not null default true;
alter table public.profiles add column if not exists email_unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_email_unsubscribe_token_key on public.profiles (email_unsubscribe_token);

-- El usuario puede activar o desactivar sus correos; la clave no la toca.
grant update (email_notifications) on public.profiles to authenticated;

-- 2. Registro de envíos ──────────────────────────────────────────────────
create table if not exists public.email_notification_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, dedupe_key)
);
alter table public.email_notification_log enable row level security;
revoke all on public.email_notification_log from anon, authenticated;

-- 3. Qué toca avisar ─────────────────────────────────────────────────────
-- Mismos criterios que la app (riskSummary.ts y useNotificationGenerator.ts):
--   maturity_soon  activa que vence hoy o en los próximos 7 días.
--   overdue        «Por confirmar», o activa con el vencimiento ya pasado.
-- La clave incluye la fecha: si el vencimiento se mueve, se avisa de nuevo.
create or replace function public.email_digest_pending(_today date default (now() at time zone 'Europe/Madrid')::date)
 returns table (
   user_id uuid,
   email text,
   kind text,
   investment_id uuid,
   project_name text,
   platform text,
   custom_platform_name text,
   event_date date,
   promised_date date,
   dedupe_key text
 )
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with items as (
    select i.user_id, 'overdue'::text as kind, i.id, i.project_name, i.platform, i.custom_platform_name,
           i.expected_end_date as event_date, i.original_end_date as promised_date,
           'overdue:' || i.id || ':' || coalesce(i.expected_end_date::text, '') as dedupe_key
      from public.investments i
     where i.status = 'pending'
        or (i.status = 'active' and i.expected_end_date < _today)
    union all
    select i.user_id, 'maturity_soon', i.id, i.project_name, i.platform, i.custom_platform_name,
           i.expected_end_date, i.original_end_date,
           'maturity_soon:' || i.id || ':' || i.expected_end_date
      from public.investments i
     where i.status = 'active'
       and i.expected_end_date between _today and _today + 7
  )
  select it.user_id, u.email::text, it.kind, it.id, it.project_name, it.platform, it.custom_platform_name,
         it.event_date, it.promised_date, it.dedupe_key
    from items it
    join auth.users u on u.id = it.user_id
    join public.profiles p on p.id = it.user_id
   where coalesce(u.is_anonymous, false) = false
     and u.email is not null
     and p.email_notifications
     and not p.is_demo
     and not exists (
       select 1 from public.email_notification_log l
        where l.user_id = it.user_id and l.dedupe_key = it.dedupe_key
     )
   order by it.user_id, it.kind, it.event_date nulls last;
$function$;

revoke all on function public.email_digest_pending(date) from public, anon, authenticated;
grant execute on function public.email_digest_pending(date) to service_role;

-- 4. Baja desde el enlace del correo ─────────────────────────────────────
create or replace function public.email_unsubscribe(_token uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  _n integer;
begin
  update public.profiles set email_notifications = false
   where email_unsubscribe_token = _token;
  get diagnostics _n = row_count;
  return _n > 0;
end;
$function$;

revoke all on function public.email_unsubscribe(uuid) from public;
grant execute on function public.email_unsubscribe(uuid) to anon, authenticated, service_role;

-- 5. Secreto de la tarea diaria ──────────────────────────────────────────
-- send-digest no exige sesión (la llama pg_cron): comprueba este secreto.
create or replace function public.email_digest_secret_ok(_secret text)
 returns boolean
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  return exists (
    select 1 from vault.decrypted_secrets
     where name = 'email_digest_cron_secret' and decrypted_secret = _secret
  );
end;
$function$;

revoke all on function public.email_digest_secret_ok(text) from public, anon, authenticated;
grant execute on function public.email_digest_secret_ok(text) to service_role;

do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net')
     and exists (select 1 from pg_namespace where nspname = 'vault')
     and exists (select 1 from pg_namespace where nspname = 'cron') then
    create extension if not exists pg_net;
    if not exists (select 1 from vault.secrets where name = 'email_digest_cron_secret') then
      perform vault.create_secret(
        replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
        'email_digest_cron_secret',
        'Secreto con el que pg_cron llama a la Edge Function send-digest');
    end if;
    -- 07:07 UTC = 08:07 en invierno y 09:07 en verano (hora de Madrid).
    perform cron.schedule('send-email-digest', '7 7 * * *', $cron$
      select net.http_post(
        url := 'https://eazwouasdrcbucxwjfxy.supabase.co/functions/v1/send-digest',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'email_digest_cron_secret')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000)
    $cron$);
  end if;
end
$do$;
