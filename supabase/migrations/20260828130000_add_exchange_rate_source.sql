-- ============================================================================
-- Fase 2 (complemento) — Trazabilidad de procedencia del tipo de cambio
--
-- ⚠️ ESTE ARCHIVO NO SE APLICA CON `supabase db push`.
-- Es solo el registro local del cambio. Aplícalo a mano copiando y pegando
-- este contenido en el SQL Editor del dashboard de Supabase
-- (proyecto eazwouasdrcbucxwjfxy).
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;

-- CHECK en vez de enum de Postgres: así una divisa/mecanismo nuevo el día de
-- mañana no exige una migración de tipo, solo relajar este constraint.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_exchange_rate_source_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_exchange_rate_source_check
  CHECK (exchange_rate_source IS NULL OR exchange_rate_source IN ('ecb', 'manual'));

COMMENT ON COLUMN public.payments.exchange_rate_source IS
  'Procedencia de exchange_rate: ''ecb'' = tal cual lo devolvió la Edge Function exchange-rate (referencia BCE, sin editar); ''manual'' = el usuario introdujo o modificó el valor a mano. NULL = no aplica (pago en EUR, sin exchange_rate).';
