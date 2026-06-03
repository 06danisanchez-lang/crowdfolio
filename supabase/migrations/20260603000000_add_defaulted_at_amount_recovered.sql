alter table public.investments
  add column if not exists defaulted_at timestamptz,
  add column if not exists amount_recovered numeric(10,2) default 0;
