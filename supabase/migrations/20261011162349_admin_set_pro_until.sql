-- Dar Pro a mano desde el panel de admin.
--
-- Mientras los pagos no estén activos, el Pro solo se amplía a mano: el usuario
-- escribe a soporte y Dani elige hasta qué día. El Pro manual usa los mismos campos
-- que el Pro de prueba del alta (is_beta_pro + pro_until), así que la app no
-- necesita ningún cambio para reconocerlo.
--
-- Los usuarios no tienen política de escritura sobre subscriptions; esta función
-- es la única vía desde la app y comprueba dentro que quien llama es admin.
-- Solo toca is_beta_pro, pro_until y updated_at: nunca plan, status ni Stripe.

create or replace function public.admin_set_pro_until(_target_user uuid, _until date)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _ends timestamptz;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo un administrador puede dar Pro' using errcode = '42501';
  end if;

  if _target_user is null or _until is null then
    raise exception 'Faltan el usuario o la fecha' using errcode = '22023';
  end if;

  -- Pro hasta el final del día elegido, hora de España (incluye ese día entero).
  _ends := ((_until + 1)::timestamp) at time zone 'Europe/Madrid';

  if _ends <= now() then
    raise exception 'La fecha tiene que ser posterior a hoy' using errcode = '22023';
  end if;
  if _until > (now() at time zone 'Europe/Madrid')::date + 3660 then
    raise exception 'La fecha no puede pasar de 10 años' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = _target_user) then
    raise exception 'El usuario no existe' using errcode = '22023';
  end if;

  insert into public.subscriptions (user_id, plan, status, is_beta_pro, pro_until)
  values (_target_user, 'free', 'free', true, _ends)
  on conflict (user_id) do update
    set is_beta_pro = true,
        pro_until = excluded.pro_until,
        updated_at = now();

  return _ends;
end;
$$;

revoke all on function public.admin_set_pro_until(uuid, date) from public, anon;
grant execute on function public.admin_set_pro_until(uuid, date) to authenticated;
