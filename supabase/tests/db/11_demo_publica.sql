-- Demo pública: las cuentas anónimas quedan marcadas, tienen Pro, no ven nada
-- ajeno, no pueden quitarse la marca y se borran a los 7 días.
begin;

create function pg_temp.sin_permiso(_sql text, _msg text) returns void
language plpgsql as $$
begin
  execute _sql;
  raise exception 'FALLO: %', _msg;
exception
  when insufficient_privilege then null;
end $$;

insert into auth.users (id, email, is_anonymous, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'real@test.local', false, now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000d0', null, true, now()),
  ('00000000-0000-0000-0000-0000000000d9', null, true, now() - interval '8 days');

insert into public.investments (id, user_id, platform, project_name, amount, investment_date, expected_return) values
  ('20000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 'urbanitae', 'Real', 1000, '2026-01-01', 10),
  ('20000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d9', 'urbanitae', 'Demo vieja', 1000, '2026-01-01', 10);
insert into public.payments (investment_id, date, amount, type) values
  ('20000000-0000-0000-0000-0000000000e1', '2026-06-01', 50, 'interest');

-- Marca y Pro
select tests.check((select not is_demo from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  'una cuenta real queda marcada como demo');
select tests.check((select is_demo from public.profiles where id = '00000000-0000-0000-0000-0000000000d0'),
  'una cuenta anónima no queda marcada como demo');
select tests.check((select is_beta_pro and pro_until > now() + interval '29 days' and pro_until < now() + interval '31 days'
    from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000d0'),
  'la cuenta demo no recibe 30 días de Pro');
select tests.check((select pro_until = timestamptz '2027-12-31 23:59:59+01'
    from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000e1'),
  'el alta normal deja de recibir el Pro de beta');

-- La demo no ve nada ajeno ni puede escribir a nombre de otro
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000d0', 'role', 'authenticated', 'is_anonymous', true)::text, true);
select set_config('role', 'authenticated', true);

select tests.check((select count(*) from public.investments) = 0, 'la demo ve inversiones ajenas');
select tests.check((select count(*) from public.payments) = 0, 'la demo ve cobros ajenos');
select tests.check((select count(*) from public.profiles) = 1, 'la demo ve perfiles ajenos');
select tests.check((select count(*) from public.subscriptions) = 1, 'la demo ve suscripciones ajenas');
select tests.must_fail(
  $$insert into public.payments (investment_id, date, amount, type)
    values ('20000000-0000-0000-0000-0000000000e1', '2026-07-01', 1, 'interest')$$,
  'la demo puede añadir cobros a una inversión real');
with u as (update public.investments set notes = 'x' where id = '20000000-0000-0000-0000-0000000000e1' returning 1)
select tests.check((select count(*) from u) = 0, 'la demo puede modificar una inversión real');

-- Sí trabaja con lo suyo
insert into public.investments (user_id, platform, project_name, amount, investment_date, expected_return)
  values ('00000000-0000-0000-0000-0000000000d0', 'wecity', 'Ejemplo', 500, '2026-01-01', 9);
select tests.check((select count(*) from public.investments) = 1, 'la demo no puede crear sus inversiones');

select pg_temp.sin_permiso(
  $$update public.profiles set is_demo = false where id = '00000000-0000-0000-0000-0000000000d0'$$,
  'la demo puede quitarse la marca is_demo');
select tests.must_fail($$select public.purge_demo_accounts()$$, 'un usuario puede lanzar la limpieza');

-- Limpieza: solo anónimas de más de 7 días, con sus datos
reset role;
select set_config('request.jwt.claims', '', true);

select tests.check(public.purge_demo_accounts() = 1, 'la limpieza no borra exactamente la demo vieja');
select tests.check(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d9'), 'la demo vieja sigue');
select tests.check(not exists (select 1 from public.investments where id = '20000000-0000-0000-0000-0000000000d9'),
  'los datos de la demo vieja siguen');
select tests.check(exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d0'), 'la limpieza borra la demo reciente');
select tests.check(exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), 'la limpieza borra una cuenta real');

rollback;
