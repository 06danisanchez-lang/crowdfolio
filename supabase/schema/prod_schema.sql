-- Instantánea del esquema `public` de PRODUCCIÓN (estructura, sin datos).
-- NO EDITAR A MANO: se regenera con supabase/schema/dump_schema.sql (ver CLAUDE.md).
--
-- snapshot_version: 20261009110228
-- última migración registrada en producción: 20261008200903
-- comprobación (md5 de la salida normalizada, 144 sentencias): a527c73059b7ad831a209546ab98320f
--
-- scripts/db-test.sh carga primero supabase/schema/stubs.sql, después este
-- archivo y por último las migraciones con versión > snapshot_version.

set search_path = public, extensions;

create type public.close_reason_type as enum ('on_time', 'early', 'extended', 'sold');

create table public.future_investments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  platform text not null,
  custom_platform_name text,
  project_name text not null,
  estimated_amount numeric,
  expected_return numeric,
  estimated_open_date date,
  estimated_end_date date,
  source_url text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.investment_schedule (
  id uuid default gen_random_uuid() not null,
  investment_id uuid not null,
  expected_date date not null,
  expected_amount numeric not null,
  type text not null,
  status text default 'pending'::text,
  matched_payment_id uuid,
  created_at timestamp with time zone default now()
);

create table public.investments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  platform text not null,
  custom_platform_name text,
  project_name text not null,
  amount numeric(12,2) not null,
  investment_date date not null,
  expected_end_date date,
  expected_return numeric(5,2) not null,
  status text default 'active'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  income_model text default 'bullet'::text,
  payment_frequency text,
  principal_return_type text default 'at_maturity'::text,
  source_url text,
  defaulted_at timestamp with time zone,
  amount_recovered numeric(10,2) default 0,
  equity_type text,
  actual_end_date date,
  close_reason close_reason_type,
  was_extended boolean default false not null,
  currency text default 'EUR'::text not null,
  country text,
  original_amount numeric,
  original_currency text,
  exchange_rate numeric,
  exchange_rate_date date,
  amount_eur numeric,
  exchange_rate_source text,
  loss_insolvency_status text,
  loss_insolvency_concluded_date date,
  loss_quita_amount numeric,
  loss_quita_date date,
  loss_enforcement_started boolean,
  loss_enforcement_date date,
  loss_enforcement_initiator text,
  loss_assessed_at timestamp with time zone,
  loss_rules_version integer,
  first_payment_date date
);

create table public.notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  title text not null,
  message text not null,
  type text default 'new_opportunity'::text,
  read boolean default false,
  data jsonb,
  created_at timestamp with time zone default now() not null,
  dedupe_key text
);

create table public.opportunities (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  platform text not null,
  project_name text not null,
  project_type text default 'other'::text not null,
  location text default ''::text not null,
  expected_return numeric(5,2) not null,
  term integer not null,
  min_investment numeric(12,2) default 0 not null,
  target_amount numeric(12,2) default 0 not null,
  current_amount numeric(12,2) default 0 not null,
  funding_progress numeric(5,2) default 0 not null,
  status text default 'open'::text not null,
  description text,
  url text,
  risk_level text default 'medium'::text not null,
  image_url text,
  source text default 'manual'::text not null,
  scraped_at timestamp with time zone,
  is_favorite boolean default false not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.payments (
  id uuid default gen_random_uuid() not null,
  investment_id uuid not null,
  date date not null,
  amount numeric(12,2) not null,
  type text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  withholding_applied numeric(10,2) default 0,
  original_amount numeric,
  original_currency text,
  exchange_rate numeric,
  exchange_rate_date date,
  amount_eur numeric,
  foreign_withholding_amount numeric,
  foreign_withholding_currency text,
  exchange_rate_source text
);

create table public.profiles (
  id uuid not null,
  email text,
  full_name text,
  avatar_url text,
  stripe_customer_id text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  pro_welcome_shown boolean default false not null
);

create table public.subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  plan text default 'free'::text not null,
  status text default 'free'::text not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  import_count_this_month integer default 0,
  import_reset_date date default CURRENT_DATE,
  created_at timestamp with time zone default now() not null,
  pro_until timestamp with time zone,
  is_beta_pro boolean default false not null,
  updated_at timestamp with time zone default now() not null
);

create table public.tax_expenses (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  year integer not null,
  category text not null,
  description text,
  amount numeric(10,2) not null,
  date date,
  created_at timestamp with time zone default now(),
  notes text,
  updated_at timestamp with time zone default now() not null
);

create table public.used_promo_codes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  promo_code text not null,
  applied_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null
);

create table public.user_roles (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  role text default 'user'::text not null,
  created_at timestamp with time zone default now() not null
);

alter table public.future_investments add constraint future_investments_pkey PRIMARY KEY (id);

alter table public.investment_schedule add constraint investment_schedule_pkey PRIMARY KEY (id);

alter table public.investments add constraint investments_equity_type_check CHECK ((equity_type = ANY (ARRAY['plusvalia'::text, 'rentas'::text, 'liquidacion'::text])));

