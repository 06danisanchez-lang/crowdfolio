-- Lo mínimo de Supabase que necesita la instantánea para cargarse en un
-- Postgres normal: roles de la API, esquema auth con auth.users y las
-- funciones auth.uid()/auth.role()/auth.jwt() que usan las políticas RLS.
-- Solo para la base de datos de pruebas (scripts/db-test.sh). Nunca en producción.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- auth: solo las columnas que usan los triggers de alta y las pruebas
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role() to anon, authenticated, service_role;

-- Ayudas para las pruebas: actuar como un usuario (o anónimo) dentro de la transacción.
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.login(_uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create or replace function tests.login_anon() returns void
language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  select set_config('role', 'anon', true);
$$;

-- Falla la prueba si la condición no se cumple.
create or replace function tests.check(_ok boolean, _msg text) returns void
language plpgsql as $$
begin
  if _ok is distinct from true then
    raise exception 'FALLO: %', _msg;
  end if;
end $$;

-- Falla la prueba si la sentencia NO da error (p. ej. RLS debe bloquearla).
create or replace function tests.must_fail(_sql text, _msg text) returns void
language plpgsql as $$
begin
  execute _sql;
  raise exception 'FALLO: %', _msg;
exception
  when raise_exception then raise;
  when others then null; -- bloqueada, como se esperaba
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
