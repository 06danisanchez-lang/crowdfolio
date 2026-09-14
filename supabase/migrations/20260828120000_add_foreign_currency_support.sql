-- ============================================================================
-- Fase 1 — Soporte de inversiones en plataformas extranjeras
-- Divisa distinta de EUR + retención en origen.
--
-- ⚠️ ESTE ARCHIVO NO SE APLICA CON `supabase db push`.
-- Es solo el registro local del cambio. Aplícalo a mano copiando y pegando
-- este contenido en el SQL Editor del dashboard de Supabase
-- (proyecto eazwouasdrcbucxwjfxy).
--
-- Decisión 1 (catálogo estático, no user_platforms): country/currency por
-- defecto de cada plataforma viven en código (src/types/investment.ts,
-- PLATFORMS const), NO en la tabla user_platforms. Por eso esta migración
-- no toca user_platforms en absoluto.
-- ============================================================================

-- investments: divisa y país. La "herencia" desde la plataforma es solo
-- autorrelleno en el formulario (Fase 3); en BD currency tiene un default
-- seguro (EUR) para que las inversiones existentes (todas españolas/EUR)
-- no cambien de comportamiento.
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS country TEXT;

COMMENT ON COLUMN public.investments.currency IS
  'ISO 4217. El formulario la autorrellena desde el catálogo estático de plataformas (PLATFORMS.defaultCurrency); el usuario puede sobrescribirla. Default EUR para no romper inversiones existentes.';
COMMENT ON COLUMN public.investments.country IS
  'ISO 3166-1 alpha-2. Override manual opcional del país de la plataforma. NULL = usa el país del catálogo estático de la plataforma (PLATFORMS.country).';

-- payments: conversión a EUR y retención en origen, capturadas por pago.
-- Todas nullable: un pago EUR sin retención (el caso de siempre) no las usa
-- y el cálculo fiscal actual no cambia.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS original_currency TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS amount_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS foreign_withholding_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS foreign_withholding_currency TEXT;

COMMENT ON COLUMN public.payments.original_amount IS
  'Importe en la divisa original del pago. NULL para pagos en EUR (comportamiento actual, sin cambios).';
COMMENT ON COLUMN public.payments.original_currency IS
  'ISO 4217 de la divisa original del pago. NULL = EUR.';
COMMENT ON COLUMN public.payments.exchange_rate IS
  'Tipo de cambio divisa→EUR aplicado (referencia BCE, con override manual editable desde el formulario). NULL si el pago es en EUR.';
COMMENT ON COLUMN public.payments.exchange_rate_date IS
  'Fecha de referencia del tipo de cambio: la del pago, o la última publicación BCE anterior si esa fecha no es día hábil.';
COMMENT ON COLUMN public.payments.amount_eur IS
  'Importe BRUTO (antes de retención) convertido a EUR, listo para agregarse a RCM/GPP. Si es NULL en un pago con original_currency <> EUR: fiscal_blocker — esa inversión se excluye del total definitivo y el informe se marca incompleto hasta resolverlo. Nunca se calcula tratando la divisa como EUR por defecto.';
COMMENT ON COLUMN public.payments.foreign_withholding_amount IS
  'Retención practicada en origen (país de la plataforma), en foreign_withholding_currency. Distinta de withholding_applied, que es la retención doméstica española ya existente en esta tabla.';
COMMENT ON COLUMN public.payments.foreign_withholding_currency IS
  'ISO 4217 de foreign_withholding_amount. Normalmente coincide con original_currency.';

-- Nada que tocar en user_platforms — decisión explícita de mantener el
-- catálogo de plataformas en código, no en BD.
