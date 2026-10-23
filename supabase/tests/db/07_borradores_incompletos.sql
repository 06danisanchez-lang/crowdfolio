-- Un borrador puede guardarse sin importe, fecha ni rentabilidad; una inversión activa no.
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'ana@test.local');
select tests.login('00000000-0000-0000-0000-00000000000a');

insert into public.investments (user_id, platform, project_name, status)
  values ('00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Borrador importado', 'draft');
select tests.check((select count(*) from public.investments where amount is null and investment_date is null) = 1,
  'un borrador sin importe ni fecha debería poder guardarse');

select tests.must_fail($$
  insert into public.investments (user_id, platform, project_name, status)
  values ('00000000-0000-0000-0000-00000000000a', 'urbanitae', 'Activa sin datos', 'active')
$$, 'una inversión activa sin importe ni fecha no debería guardarse');

select tests.must_fail($$
  update public.investments set status = 'active' where project_name = 'Borrador importado'
$$, 'un borrador incompleto no debería poder pasar a activo');

reset role;
rollback;
