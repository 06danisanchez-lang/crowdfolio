-- Un usuario no puede pasar a otro una fila suya con UPDATE (cambiando user_id o la
-- inversión a la que cuelga). Las políticas de UPDATE no tienen WITH CHECK, pero
-- Postgres aplica el USING también a la fila nueva, así que el cambio se rechaza.
-- Se exige el error de RLS (42501) para que otro error no haga pasar la prueba.
-- Los UPDATE van sin WHERE a propósito (Ana tiene una sola fila de cada): con WHERE,
-- Postgres exige además la política de SELECT sobre la fila nueva y esa capa taparía
-- un fallo en la política de UPDATE.
begin;

create function pg_temp.rls_rechaza(_sql text, _msg text) returns void
language plpgsql as $$
begin
  execute _sql;
  raise exception 'FALLO: %', _msg;
exception
  when insufficient_privilege then null; -- 42501: bloqueada por RLS
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.local');

insert into public.investments (id, user_id, platform, project_name, amount, investment_date, expected_return) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Proyecto Ana', 1000, '2026-01-01', 10),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'housers', 'Proyecto Beto', 2000, '2026-01-01', 8);
insert into public.payments (id, investment_id, date, amount, type) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '2026-06-01', 50, 'interest');
insert into public.investment_schedule (id, investment_id, expected_date, expected_amount, type) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '2026-12-01', 50, 'interest');
insert into public.future_investments (id, user_id, platform, project_name) values
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Futura Ana');
insert into public.notifications (id, user_id, title, message) values
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Aviso', 'Aviso de Ana');
insert into public.opportunities (id, user_id, platform, project_name, expected_return, term) values
  ('60000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Oportunidad Ana', 9, 12);

select tests.login('00000000-0000-0000-0000-00000000000a');

-- Control: Ana sí puede editar lo suyo sin cambiar de dueño
update public.investments set project_name = 'Renombrado' where id = '10000000-0000-0000-0000-00000000000a';
select tests.check((select project_name from public.investments where id = '10000000-0000-0000-0000-00000000000a') = 'Renombrado',
  'Ana no puede editar su propia inversión');

select pg_temp.rls_rechaza(
  $$update public.investments set user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'Ana puede pasar su inversión a Beto');
select pg_temp.rls_rechaza(
  $$update public.payments set investment_id = '10000000-0000-0000-0000-00000000000b'$$,
  'Ana puede mover un cobro a la inversión de Beto');
select pg_temp.rls_rechaza(
  $$update public.investment_schedule set investment_id = '10000000-0000-0000-0000-00000000000b'$$,
  'Ana puede mover un cobro previsto a la inversión de Beto');
select pg_temp.rls_rechaza(
  $$update public.future_investments set user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'Ana puede pasar una inversión futura a Beto');
select pg_temp.rls_rechaza(
  $$update public.notifications set user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'Ana puede pasar un aviso a Beto');
select pg_temp.rls_rechaza(
  $$update public.opportunities set user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'Ana puede pasar una oportunidad a Beto');
select pg_temp.rls_rechaza(
  $$update public.profiles set id = '00000000-0000-0000-0000-0000000000cc'$$,
  'Ana puede cambiar el id de su perfil');

rollback;
