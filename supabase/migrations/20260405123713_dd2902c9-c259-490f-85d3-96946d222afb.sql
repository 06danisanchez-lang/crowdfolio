
CREATE TABLE public.future_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  custom_platform_name TEXT,
  project_name TEXT NOT NULL,
  estimated_amount NUMERIC,
  expected_return NUMERIC,
  estimated_open_date DATE,
  estimated_end_date DATE,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.future_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own future investments" ON public.future_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own future investments" ON public.future_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own future investments" ON public.future_investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own future investments" ON public.future_investments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_future_investments_updated_at
  BEFORE UPDATE ON public.future_investments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
