-- Un mismo aviso (misma clave) no se puede guardar dos veces para el mismo usuario.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.local');

select tests.login('00000000-0000-0000-0000-00000000000a');

-- Lo que hace la app: insert ... on conflict do nothing, dos veces
insert into public.notifications (user_id, title, message, type, dedupe_key)
  values ('00000000-0000-0000-0000-00000000000a', 'Cobro', 'x', 'payment_due', 'payment_due:inv-1:2026-10-07')
  on conflict (user_id, dedupe_key) do nothing;
insert into public.notifications (user_id, title, message, type, dedupe_key)
  values ('00000000-0000-0000-0000-00000000000a', 'Cobro', 'x', 'payment_due', 'payment_due:inv-1:2026-10-07')
  on conflict (user_id, dedupe_key) do nothing;
select tests.check((select count(*) from public.notifications) = 1, 'el mismo aviso se guarda dos veces');

select tests.must_fail(
  $$insert into public.notifications (user_id, title, message, type, dedupe_key)
    values ('00000000-0000-0000-0000-00000000000a', 'Cobro', 'x', 'payment_due', 'payment_due:inv-1:2026-10-07')$$,
  'un insert normal con clave repetida no falla');

-- Avisos sin clave (los antiguos) se siguen pudiendo repetir
insert into public.notifications (user_id, title, message) values
  ('00000000-0000-0000-0000-00000000000a', 'Viejo', 'x'),
  ('00000000-0000-0000-0000-00000000000a', 'Viejo', 'x');
select tests.check((select count(*) from public.notifications where dedupe_key is null) = 2, 'los avisos sin clave chocan entre sí');
reset role;

-- La misma clave en otro usuario no choca
select tests.login('00000000-0000-0000-0000-00000000000b');
insert into public.notifications (user_id, title, message, type, dedupe_key)
  values ('00000000-0000-0000-0000-00000000000b', 'Cobro', 'x', 'payment_due', 'payment_due:inv-1:2026-10-07')
  on conflict (user_id, dedupe_key) do nothing;
select tests.check((select count(*) from public.notifications) = 1, 'la clave de otro usuario bloquea la mía');
reset role;

rollback;
