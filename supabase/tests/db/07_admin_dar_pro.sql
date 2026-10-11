-- Dar Pro a mano (admin_set_pro_until): solo un admin, solo los campos del Pro manual.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'usuario@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'otro@test.local');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000d1', 'admin');

-- El alta les da el Pro de prueba; se simula que al usuario ya se le acabó.
update public.subscriptions
   set is_beta_pro = true, pro_until = now() - interval '1 day', plan = 'free', status = 'free'
 where user_id = '00000000-0000-0000-0000-0000000000d2';

-- Un anónimo no puede ni llamarla
select tests.check(not has_function_privilege('anon', 'public.admin_set_pro_until(uuid, date)', 'execute'),
  'un anónimo puede ejecutar admin_set_pro_until');

-- Un usuario normal no puede darse Pro a sí mismo ni a otro
select tests.login('00000000-0000-0000-0000-0000000000d2');
select tests.must_fail($$ select public.admin_set_pro_until('00000000-0000-0000-0000-0000000000d2', current_date + 30) $$,
  'un usuario normal se puede dar Pro a sí mismo');
select tests.must_fail($$ select public.admin_set_pro_until('00000000-0000-0000-0000-0000000000d3', current_date + 30) $$,
  'un usuario normal puede dar Pro a otro');
-- Y sigue sin poder escribir la tabla directamente
update public.subscriptions set pro_until = now() + interval '1 year'
 where user_id = '00000000-0000-0000-0000-0000000000d2';
reset role;
select tests.check((select pro_until < now() from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000d2'),
  'un usuario normal puede ampliar su Pro escribiendo en subscriptions');

-- El admin sí, y queda Pro hasta el final del día elegido
select tests.login('00000000-0000-0000-0000-0000000000d1');
select public.admin_set_pro_until('00000000-0000-0000-0000-0000000000d2', date '2030-03-15');
reset role;
select tests.check((select is_beta_pro and pro_until = timestamptz '2030-03-16 00:00:00 Europe/Madrid'
                      from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000d2'),
  'el admin no deja el Pro hasta el final del día elegido');
select tests.check((select plan = 'free' and status = 'free'
                      from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000d2'),
  'dar Pro a mano cambia plan o status');

-- Fechas no válidas
select tests.login('00000000-0000-0000-0000-0000000000d1');
select tests.must_fail($$ select public.admin_set_pro_until('00000000-0000-0000-0000-0000000000d2', current_date - 1) $$,
  'se puede dar Pro hasta una fecha pasada');
select tests.must_fail($$ select public.admin_set_pro_until('00000000-0000-0000-0000-0000000000d2', current_date + 4000) $$,
  'se puede dar Pro a más de 10 años');
select tests.must_fail($$ select public.admin_set_pro_until('00000000-0000-0000-0000-0000000000ff', current_date + 30) $$,
  'se puede dar Pro a un usuario que no existe');
reset role;

rollback;
