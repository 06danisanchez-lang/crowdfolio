-- Notificaciones: cada usuario crea y ve solo las suyas; un anónimo nada.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.local');
insert into public.notifications (user_id, title, message) values
  ('00000000-0000-0000-0000-00000000000b', 'De Beto', 'privada');

select tests.login('00000000-0000-0000-0000-00000000000a');
insert into public.notifications (user_id, title, message, type)
  values ('00000000-0000-0000-0000-00000000000a', 'Mía', 'la app crea las del propio usuario', 'payment_due');
select tests.check((select count(*) from public.notifications) = 1, 'Ana ve notificaciones ajenas o no ve la suya');
select tests.must_fail(
  $$insert into public.notifications (user_id, title, message) values ('00000000-0000-0000-0000-00000000000b', 'Falsa', 'x')$$,
  'Ana puede crear notificaciones a nombre de Beto');
select tests.must_fail(
  $$insert into public.notifications (user_id, title, message) values (null, 'Sin dueño', 'x')$$,
  'Ana puede crear notificaciones sin dueño');
reset role;

select tests.login_anon();
select tests.must_fail(
  $$insert into public.notifications (user_id, title, message) values ('00000000-0000-0000-0000-00000000000b', 'Falsa', 'x')$$,
  'un anónimo puede crear notificaciones');
select tests.check((select count(*) from public.notifications) = 0, 'un anónimo ve notificaciones');
reset role;

rollback;
