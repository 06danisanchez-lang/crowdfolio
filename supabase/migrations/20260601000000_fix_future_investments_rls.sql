-- Ensure RLS is enabled and all policies exist for future_investments.
-- Safe to run multiple times (DROP IF EXISTS before CREATE).

ALTER TABLE public.future_investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own future investments"   ON public.future_investments;
DROP POLICY IF EXISTS "Users can insert own future investments" ON public.future_investments;
DROP POLICY IF EXISTS "Users can update own future investments" ON public.future_investments;
DROP POLICY IF EXISTS "Users can delete own future investments" ON public.future_investments;

CREATE POLICY "Users can view own future investments"
  ON public.future_investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own future investments"
  ON public.future_investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own future investments"
  ON public.future_investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own future investments"
  ON public.future_investments FOR DELETE
  USING (auth.uid() = user_id);
