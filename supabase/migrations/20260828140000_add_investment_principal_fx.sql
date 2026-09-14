-- ============================================================================
-- Fase 4.5 — Principal de la inversión en divisa extranjera
--
-- Decisión: el principal (investments.amount) se trata exactamente igual que
-- un pago (Fase 1/3): amount SIGUE siendo siempre EUR; el resto de columnas
-- guardan el original y el rastro de conversión, igual patrón que payments.
--
-- ⚠️ ESTE ARCHIVO NO SE APLICA CON `supabase db push`.
-- Aplícalo a mano en el SQL Editor del dashboard de Supabase
-- (proyecto eazwouasdrcbucxwjfxy).
-- ============================================================================

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS original_currency TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS amount_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;

-- Mismo CHECK que payments.exchange_rate_source (Fase 2 complemento).
ALTER TABLE public.investments
  DROP CONSTRAINT IF EXISTS investments_exchange_rate_source_check;

ALTER TABLE public.investments
  ADD CONSTRAINT investments_exchange_rate_source_check
  CHECK (exchange_rate_source IS NULL OR exchange_rate_source IN ('ecb', 'manual'));

COMMENT ON COLUMN public.investments.original_amount IS
  'Importe del principal en la divisa original de la inversión. NULL si currency es EUR (comportamiento actual, sin cambios).';
COMMENT ON COLUMN public.investments.original_currency IS
  'ISO 4217 del principal original. NULL = EUR. Normalmente coincide con investments.currency.';
COMMENT ON COLUMN public.investments.exchange_rate IS
  'Tipo de cambio divisa→EUR aplicado al principal (referencia BCE, con override manual). NULL si currency es EUR.';
COMMENT ON COLUMN public.investments.exchange_rate_date IS
  'Fecha de referencia del tipo de cambio del principal: la de la inversión, o la última publicación BCE anterior si no era día hábil.';
COMMENT ON COLUMN public.investments.amount_eur IS
  'Principal convertido a EUR. En la práctica coincide con investments.amount (amount SIEMPRE se guarda en EUR, igual que payments.amount) — se mantiene aparte como rastro auditable de la conversión, igual que en payments.';
COMMENT ON COLUMN public.investments.exchange_rate_source IS
  'Procedencia de exchange_rate: ''ecb'' = tal cual la Edge Function exchange-rate, sin editar; ''manual'' = el usuario lo introdujo o modificó a mano. NULL = no aplica (inversión en EUR).';

-- Nada que tocar en user_platforms (Decisión 1, sigue vigente).