alter table public.investments add constraint investments_exchange_rate_source_check CHECK (((exchange_rate_source IS NULL) OR (exchange_rate_source = ANY (ARRAY['ecb'::text, 'manual'::text]))));

alter table public.investments add constraint investments_first_payment_date_range_check CHECK (((first_payment_date IS NULL) OR ((first_payment_date > investment_date) AND ((expected_end_date IS NULL) OR (first_payment_date <= expected_end_date)))));

alter table public.investments add constraint investments_loss_enforcement_check CHECK (((loss_enforcement_started IS NOT TRUE) OR ((loss_enforcement_date IS NOT NULL) AND (loss_enforcement_initiator IS NOT NULL))));

alter table public.investments add constraint investments_loss_enforcement_initiator_check CHECK ((loss_enforcement_initiator = ANY (ARRAY['user'::text, 'platform'::text])));

alter table public.investments add constraint investments_loss_insolvency_concluded_date_check CHECK (((loss_insolvency_status IS DISTINCT FROM 'concluded_unpaid'::text) OR (loss_insolvency_concluded_date IS NOT NULL)));

alter table public.investments add constraint investments_loss_insolvency_status_check CHECK ((loss_insolvency_status = ANY (ARRAY['none'::text, 'open'::text, 'concluded_unpaid'::text, 'unknown'::text])));

alter table public.investments add constraint investments_loss_quita_amount_check CHECK ((loss_quita_amount > (0)::numeric));

alter table public.investments add constraint investments_loss_quita_pair_check CHECK (((loss_quita_amount IS NULL) = (loss_quita_date IS NULL)));

alter table public.investments add constraint investments_pkey PRIMARY KEY (id);

alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);

alter table public.opportunities add constraint opportunities_pkey PRIMARY KEY (id);

alter table public.payments add constraint payments_exchange_rate_source_check CHECK (((exchange_rate_source IS NULL) OR (exchange_rate_source = ANY (ARRAY['ecb'::text, 'manual'::text]))));

alter table public.payments add constraint payments_pkey PRIMARY KEY (id);

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);

alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);

alter table public.subscriptions add constraint subscriptions_user_id_key UNIQUE (user_id);

alter table public.tax_expenses add constraint tax_expenses_pkey PRIMARY KEY (id);

alter table public.used_promo_codes add constraint used_promo_codes_pkey PRIMARY KEY (id);

alter table public.used_promo_codes add constraint used_promo_codes_user_id_promo_code_key UNIQUE (user_id, promo_code);

alter table public.user_roles add constraint user_roles_pkey PRIMARY KEY (id);

alter table public.investment_schedule add constraint investment_schedule_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE;

alter table public.investment_schedule add constraint investment_schedule_matched_payment_id_fkey FOREIGN KEY (matched_payment_id) REFERENCES payments(id) ON DELETE SET NULL;

alter table public.investments add constraint investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.notifications add constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.opportunities add constraint opportunities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.payments add constraint payments_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE;

alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.tax_expenses add constraint tax_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.used_promo_codes add constraint used_promo_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.user_roles add constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_investment_schedule_investment_id ON public.investment_schedule USING btree (investment_id);

CREATE INDEX idx_investments_user_id ON public.investments USING btree (user_id);

CREATE INDEX idx_opportunities_user_id ON public.opportunities USING btree (user_id);

CREATE INDEX idx_payments_investment_id ON public.payments USING btree (investment_id);

CREATE INDEX idx_tax_expenses_year ON public.tax_expenses USING btree (user_id, year);

CREATE UNIQUE INDEX notifications_user_dedupe_key ON public.notifications USING btree (user_id, dedupe_key);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, pro_until, is_beta_pro)
  VALUES (NEW.id, 'free', 'free', NOW() + INTERVAL '30 days', TRUE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $function$
;

revoke all on function handle_new_user() from public; grant execute on function handle_new_user() to service_role;

revoke all on function handle_new_user_subscription() from public; grant execute on function handle_new_user_subscription() to service_role;

revoke all on function has_role(uuid,text) from public; grant execute on function has_role(uuid,text) to authenticated; grant execute on function has_role(uuid,text) to service_role;

revoke all on function update_updated_at_column() from public; grant execute on function update_updated_at_column() to authenticated; grant execute on function update_updated_at_column() to anon; grant execute on function update_updated_at_column() to service_role; grant execute on function update_updated_at_column() to public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_created_subscription AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();

CREATE TRIGGER update_future_investments_updated_at BEFORE UPDATE ON public.future_investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_expenses_updated_at BEFORE UPDATE ON public.tax_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

alter table public.future_investments enable row level security;

alter table public.investment_schedule enable row level security;

alter table public.investments enable row level security;

alter table public.notifications enable row level security;

alter table public.opportunities enable row level security;

alter table public.payments enable row level security;

alter table public.profiles enable row level security;

alter table public.subscriptions enable row level security;

alter table public.tax_expenses enable row level security;

alter table public.used_promo_codes enable row level security;

alter table public.user_roles enable row level security;

create policy "Users can delete own future investments" on public.future_investments as permissive for delete to public using ((auth.uid() = user_id));

create policy "Users can insert own future investments" on public.future_investments as permissive for insert to public with check ((auth.uid() = user_id));

create policy "Users can update own future investments" on public.future_investments as permissive for update to public using ((auth.uid() = user_id));

create policy "Users can view own future investments" on public.future_investments as permissive for select to public using ((auth.uid() = user_id));

create policy "Users can delete schedule of own investments" on public.investment_schedule as permissive for delete to public using ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = investment_schedule.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Users can insert schedule to own investments" on public.investment_schedule as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = investment_schedule.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Users can update schedule of own investments" on public.investment_schedule as permissive for update to public using ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = investment_schedule.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Users can view schedule of own investments" on public.investment_schedule as permissive for select to public using ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = investment_schedule.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Admins can view all investments" on public.investments as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::text));

