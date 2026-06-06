-- Add beta Pro trial fields to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_beta_pro BOOLEAN NOT NULL DEFAULT FALSE;

-- Update trigger so new users get 30-day Pro trial automatically
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    pro_until,
    is_beta_pro
  )
  VALUES (
    NEW.id,
    'free',
    'free',
    NOW() + INTERVAL '30 days',
    TRUE
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Give all existing free users a 30-day beta Pro trial (one-time grant)
UPDATE public.subscriptions
SET
  pro_until = NOW() + INTERVAL '30 days',
  is_beta_pro = TRUE
WHERE
  plan = 'free'
  AND status NOT IN ('active')
  AND (pro_until IS NULL OR pro_until < NOW());
