-- Cada alta nueva tiene Pro de beta hasta el fin de la beta, no 30 días.
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000be', 'beta@test.local');

select tests.check(
  (select is_beta_pro and pro_until = timestamptz '2027-12-31 23:59:59+01'
     from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000be'),
  'el alta no recibe Pro de beta hasta el 31/12/2027');
select tests.check(
  (select plan = 'free' from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000be'),
  'el alta de beta debería seguir con plan free (Pro sale de is_beta_pro + pro_until)');

rollback;
