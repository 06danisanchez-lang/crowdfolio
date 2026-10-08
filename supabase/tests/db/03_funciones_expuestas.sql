-- Las funciones de trigger no se pueden llamar por la API y los triggers siguen funcionando.
begin;

select tests.check(not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
  'un anónimo puede ejecutar handle_new_user');
select tests.check(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'un usuario puede ejecutar handle_new_user');
select tests.check(not has_function_privilege('anon', 'public.handle_new_user_subscription()', 'execute'),
  'un anónimo puede ejecutar handle_new_user_subscription');
select tests.check(not has_function_privilege('authenticated', 'public.handle_new_user_subscription()', 'execute'),
  'un usuario puede ejecutar handle_new_user_subscription');
select tests.check(has_function_privilege('authenticated', 'public.has_role(uuid, text)', 'execute'),
  'las políticas de admin no pueden llamar a has_role');

-- El alta sigue creando perfil y suscripción
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'nuevo@test.local');
select tests.check(exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'el alta ya no crea el perfil');
select tests.check(exists (select 1 from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'el alta ya no crea la suscripción');

-- updated_at se sigue actualizando con search_path vacío
insert into public.tax_expenses (user_id, year, category, amount)
  values ('00000000-0000-0000-0000-0000000000c1', 2026, 'custody', 10);
update public.tax_expenses set updated_at = '2000-01-01' where user_id = '00000000-0000-0000-0000-0000000000c1';
update public.tax_expenses set amount = 11 where user_id = '00000000-0000-0000-0000-0000000000c1';
select tests.check((select updated_at > '2001-01-01' from public.tax_expenses where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'updated_at deja de actualizarse');

rollback;
