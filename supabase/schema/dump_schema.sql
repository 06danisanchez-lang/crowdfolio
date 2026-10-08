-- Genera el DDL del esquema `public` de producción (sin datos).
--
-- Uso: ejecutar esta consulta contra producción (Supabase MCP `execute_sql` o
-- SQL Editor) y guardar la columna `ddl`, en orden, en
-- supabase/schema/prod_schema.sql. La cabecera la añade quien la guarda
-- (ver CLAUDE.md, "Base de datos de pruebas").
--
-- Solo lee el catálogo; no modifica nada.
with
tables as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
parts as (
  -- 1. Tipos enum
  select 10 as ord, t.typname::text as k, format(
    'create type public.%I as enum (%s);', t.typname,
    (select string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)
       from pg_enum e where e.enumtypid = t.oid)) as ddl
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype = 'e'

  -- 2. Tablas con columnas, defaults y NOT NULL
  union all
  select 20, t.relname, format(e'create table public.%I (\n%s\n);', t.relname,
    (select string_agg(format('  %I %s%s%s', a.attname,
              format_type(a.atttypid, a.atttypmod),
              case when d.adbin is not null and a.attgenerated = '' then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end
              || case when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(d.adbin, d.adrelid) || ') stored' else '' end,
              case when a.attnotnull then ' not null' else '' end), e',\n' order by a.attnum)
       from pg_attribute a
       left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
       where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped))
  from tables t

  -- 3. Restricciones: PK/UNIQUE/CHECK primero, FK después
  union all
  select case when co.contype = 'f' then 32 else 30 end, t.relname || co.conname,
    format('alter table public.%I add constraint %I %s;', t.relname, co.conname, pg_get_constraintdef(co.oid))
  from pg_constraint co join tables t on t.oid = co.conrelid
  where co.contype in ('p', 'u', 'c', 'f', 'x')

  -- 4. Índices que no vienen de una restricción
  union all
  select 34, i.indexrelid::regclass::text, pg_get_indexdef(i.indexrelid) || ';'
  from pg_index i join tables t on t.oid = i.indrelid
  where not exists (select 1 from pg_constraint co where co.conindid = i.indexrelid)

  -- 5. Funciones de public
  union all
  select 40, p.proname || p.oid::text, pg_get_functiondef(p.oid) || ';'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'

  -- 6. Permisos de ejecución de funciones (solo si difieren del valor por defecto)
  union all
  select 42, p.proname || p.oid::text,
    format('revoke all on function %s from public;', p.oid::regprocedure)
    || coalesce((select string_agg(format(' grant execute on function %s to %s;', p.oid::regprocedure,
                   case when x.grantee = 0 then 'public' else quote_ident(r.rolname) end), '')
                 from aclexplode(p.proacl) x left join pg_roles r on r.oid = x.grantee
                 where x.privilege_type = 'EXECUTE'
                   and coalesce(r.rolname, 'public') in ('public', 'anon', 'authenticated', 'service_role')), '')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.proacl is not null

  -- 7. Triggers (de public y los de alta en auth.users)
  union all
  select 50, tg.tgname || tg.tgrelid::text, pg_get_triggerdef(tg.oid) || ';'
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not tg.tgisinternal and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))

  -- 8. RLS activado
  union all
  select 60, t.relname, format('alter table public.%I enable row level security;', t.relname)
    || case when t.relforcerowsecurity then format(' alter table public.%I force row level security;', t.relname) else '' end
  from tables t where t.relrowsecurity

  -- 9. Políticas
  union all
  select 70, p.tablename || p.policyname, format('create policy %I on public.%I as %s for %s to %s%s%s;',
    p.policyname, p.tablename, lower(p.permissive), lower(p.cmd),
    (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') from unnest(p.roles) r),
    case when p.qual is not null then ' using (' || p.qual || ')' else '' end,
    case when p.with_check is not null then ' with check (' || p.with_check || ')' else '' end)
  from pg_policies p where p.schemaname = 'public'

  -- 10. Permisos de tabla para los roles de la API
  union all
  select 80, t.relname || r.rolname, format('grant %s on public.%I to %I;',
    string_agg(distinct lower(x.privilege_type), ', '), t.relname, r.rolname)
  from pg_class c join tables t on t.oid = c.oid
  cross join lateral aclexplode(c.relacl) x
  join pg_roles r on r.oid = x.grantee
  where r.rolname in ('anon', 'authenticated', 'service_role')
    -- MAINTAIN solo existe desde Postgres 17; se omite para poder cargar en 16
    and x.privilege_type <> 'MAINTAIN'
  group by t.relname, r.rolname
)
select ddl from parts order by ord, k;