create policy "Users can delete own investments" on public.investments as permissive for delete to public using ((auth.uid() = user_id));

create policy "Users can insert own investments" on public.investments as permissive for insert to public with check ((auth.uid() = user_id));

create policy "Users can update own investments" on public.investments as permissive for update to public using ((auth.uid() = user_id));

create policy "Users can view own investments" on public.investments as permissive for select to public using ((auth.uid() = user_id));

create policy "Users can insert own notifications" on public.notifications as permissive for insert to public with check ((auth.uid() = user_id));

create policy "Users can update own notifications" on public.notifications as permissive for update to public using ((auth.uid() = user_id));

create policy "Users can view own notifications" on public.notifications as permissive for select to public using ((auth.uid() = user_id));

create policy "Users can delete own opportunities" on public.opportunities as permissive for delete to public using ((auth.uid() = user_id));

create policy "Users can insert own opportunities" on public.opportunities as permissive for insert to public with check ((auth.uid() = user_id));

create policy "Users can update own opportunities" on public.opportunities as permissive for update to public using ((auth.uid() = user_id));

create policy "Users can view own opportunities" on public.opportunities as permissive for select to public using ((auth.uid() = user_id));

create policy "Admins can view all payments" on public.payments as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::text));

create policy "Users can delete payments of own investments" on public.payments as permissive for delete to public using ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = payments.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Users can insert payments to own investments" on public.payments as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = payments.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Users can update payments of own investments" on public.payments as permissive for update to public using ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = payments.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Users can view payments of own investments" on public.payments as permissive for select to public using ((EXISTS ( SELECT 1
   FROM investments
  WHERE ((investments.id = payments.investment_id) AND (investments.user_id = auth.uid())))));

create policy "Admins can view all profiles" on public.profiles as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::text));

create policy "Users can update own profile" on public.profiles as permissive for update to public using ((auth.uid() = id));

create policy "Users can view own profile" on public.profiles as permissive for select to public using ((auth.uid() = id));

create policy "Admins can view all subscriptions" on public.subscriptions as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::text));

create policy "Users can view own subscription" on public.subscriptions as permissive for select to public using ((auth.uid() = user_id));

create policy "Users can manage their own tax expenses" on public.tax_expenses as permissive for all to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

create policy "Users can view their own promo codes" on public.used_promo_codes as permissive for select to public using ((auth.uid() = user_id));

create policy "Users can view own role" on public.user_roles as permissive for select to public using ((auth.uid() = user_id));

grant delete, insert, references, select, trigger, truncate, update on public.future_investments to anon;

grant delete, insert, references, select, trigger, truncate, update on public.future_investments to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.future_investments to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.investment_schedule to anon;

grant delete, insert, references, select, trigger, truncate, update on public.investment_schedule to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.investment_schedule to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.investments to anon;

grant delete, insert, references, select, trigger, truncate, update on public.investments to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.investments to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.notifications to anon;

grant delete, insert, references, select, trigger, truncate, update on public.notifications to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.notifications to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.opportunities to anon;

grant delete, insert, references, select, trigger, truncate, update on public.opportunities to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.opportunities to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.payments to anon;

grant delete, insert, references, select, trigger, truncate, update on public.payments to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.payments to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.profiles to anon;

grant delete, insert, references, select, trigger, truncate, update on public.profiles to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.profiles to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.subscriptions to anon;

grant delete, insert, references, select, trigger, truncate, update on public.subscriptions to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.subscriptions to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.tax_expenses to anon;

grant delete, insert, references, select, trigger, truncate, update on public.tax_expenses to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.tax_expenses to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.used_promo_codes to anon;

grant delete, insert, references, select, trigger, truncate, update on public.used_promo_codes to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.used_promo_codes to service_role;

grant delete, insert, references, select, trigger, truncate, update on public.user_roles to anon;

grant delete, insert, references, select, trigger, truncate, update on public.user_roles to authenticated;

grant delete, insert, references, select, trigger, truncate, update on public.user_roles to service_role;
