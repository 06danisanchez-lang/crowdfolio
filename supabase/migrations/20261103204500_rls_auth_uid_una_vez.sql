-- Rendimiento de RLS: auth.uid() se evalúa una vez por consulta, no una vez por fila.
--
-- Supabase avisa (lint 0003 auth_rls_initplan) de que las políticas llaman a auth.uid()
-- por cada fila. Envolverlo en (select auth.uid()) hace que Postgres lo calcule una sola
-- vez. Las condiciones son las mismas: no cambia quién ve o edita qué.
-- Se usa ALTER POLICY (no se borra ninguna política).
--
-- Además, dos índices que faltan en claves foráneas (lint 0001).

alter policy "Users can view own investments" on public.investments
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own investments" on public.investments
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own investments" on public.investments
  using ((select auth.uid()) = user_id);

alter policy "Users can delete own investments" on public.investments
  using ((select auth.uid()) = user_id);

alter policy "Users can view own opportunities" on public.opportunities
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own opportunities" on public.opportunities
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own opportunities" on public.opportunities
  using ((select auth.uid()) = user_id);

alter policy "Users can delete own opportunities" on public.opportunities
  using ((select auth.uid()) = user_id);

alter policy "Users can view own future investments" on public.future_investments
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own future investments" on public.future_investments
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own future investments" on public.future_investments
  using ((select auth.uid()) = user_id);

alter policy "Users can delete own future investments" on public.future_investments
  using ((select auth.uid()) = user_id);

alter policy "Users can view payments of own investments" on public.payments
  using ((exists (select 1 from public.investments where investments.id = payments.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can insert payments to own investments" on public.payments
  with check ((exists (select 1 from public.investments where investments.id = payments.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can update payments of own investments" on public.payments
  using ((exists (select 1 from public.investments where investments.id = payments.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can delete payments of own investments" on public.payments
  using ((exists (select 1 from public.investments where investments.id = payments.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can view schedule of own investments" on public.investment_schedule
  using ((exists (select 1 from public.investments where investments.id = investment_schedule.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can insert schedule to own investments" on public.investment_schedule
  with check ((exists (select 1 from public.investments where investments.id = investment_schedule.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can update schedule of own investments" on public.investment_schedule
  using ((exists (select 1 from public.investments where investments.id = investment_schedule.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can delete schedule of own investments" on public.investment_schedule
  using ((exists (select 1 from public.investments where investments.id = investment_schedule.investment_id and investments.user_id = (select auth.uid()))));

alter policy "Users can view own notifications" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own notifications" on public.notifications
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own notifications" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can view own subscription" on public.subscriptions
  using ((select auth.uid()) = user_id);

alter policy "Users can view own role" on public.user_roles
  using ((select auth.uid()) = user_id);

alter policy "Users can view their own promo codes" on public.used_promo_codes
  using ((select auth.uid()) = user_id);

alter policy "Users can manage their own tax expenses" on public.tax_expenses
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Admins can view all investments" on public.investments
  using (public.has_role((select auth.uid()), 'admin'::text));

alter policy "Admins can view all payments" on public.payments
  using (public.has_role((select auth.uid()), 'admin'::text));

alter policy "Admins can view all profiles" on public.profiles
  using (public.has_role((select auth.uid()), 'admin'::text));

alter policy "Admins can view all subscriptions" on public.subscriptions
  using (public.has_role((select auth.uid()), 'admin'::text));

create index if not exists idx_investment_schedule_matched_payment_id
  on public.investment_schedule (matched_payment_id);
create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
