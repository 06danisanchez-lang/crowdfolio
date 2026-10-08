-- Aislamiento entre usuarios: cada uno ve y modifica solo lo suyo,
-- el admin solo LEE lo ajeno y un anónimo no ve nada.
begin;

-- Datos: dos usuarios normales y un admin (los triggers de alta crean profile y subscription)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.local'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000ad', 'admin');

insert into public.investments (id, user_id, platform, project_name, amount, investment_date, expected_return) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Proyecto Ana', 1000, '2026-01-01', 10),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'housers', 'Proyecto Beto', 2000, '2026-01-01', 8);
insert into public.payments (investment_id, date, amount, type) values
  ('10000000-0000-0000-0000-00000000000a', '2026-06-01', 50, 'interest'),
  ('10000000-0000-0000-0000-00000000000b', '2026-06-01', 80, 'interest');

-- Los triggers de alta funcionan
select tests.check((select count(*) from public.profiles) = 3, 'el alta no crea el perfil');
select tests.check((select count(*) from public.subscriptions where plan = 'free') = 3, 'el alta no crea la suscripción free');

-- ── Ana (usuaria normal) ───────────────────────────────────────────────
select tests.login('00000000-0000-0000-0000-00000000000a');

select tests.check((select count(*) from public.investments) = 1, 'Ana ve inversiones ajenas');
select tests.check((select count(*) from public.payments) = 1, 'Ana ve cobros ajenos');
select tests.check((select count(*) from public.profiles) = 1, 'Ana ve perfiles ajenos');
select tests.check((select count(*) from public.subscriptions) = 1, 'Ana ve suscripciones ajenas');

select tests.must_fail(
  $$insert into public.investments (user_id, platform, project_name, amount, investment_date, expected_return)
    values ('00000000-0000-0000-0000-00000000000b', 'urbanitae', 'Colada', 1, '2026-01-01', 1)$$,
  'Ana puede crear inversiones a nombre de Beto');
select tests.must_fail(
  $$insert into public.payments (investment_id, date, amount, type)
    values ('10000000-0000-0000-0000-00000000000b', '2026-07-01', 1, 'interest')$$,
  'Ana puede añadir cobros a una inversión de Beto');
select tests.must_fail(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin')$$,
  'Ana puede darse el rol de admin');
select tests.must_fail(
  $$insert into public.subscriptions (user_id, plan, status) values ('00000000-0000-0000-0000-00000000000a', 'pro', 'active')$$,
  'Ana puede crearse una suscripción');

update public.investments set amount = 1 where id = '10000000-0000-0000-0000-00000000000b';
delete from public.payments where investment_id = '10000000-0000-0000-0000-00000000000b';
reset role;
select tests.check((select amount from public.investments where id = '10000000-0000-0000-0000-00000000000b') = 2000,
  'Ana puede modificar una inversión de Beto');
select tests.check((select count(*) from public.payments where investment_id = '10000000-0000-0000-0000-00000000000b') = 1,
  'Ana puede borrar cobros de Beto');

-- ── Admin: lee todo, no modifica nada ajeno ───────────────────────────
select tests.login('00000000-0000-0000-0000-0000000000ad');

select tests.check((select count(*) from public.investments) = 2, 'el admin no ve todas las inversiones');
select tests.check((select count(*) from public.payments) = 2, 'el admin no ve todos los cobros');
select tests.check((select count(*) from public.profiles) = 3, 'el admin no ve todos los perfiles');

update public.investments set amount = 1 where id = '10000000-0000-0000-0000-00000000000a';
delete from public.investments where id = '10000000-0000-0000-0000-00000000000b';
reset role;
select tests.check((select amount from public.investments where id = '10000000-0000-0000-0000-00000000000a') = 1000,
  'el admin puede modificar inversiones ajenas');
select tests.check((select count(*) from public.investments) = 2, 'el admin puede borrar inversiones ajenas');

-- ── Anónimo ───────────────────────────────────────────────────────────
select tests.login_anon();
select tests.check((select count(*) from public.investments) = 0, 'un anónimo ve inversiones');
select tests.check((select count(*) from public.profiles) = 0, 'un anónimo ve perfiles');
select tests.check((select count(*) from public.subscriptions) = 0, 'un anónimo ve suscripciones');
reset role;

rollback;
