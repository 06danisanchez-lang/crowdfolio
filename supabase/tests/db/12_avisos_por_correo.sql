-- Avisos por correo: qué se avisa, a quién, una sola vez, y quién puede tocar qué.
begin;

create function pg_temp.sin_permiso(_sql text, _msg text) returns void
language plpgsql as $$
begin
  execute _sql;
  raise exception 'FALLO: %', _msg;
exception
  when insufficient_privilege then null;
end $$;

insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local', false),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.local', false),
  ('00000000-0000-0000-0000-0000000000d1', null, true);

-- Hoy = 2026-11-10
insert into public.investments (id, user_id, platform, project_name, amount, investment_date, expected_return,
                                status, expected_end_date, original_end_date, defaulted_at) values
  -- A: vence en 3 días
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'urbanitae', 'Pronto', 1000, '2025-01-01', 10, 'active', '2026-11-13', null, null),
  -- A: vence dentro de 20 días (no se avisa)
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'urbanitae', 'Lejos', 1000, '2025-01-01', 10, 'active', '2026-11-30', null, null),
  -- A: activa con la fecha pasada
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'wecity', 'Pasada', 1000, '2025-01-01', 10, 'active', '2026-11-01', null, null),
  -- A: por confirmar
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', 'wecity', 'Confirmar', 1000, '2025-01-01', 10, 'pending', '2026-10-01', null, null),
  -- A: retrasada
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a1', 'housers', 'Retrasada', 1000, '2025-01-01', 10, 'active', '2027-03-01', '2026-09-01', null),
  -- A: impago
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a1', 'housers', 'Impago', 1000, '2025-01-01', 10, 'defaulted', '2026-01-01', null, '2026-05-01'),
  -- A: completada y borrador (no se avisa)
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a1', 'housers', 'Cerrada', 1000, '2025-01-01', 10, 'completed', '2026-11-01', null, null),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a1', 'housers', 'Borrador', null, null, null, 'draft', '2026-11-12', null, null),
  -- B: vence en 2 días, pero ha desactivado los correos
  ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000b1', 'urbanitae', 'B pronto', 1000, '2025-01-01', 10, 'active', '2026-11-12', null, null),
  -- Demo: vence en 2 días
  ('30000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000d1', 'urbanitae', 'Demo', 1000, '2025-01-01', 10, 'active', '2026-11-12', null, null);

update public.profiles set email_notifications = false where id = '00000000-0000-0000-0000-0000000000b1';

-- Qué se avisa
create temp table p as select * from public.email_digest_pending('2026-11-10');

-- 3 de vencimientos + 1 por el impago sin cuestionario (desde 20261112114120)
select tests.check((select count(*) from p where user_id = '00000000-0000-0000-0000-0000000000a1') = 4,
  'el usuario A no recibe exactamente 4 avisos');
select tests.check(exists (select 1 from p where investment_id = '30000000-0000-0000-0000-000000000001' and kind = 'maturity_soon'),
  'no avisa de la que vence en 3 días');
select tests.check(not exists (select 1 from p where investment_id = '30000000-0000-0000-0000-000000000002'),
  'avisa de una que vence dentro de 20 días');
select tests.check(exists (select 1 from p where investment_id = '30000000-0000-0000-0000-000000000003' and kind = 'overdue'),
  'no avisa de una activa con la fecha pasada');
select tests.check(exists (select 1 from p where investment_id = '30000000-0000-0000-0000-000000000004' and kind = 'overdue'),
  'no avisa de una «Por confirmar»');
select tests.check(not exists (select 1 from p where investment_id = '30000000-0000-0000-0000-000000000005'),
  'avisa de un retraso (lo marca el propio usuario)');
select tests.check(not exists (select 1 from p where investment_id = '30000000-0000-0000-0000-000000000006' and kind <> 'default_incomplete'),
  'del impago avisa de algo distinto de completar el cuestionario');
select tests.check(not exists (select 1 from p where investment_id in ('30000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000008')),
  'avisa de una completada o de un borrador');
select tests.check(not exists (select 1 from p where user_id = '00000000-0000-0000-0000-0000000000b1'),
  'avisa a quien ha desactivado los correos');
select tests.check(not exists (select 1 from p where user_id = '00000000-0000-0000-0000-0000000000d1'),
  'avisa a una cuenta demo');

-- Una sola vez
insert into public.email_notification_log (user_id, dedupe_key)
  select user_id, dedupe_key from p;
select tests.check((select count(*) from public.email_digest_pending('2026-11-10')) = 0,
  'repite avisos ya enviados');

-- Si el vencimiento se mueve, se avisa otra vez
update public.investments set expected_end_date = '2026-11-15' where id = '30000000-0000-0000-0000-000000000001';
select tests.check((select count(*) from public.email_digest_pending('2026-11-10')
                     where investment_id = '30000000-0000-0000-0000-000000000001') = 1,
  'no avisa del nuevo vencimiento de la misma inversión');

-- Baja desde el enlace (anónimo, con la clave)
select set_config('request.jwt.claims', '', true);
select set_config('role', 'anon', true);
select tests.check(not public.email_unsubscribe(gen_random_uuid()), 'una clave inventada da de baja a alguien');
reset role;
create temp table tok as select email_unsubscribe_token as t from public.profiles where id = '00000000-0000-0000-0000-0000000000a1';
grant select on tok to anon;
set local role anon;
select tests.check(public.email_unsubscribe((select t from tok)), 'la clave buena no da de baja');
reset role;
select tests.check((select not email_notifications from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'la baja no desactiva los correos');

-- Permisos
set local role anon;
select pg_temp.sin_permiso($$select * from public.email_digest_pending()$$, 'un anónimo puede listar avisos');
select pg_temp.sin_permiso($$select public.email_digest_secret_ok('x')$$, 'un anónimo puede probar secretos');
reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.sin_permiso($$select * from public.email_digest_pending()$$, 'un usuario puede listar avisos de todos');
select pg_temp.sin_permiso($$select * from public.email_notification_log$$, 'un usuario puede leer el registro de envíos');
select pg_temp.sin_permiso(
  $$update public.profiles set email_unsubscribe_token = gen_random_uuid() where id = '00000000-0000-0000-0000-0000000000b1'$$,
  'un usuario puede cambiar su clave de baja');
-- Sí puede reactivar sus correos
with u as (update public.profiles set email_notifications = true where id = '00000000-0000-0000-0000-0000000000b1' returning 1)
select tests.check((select count(*) from u) = 1, 'el usuario no puede reactivar sus correos');
reset role;

rollback;
