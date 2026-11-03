-- Un usuario no puede cambiar en su perfil los datos que usan las funciones de Stripe.
-- Sí puede cambiar lo que edita la web: nombre, avatar y el aviso de bienvenida Pro.
begin;

create function pg_temp.sin_permiso(_sql text, _msg text) returns void
language plpgsql as $$
begin
  execute _sql;
  raise exception 'FALLO: %', _msg;
exception
  when insufficient_privilege then null; -- 42501
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'dora@test.local');

select tests.login('00000000-0000-0000-0000-0000000000d1');

update public.profiles set full_name = 'Dora', avatar_url = 'https://x/a.png', pro_welcome_shown = true
  where id = '00000000-0000-0000-0000-0000000000d1';
select tests.check((select full_name = 'Dora' and pro_welcome_shown from public.profiles
  where id = '00000000-0000-0000-0000-0000000000d1'), 'la usuaria no puede editar su nombre ni el aviso Pro');

select pg_temp.sin_permiso(
  $$update public.profiles set stripe_customer_id = 'cus_de_otro' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'la usuaria puede cambiar su stripe_customer_id');
select pg_temp.sin_permiso(
  $$update public.profiles set email = 'otro@test.local' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'la usuaria puede cambiar el email de su perfil');

rollback;
