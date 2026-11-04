-- Todas las políticas que usan auth.uid() lo llaman como (select auth.uid()), para que
-- Postgres lo calcule una vez por consulta y no por cada fila (lint 0003 de Supabase).
-- Si una política nueva lo usa a pelo, esta prueba lo avisa.
begin;

select tests.check(not exists (
  select 1 from pg_policies p,
    lateral (select coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as expr) e
  where p.schemaname = 'public'
    and regexp_count(e.expr, 'auth\.uid\(\)') <> regexp_count(e.expr, 'SELECT auth\.uid\(\)')
), 'hay políticas que llaman a auth.uid() por cada fila');

rollback;
