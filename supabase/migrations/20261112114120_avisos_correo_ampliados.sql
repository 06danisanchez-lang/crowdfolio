-- Avisos por correo ampliados (decisión de Dani del 12/11/2026).
--
-- El correo diario (send-digest) ya avisaba de vencimientos en 7 días y de
-- vencidas sin cobro. Ahora también, como la campana de la app:
--   - Cobros esperados que no constan:
--       · cuotas de intereses de préstamos: aquí solo se eligen las inversiones
--         candidatas (email_digest_schedule_candidates). Si una cuota está cobrada
--         lo decide send-digest con el MISMO emparejamiento por importes que la app
--         (supabase/functions/_shared/scheduleMatching.ts), que no se guarda en la
--         base de datos.
--       · rentas trimestrales de equity: igual que la app, sin cobro de tipo
--         capital_return en o después de la fecha prevista (últimos 180 días).
--   - Impagos, SIN contenido fiscal (el cálculo fiscal solo vive en la app): un
--     aviso neutro para entrar a revisarlo cuando
--       · falta completar el cuestionario del impago (una vez);
--       · se cumple un año desde la fecha de la ejecución judicial que dio el
--         usuario, si es posterior a cuando respondió el cuestionario (una vez);
--       · llega la revisión trimestral desde que respondió el cuestionario.
--     La app decide en pantalla qué significa cada caso.
-- El resumen semanal NO va por correo.
--
-- Mismas reglas de siempre: solo cuentas con correo, sin demo ni anónimas, con los
-- correos activados, y cada aviso una sola vez (email_notification_log).

-- 1. Avisos que se deciden en SQL ────────────────────────────────────────
create or replace function public.email_digest_pending(_today date default (now() at time zone 'Europe/Madrid')::date)
 returns table (
   user_id uuid,
   email text,
   kind text,
   investment_id uuid,
   project_name text,
   platform text,
   custom_platform_name text,
   event_date date,
   promised_date date,
   dedupe_key text
 )
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with defaulted as (
    select i.*,
           (i.loss_assessed_at at time zone 'Europe/Madrid')::date as assessed_on,
           ((extract(year from _today) - extract(year from (i.loss_assessed_at at time zone 'Europe/Madrid')::date)) * 12
             + extract(month from _today) - extract(month from (i.loss_assessed_at at time zone 'Europe/Madrid')::date))::int / 3
             as quarters
      from public.investments i
     where i.status = 'defaulted'
       and coalesce(i.income_model, 'bullet') <> 'equity'
  ),
  items as (
    -- Vencida sin cobro: «Por confirmar», o activa con el vencimiento ya pasado.
    select i.user_id, 'overdue'::text as kind, i.id, i.project_name, i.platform, i.custom_platform_name,
           i.expected_end_date as event_date, i.original_end_date as promised_date,
           'overdue:' || i.id || ':' || coalesce(i.expected_end_date::text, '') as dedupe_key
      from public.investments i
     where i.status = 'pending'
        or (i.status = 'active' and i.expected_end_date < _today)
    union all
    -- Vence hoy o en los próximos 7 días.
    select i.user_id, 'maturity_soon', i.id, i.project_name, i.platform, i.custom_platform_name,
           i.expected_end_date, i.original_end_date,
           'maturity_soon:' || i.id || ':' || i.expected_end_date
      from public.investments i
     where i.status = 'active'
       and i.expected_end_date between _today and _today + 7
    union all
    -- Renta trimestral de equity sin cobro registrado (como useNotificationGenerator).
    select i.user_id, 'rent_due', i.id, i.project_name, i.platform, i.custom_platform_name,
           s.expected_date, null::date,
           'payment_due:' || i.id || ':' || s.expected_date
      from public.investments i
      join public.investment_schedule s on s.investment_id = i.id
     where i.status = 'active'
       and i.income_model = 'equity'
       and i.equity_type = 'rentas'
       and s.type = 'interest'
       and s.expected_date between _today - 180 and _today
       and not exists (
         select 1 from public.payments pay
          where pay.investment_id = i.id and pay.type = 'capital_return' and pay.date >= s.expected_date
       )
    union all
    -- Impago sin el cuestionario completado.
    select d.user_id, 'default_incomplete', d.id, d.project_name, d.platform, d.custom_platform_name,
           null::date, null::date,
           'default_incomplete:' || d.id
      from defaulted d
     where d.loss_assessed_at is null
    union all
    -- Un año desde la ejecución judicial, posterior a la respuesta del cuestionario.
    select d.user_id, 'default_enforcement_year', d.id, d.project_name, d.platform, d.custom_platform_name,
           (d.loss_enforcement_date + interval '1 year')::date, null::date,
           'default_enforcement_year:' || d.id || ':' || d.loss_enforcement_date
      from defaulted d
     where d.loss_assessed_at is not null
       and d.loss_enforcement_started
       and d.loss_enforcement_date is not null
       and (d.loss_enforcement_date + interval '1 year')::date <= _today
       and (d.loss_enforcement_date + interval '1 year')::date > d.assessed_on
    union all
    -- Revisión trimestral desde la respuesta del cuestionario (mismo calendario que la app).
    select d.user_id, 'default_review', d.id, d.project_name, d.platform, d.custom_platform_name,
           (d.assessed_on + make_interval(months => d.quarters * 3))::date, null::date,
           'default_review:' || d.id || ':' || (d.assessed_on + make_interval(months => d.quarters * 3))::date
      from defaulted d
     where d.loss_assessed_at is not null
       and d.quarters >= 1
  )
  select it.user_id, u.email::text, it.kind, it.id, it.project_name, it.platform, it.custom_platform_name,
         it.event_date, it.promised_date, it.dedupe_key
    from items it
    join auth.users u on u.id = it.user_id
    join public.profiles p on p.id = it.user_id
   where coalesce(u.is_anonymous, false) = false
     and u.email is not null
     and p.email_notifications
     and not p.is_demo
     and not exists (
       select 1 from public.email_notification_log l
        where l.user_id = it.user_id and l.dedupe_key = it.dedupe_key
     )
   order by it.user_id, it.kind, it.event_date nulls last;
