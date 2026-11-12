-- Avisos por correo ampliados: rentas de equity, impagos (sin contenido fiscal) y
-- candidatos a «cobro esperado» de préstamos. Hoy = 2026-11-12.
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
  ('00000000-0000-0000-0000-0000000000a2', 'a2@test.local', false),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test.local', false);
update public.profiles set email_notifications = false where id = '00000000-0000-0000-0000-0000000000b2';

insert into public.investments (id, user_id, platform, project_name, amount, investment_date, expected_return,
                                status, expected_end_date, income_model, equity_type, defaulted_at,
                                loss_assessed_at, loss_enforcement_started, loss_enforcement_date, assumed_paid_until, loss_enforcement_initiator) values
  -- Equity rentas: una renta sin cobrar y otra cobrada
  ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'urbanitae', 'Rentas', 1000, '2025-01-01', 6,
   'active', '2028-01-01', 'equity', 'rentas', null, null, null, null, null, null),
  -- Impago sin cuestionario
  ('31000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'housers', 'Sin cuestionario', 1000, '2025-01-01', 10,
   'defaulted', '2026-01-01', 'bullet', null, '2026-05-01', null, null, null, null, null),
  -- Impago respondido el 2026-05-20: revisión trimestral 2026-11-20 (calendario de la app)
  ('31000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a2', 'housers', 'Revision', 1000, '2025-01-01', 10,
   'defaulted', '2026-01-01', 'bullet', null, '2026-05-01', '2026-05-20 10:00+02', false, null, null, null),
  -- Impago respondido el 2026-10-01 con ejecución del 2025-11-01: se cumple el año
  -- (2026-11-01) después de responder → aviso; aún sin trimestre → sin revisión
  ('31000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a2', 'wecity', 'Ejecucion', 1000, '2025-01-01', 10,
   'defaulted', '2026-01-01', 'bullet', null, '2026-05-01', '2026-10-01 10:00+02', true, '2025-11-01', null, 'platform'),
  -- Impago respondido después de cumplirse el año: nada nuevo que avisar
  ('31000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a2', 'wecity', 'Ya cumplido', 1000, '2025-01-01', 10,
   'defaulted', '2026-01-01', 'bullet', null, '2026-05-01', '2026-11-05 10:00+01', true, '2025-10-01', null, 'platform'),
  -- Impago de equity: nunca (la app tampoco)
  ('31000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a2', 'urbanitae', 'Equity impago', 1000, '2025-01-01', 10,
   'defaulted', '2026-01-01', 'equity', 'plusvalia', '2026-05-01', null, null, null, null, null),
  -- Préstamo con cuota el 2026-11-10 → candidato
  ('31000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000a2', 'urbanitae', 'Prestamo', 1000, '2025-01-01', 10,
   'active', '2027-01-01', 'periodic_fixed', null, null, null, null, null, null, null),
  -- Préstamo con la última cuota hace 20 días → no candidato
  ('31000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000a2', 'urbanitae', 'Prestamo viejo', 1000, '2025-01-01', 10,
   'active', '2027-01-01', 'periodic_fixed', null, null, null, null, null, null, null),
  -- Usuario B (correos desactivados): impago sin cuestionario y préstamo con cuota
  ('31000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000b2', 'housers', 'B impago', 1000, '2025-01-01', 10,
   'defaulted', '2026-01-01', 'bullet', null, '2026-05-01', null, null, null, null, null),
  ('31000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b2', 'urbanitae', 'B prestamo', 1000, '2025-01-01', 10,
   'active', '2027-01-01', 'periodic_fixed', null, null, null, null, null, null, null);

insert into public.investment_schedule (investment_id, expected_date, expected_amount, type) values
  ('31000000-0000-0000-0000-000000000001', '2026-10-01', 15, 'interest'),
  ('31000000-0000-0000-0000-000000000001', '2026-07-01', 15, 'interest'),
  ('31000000-0000-0000-0000-000000000007', '2026-11-10', 8.33, 'interest'),
  ('31000000-0000-0000-0000-000000000008', '2026-10-23', 8.33, 'interest'),
  ('31000000-0000-0000-0000-00000000000a', '2026-11-10', 8.33, 'interest');

-- La renta de julio se cobró (capital_return el 2026-07-05); la de octubre, no.
insert into public.payments (investment_id, date, amount, type) values
  ('31000000-0000-0000-0000-000000000001', '2026-07-05', 15, 'capital_return');

create temp table p as select * from public.email_digest_pending('2026-11-12');

-- Rentas de equity
select tests.check(exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000001'
                            and kind = 'rent_due' and event_date = '2026-10-01'),
  'no avisa de la renta de octubre sin cobrar');
-- La de julio: hay un capital_return el 05/07, pero es anterior a octubre, así que
-- la de octubre sigue pendiente y la de julio cuenta como cobrada.
select tests.check(not exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000001'
                                and event_date = '2026-07-01'),
  'avisa de la renta de julio, que está cobrada');

-- Impagos
select tests.check(exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000002' and kind = 'default_incomplete'),
  'no avisa del impago sin cuestionario');
select tests.check(exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000003'
                            and kind = 'default_review' and event_date = '2026-11-20'),
  'no avisa de la revisión trimestral con el calendario de la app');
select tests.check(exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000004'
                            and kind = 'default_enforcement_year' and event_date = '2026-11-01'),
  'no avisa del año desde la ejecución');
select tests.check(not exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000004' and kind = 'default_review'),
  'avisa de una revisión antes del primer trimestre');
select tests.check(not exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000005' and kind = 'default_enforcement_year'),
  'avisa del año cuando ya se había cumplido al responder el cuestionario');
select tests.check(not exists (select 1 from p where investment_id = '31000000-0000-0000-0000-000000000006'),
  'avisa de un impago de equity');
select tests.check(not exists (select 1 from p where user_id = '00000000-0000-0000-0000-0000000000b2'),
  'avisa a quien ha desactivado los correos');

-- Una sola vez
insert into public.email_notification_log (user_id, dedupe_key) select user_id, dedupe_key from p;
select tests.check((select count(*) from public.email_digest_pending('2026-11-12')) = 0, 'repite avisos ya enviados');

-- Candidatos de préstamos
create temp table c as select * from public.email_digest_schedule_candidates('2026-11-12');
select tests.check((select count(*) from c) = 1, 'los candidatos no son exactamente el préstamo con cuota reciente');
select tests.check((select investment_id from c) = '31000000-0000-0000-0000-000000000007', 'el candidato no es el préstamo con cuota reciente');
select tests.check((select jsonb_array_length(schedule) from c) = 1 and (select payments from c) = '[]'::jsonb,
  'el candidato no trae su calendario y sus cobros');

-- Permisos
set local role anon;
select pg_temp.sin_permiso($$select * from public.email_digest_schedule_candidates()$$, 'un anónimo puede listar candidatos');
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.sin_permiso($$select * from public.email_digest_schedule_candidates()$$, 'un usuario puede listar candidatos de todos');
select pg_temp.sin_permiso($$select * from public.email_digest_pending()$$, 'un usuario puede listar avisos de todos');
reset role;

rollback;
