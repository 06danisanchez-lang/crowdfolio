-- Pro gratis durante la beta (decisión de Dani, 04/11/2026).
--
-- Antes: cada alta recibía 30 días de Pro (pro_until = now() + 30 días).
-- Ahora: cada alta recibe Pro hasta el fin de la beta. La beta no tiene fecha
-- pública: dura hasta que haya usuarios suficientes para cobrar. El 31/12/2027
-- es solo un tope técnico (Pro = is_beta_pro y pro_until > now()); cuando se
-- decida cobrar, se fija la fecha real con al menos 30 días de aviso
-- (Términos, 5.3) y se actualizan las cuentas.
create or replace function public.handle_new_user_subscription()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.subscriptions (user_id, plan, status, pro_until, is_beta_pro)
  values (new.id, 'free', 'free', timestamptz '2027-12-31 23:59:59+01', true)
  on conflict (user_id) do nothing;
  return new;
end;
$function$;