$function$;

revoke all on function public.email_digest_pending(date) from public, anon, authenticated;
grant execute on function public.email_digest_pending(date) to service_role;

-- 2. Préstamos (todo lo que no es equity) con alguna cuota de intereses prevista en los últimos 7 días ────
-- Devuelve el calendario y los cobros completos de cada una: send-digest los
-- empareja como la app y avisa solo de las cuotas que siguen sin cobrar.
create or replace function public.email_digest_schedule_candidates(_today date default (now() at time zone 'Europe/Madrid')::date)
 returns table (
   user_id uuid,
   email text,
   investment_id uuid,
   project_name text,
   platform text,
   custom_platform_name text,
   income_model text,
   assumed_paid_until date,
   schedule jsonb,
   payments jsonb
 )
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select i.user_id, u.email::text, i.id, i.project_name, i.platform, i.custom_platform_name,
         i.income_model, i.assumed_paid_until,
         (select jsonb_agg(jsonb_build_object(
                   'expectedDate', s.expected_date, 'expectedAmount', s.expected_amount,
                   'type', s.type, 'status', s.status, 'matchedPaymentId', s.matched_payment_id)
                 order by s.expected_date)
            from public.investment_schedule s where s.investment_id = i.id),
         coalesce((select jsonb_agg(jsonb_build_object(
                   'id', pay.id, 'date', pay.date, 'amount', pay.amount, 'type', pay.type)
                 order by pay.date)
            from public.payments pay where pay.investment_id = i.id), '[]'::jsonb)
    from public.investments i
    join auth.users u on u.id = i.user_id
    join public.profiles p on p.id = i.user_id
   where i.status = 'active'
     and coalesce(i.income_model, 'bullet') <> 'equity'
     and coalesce(u.is_anonymous, false) = false
     and u.email is not null
     and p.email_notifications
     and not p.is_demo
     and exists (
       select 1 from public.investment_schedule s
        where s.investment_id = i.id
          and s.type = 'interest'
          and s.expected_date between _today - 7 and _today
     )
   order by i.user_id;
$function$;

revoke all on function public.email_digest_schedule_candidates(date) from public, anon, authenticated;
grant execute on function public.email_digest_schedule_candidates(date) to service_role;
