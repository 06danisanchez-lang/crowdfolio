-- Fase 7: "fecha del primer cobro" (opcional) para periodic_fixed/amortizing.
-- Si se conoce, el calendario de cobros se genera a partir de esta fecha en
-- vez de estimarla como investment_date + 1 periodo. Aditiva y nullable: no
-- afecta a ninguna fila existente.
alter table public.investments add column if not exists first_payment_date date;

comment on column public.investments.first_payment_date is
  'Fecha real del primer cobro, si el usuario la conoce (solo periodic_fixed/amortizing). NULL = se estima como investment_date + 1 periodo.';

-- Coherencia: si se indica, tiene que caer dentro del ciclo de vida de la
-- inversión — después de invertir y no más tarde del vencimiento. NULL-tolerante
-- a propósito: no bloquea inversiones en borrador sin expected_end_date todavía.
alter table public.investments
  add constraint investments_first_payment_date_range_check
  check (
    first_payment_date is null
    or (
      first_payment_date > investment_date
      and (expected_end_date is null or first_payment_date <= expected_end_date)
    )
  );
