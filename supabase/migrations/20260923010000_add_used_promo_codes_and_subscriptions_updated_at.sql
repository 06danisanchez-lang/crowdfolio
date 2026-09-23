-- 1) used_promo_codes: nunca llegó a existir en producción, aunque
--    apply-promo-code/index.ts ya la usa desde su creación. Misma
--    definición que la migración original (20260203215531) más una FK
--    a auth.users que el original no tenía.

CREATE TABLE public.used_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE (user_id, promo_code)
);

ALTER TABLE public.used_promo_codes ENABLE ROW LEVEL SECURITY;

-- apply-promo-code usa la service role key (bypasea RLS), así que esta
-- policy no hace falta para que la función funcione hoy; se añade como
-- cinturón de seguridad por si en el futuro se lee desde el cliente con
-- el JWT del usuario. No se añade policy de INSERT: la función es la
-- única que escribe, y lo hace con service role.
CREATE POLICY "Users can view their own promo codes"
ON public.used_promo_codes
FOR SELECT
USING (auth.uid() = user_id);

-- 2) subscriptions.updated_at: usada por apply-promo-code y por
--    stripe-webhook (altas y cambios de suscripción reales de Stripe)
--    pero no existe en producción. Se reutiliza el trigger genérico ya
--    existente, mismo patrón que tax_expenses.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
