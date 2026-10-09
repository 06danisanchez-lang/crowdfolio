-- Las fechas de retraso (vencimiento prometido, fin de intereses) se guardan y solo las toca el dueño.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@test.local');
insert into public.investments (id, user_id, platform, project_name, amount, investment_date, expected_end_date, expected_return) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Proyecto Ana', 1000, '2025-01-01', '2026-01-01', 10);

select tests.check((select original_end_date from public.investments) is null,
  'una inversión nueva no debería tener fecha original');

-- Ana registra un retraso: mueve el vencimiento y guarda la fecha prometida
select tests.login('00000000-0000-0000-0000-00000000000a');
update public.investments set original_end_date = expected_end_date, interest_end_date = expected_end_date, expected_end_date = '2026-07-01'
  where id = '10000000-0000-0000-0000-00000000000a';
reset role;
select tests.check((select original_end_date from public.investments) = '2026-01-01'
  and (select interest_end_date from public.investments) = '2026-01-01',
  'Ana no puede guardar las fechas de retraso de su inversión');

-- Beto no puede tocarla
select tests.login('00000000-0000-0000-0000-00000000000b');
update public.investments set original_end_date = '2020-01-01', interest_end_date = '2020-01-01';
reset role;
select tests.check((select original_end_date from public.investments) = '2026-01-01'
  and (select interest_end_date from public.investments) = '2026-01-01',
  'Beto puede cambiar las fechas de retraso de una inversión de Ana');

rollback;
